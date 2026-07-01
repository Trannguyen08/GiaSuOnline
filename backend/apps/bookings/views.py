from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.dateparse import parse_date
from kombu.exceptions import OperationalError as QueueOperationalError
from decimal import Decimal
from datetime import datetime, timedelta
from .models import Booking, TutorAvailability, TeachingSlot
from .emails import (
    send_booking_approved_email,
    send_booking_requested_email,
)
from .payments import PayOSError, create_payment_link
from .serializers import (
    BookingSerializer,
    TutorAvailabilitySerializer,
    TeachingSlotSerializer,
)
from .services.payment_processing import process_booking_payment
from .tasks import enqueue_payment_verification
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model
from apps.courses.models import CourseSession
from apps.tutors.models import TutorSubject
from apps.tutors.services.guarantee import (
    can_receive_new_classes,
    refresh_new_class_lock,
)
from core.cache_utils import (
    get_cached_response,
    invalidate_cache_groups,
    set_cached_response,
)

User = get_user_model()


def get_tutor_profile(user):
    return getattr(user, "teaching_profile", None) or getattr(
        user, "tutor_profile", None
    )


def calculate_deposit_amount(tutor_subject, start_time, end_time):
    hours = Decimal(str((end_time - start_time).total_seconds())) / Decimal("3600")
    return (tutor_subject.hourly_rate * hours).quantize(Decimal("0.01"))


def calculate_booking_deposit(total_amount):
    rate = Decimal(str(getattr(settings, "BOOKING_DEPOSIT_RATE", "0.20")))
    return (Decimal(str(total_amount)) * rate).quantize(Decimal("0.01"))


def calculate_slots_total(tutor_subject, slots):
    total_hours = sum(
        Decimal(str((slot.end_time - slot.start_time).total_seconds()))
        / Decimal("3600")
        for slot in slots
    )
    return (tutor_subject.hourly_rate * total_hours).quantize(Decimal("0.01"))


def count_weekday_in_range(start_date, end_date, weekday):
    target_weekday = 6 if int(weekday) == 0 else int(weekday) - 1
    current = start_date
    total = 0
    while current <= end_date:
        if current.weekday() == target_weekday:
            total += 1
        current += timedelta(days=1)
    return total


def calculate_recurring_slots_total(tutor_subject, slots, schedules, start_date, end_date):
    slot_map = {slot.id: slot for slot in slots}
    total_hours = Decimal("0")
    for item in schedules or []:
        if not isinstance(item, dict) or item.get("day") is None:
            continue
        slot = slot_map.get(item.get("slot_id"))
        if not slot:
            continue
        hours = Decimal(str((slot.end_time - slot.start_time).total_seconds())) / Decimal(
            "3600"
        )
        total_hours += hours * Decimal(
            count_weekday_in_range(start_date, end_date, item.get("day"))
        )
    if total_hours <= 0:
        return calculate_slots_total(tutor_subject, slots)
    return (tutor_subject.hourly_rate * total_hours).quantize(Decimal("0.01"))


def release_booking_slots(booking):
    slot_ids = booking.selected_slot_ids or []
    if not slot_ids and booking.teaching_slot_id:
        slot_ids = [booking.teaching_slot_id]
    if slot_ids:
        TeachingSlot.objects.filter(id__in=slot_ids, status="booked").update(
            status="available", confirmed_booking=None
        )
    TeachingSlot.objects.filter(confirmed_booking=booking, status="booked").update(
        status="available", confirmed_booking=None
    )


def get_student_booking_for_payment(*, user, booking_id=None, order_code=None):
    filters = {"student": user}
    if order_code:
        filters["payos_order_code"] = order_code
    elif booking_id:
        filters["id"] = booking_id
    else:
        raise ValueError("orderCode or bookingId is required.")

    return (
        Booking.objects.select_for_update(of=("self",))
        .select_related("student", "tutor__user", "subject")
        .get(**filters)
    )


def get_frontend_base_url(request):
    origin = request.headers.get("Origin")
    if origin:
        return origin.rstrip("/")
    scheme = "https" if request.is_secure() else "http"
    host = request.get_host()
    if host:
        return f"{scheme}://{host}".rstrip("/")
    return getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")


class TutorBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cached = get_cached_response("bookings", request, "tutor-bookings")
        if cached is not None:
            return Response(cached)
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tutor_profile = get_tutor_profile(request.user)
        bookings = Booking.objects.filter(tutor=tutor_profile).order_by(
            "-start_time"
        )
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        set_cached_response("bookings", serializer.data, request, "tutor-bookings")
        return Response(serializer.data)


class StudentBookingHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cached = get_cached_response("bookings", request, "student-history")
        if cached is not None:
            return Response(cached)
        bookings = (
            Booking.objects.filter(student=request.user)
            .select_related("tutor", "subject", "teaching_slot")
            .order_by("-created_at")
        )
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        set_cached_response("bookings", serializer.data, request, "student-history")
        return Response(serializer.data)


class TutorBookingDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking_action"

    @transaction.atomic
    def post(self, request, pk):
        tutor_profile = get_tutor_profile(request.user)
        try:
            booking = (
                Booking.objects.select_for_update(of=("self",))
                .select_related("student", "tutor__user", "subject")
                .get(pk=pk, tutor=tutor_profile, status="pending")
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found or already processed"},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")
        if action not in ["approve", "reject"]:
            return Response(
                {"action": "Use approve or reject."}, status=status.HTTP_400_BAD_REQUEST
            )

        if action == "approve":
            booking.status = "approved"
            booking.payment_status = "unpaid"
            booking.save(update_fields=["status", "payment_status"])
            transaction.on_commit(lambda: send_booking_approved_email(booking))
        else:
            booking.status = "cancelled"
            booking.payment_status = "cancelled"
            booking.save(update_fields=["status", "payment_status"])
            release_booking_slots(booking)

        invalidate_cache_groups("bookings", "courses", "tutors")
        return Response(BookingSerializer(booking, context={"request": request}).data)


class TutorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        availabilities = TutorAvailability.objects.filter(
            tutor=request.user.tutor_profile
        )
        serializer = TutorAvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TutorAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(tutor=request.user.tutor_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudentsView(APIView):
    """
    Returns a list of students who have booked this tutor.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tutor_profile = get_tutor_profile(request.user)
        bookings = (
            Booking.objects.filter(tutor=tutor_profile, payment_status="paid")
            .select_related("student", "subject", "course")
            .order_by("-paid_at", "-created_at")
        )

        students = {}
        for booking in bookings:
            if booking.student_id in students:
                continue
            student = booking.student
            avatar_url = None
            if student.avatar:
                avatar_url = request.build_absolute_uri(student.avatar.url)
            students[booking.student_id] = {
                "id": student.id,
                "username": student.username,
                "email": student.email,
                "phone": student.phone,
                "bio": student.bio,
                "avatar": avatar_url,
                "student_info": booking.student_info or {},
                "booking_id": booking.id,
                "course_id": getattr(getattr(booking, "course", None), "id", None),
                "course_title": getattr(getattr(booking, "course", None), "title", ""),
                "subject_name": booking.subject.name if booking.subject else "",
                "study_start_date": booking.study_start_date,
                "study_end_date": booking.study_end_date,
                "selected_schedules": booking.selected_schedules or [],
                "notes": booking.notes,
                "paid_at": booking.paid_at,
            }

        return Response(list(students.values()))


class TutorTeachingSlotListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cached = get_cached_response("bookings", request, "tutor-slots")
        if cached is not None:
            return Response(cached)
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tutor_profile = get_tutor_profile(request.user)
        slots = (
            TeachingSlot.objects.filter(tutor=get_tutor_profile(request.user))
            .exclude(status="cancelled")
            .select_related("subject", "tutor", "confirmed_booking__student")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        data = list(serializer.data)

        real_booked_keys = set()
        for slot in slots:
            booking_id = slot.confirmed_booking_id or getattr(
                getattr(slot, "booking", None), "id", None
            )
            if slot.status != "booked" or not booking_id:
                continue
            local_start = timezone.localtime(slot.start_time)
            local_end = timezone.localtime(slot.end_time)
            real_booked_keys.add(
                (
                    booking_id,
                    local_start.date(),
                    local_start.time().replace(second=0, microsecond=0),
                    local_end.time().replace(second=0, microsecond=0),
                )
            )

        course_sessions = (
            CourseSession.objects.filter(
                course__tutor=tutor_profile,
                course__status="active",
                scheduled_date__isnull=False,
                scheduled_time__isnull=False,
            )
            .select_related(
                "course",
                "course__booking",
                "course__student",
                "course__subject",
                "course__tutor",
            )
            .order_by("scheduled_date", "scheduled_time", "session_number")
        )
        current_tz = timezone.get_current_timezone()
        for session in course_sessions:
            booking = getattr(session.course, "booking", None)
            start_naive = datetime.combine(session.scheduled_date, session.scheduled_time)
            start_at = timezone.make_aware(start_naive, current_tz)
            end_at = start_at + timedelta(minutes=session.course.session_duration_minutes or 60)
            local_start = timezone.localtime(start_at)
            local_end = timezone.localtime(end_at)
            booking_id = getattr(booking, "id", None)
            key = (
                booking_id,
                local_start.date(),
                local_start.time().replace(second=0, microsecond=0),
                local_end.time().replace(second=0, microsecond=0),
            )
            if booking_id and key in real_booked_keys:
                continue
            student_info = getattr(booking, "student_info", {}) or {}
            data.append(
                {
                    "id": f"session-{session.id}",
                    "tutor": tutor_profile.id,
                    "tutor_name": tutor_profile.full_name,
                    "subject": getattr(session.course.subject, "id", None),
                    "subject_name": getattr(session.course.subject, "name", ""),
                    "start_time": start_at.isoformat(),
                    "end_time": end_at.isoformat(),
                    "price": "0.00",
                    "meeting_link": "",
                    "note": session.tutor_notes,
                    "status": "booked",
                    "student_name": (
                        student_info.get("fullName")
                        or session.course.student.get_full_name()
                        or session.course.student.username
                        or session.course.student.email
                    ),
                    "booking_subject_name": getattr(session.course.subject, "name", ""),
                    "student_phone": student_info.get("phone") or session.course.student.phone,
                    "student_address": student_info.get("address"),
                    "is_system_generated": True,
                    "created_at": session.created_at,
                }
            )

        set_cached_response("bookings", data, request, "tutor-slots")
        return Response(data)

    def post(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TeachingSlotSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            tutor_profile = get_tutor_profile(request.user)
            refresh_new_class_lock(tutor_profile)
            if not can_receive_new_classes(tutor_profile):
                return Response(
                    {
                        "error": "Tutor guarantee deposit is too low to receive new classes.",
                        "lock_reason": tutor_profile.new_class_lock_reason,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.save(tutor=tutor_profile)
            invalidate_cache_groups("bookings", "tutors")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorTeachingSlotDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking_action"

    def patch(self, request, pk):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            slot = TeachingSlot.objects.get(pk=pk, tutor=get_tutor_profile(request.user))
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status == "booked":
            allowed_fields = {"meeting_link", "note"}
            update_fields = set(request.data.keys())
            if not update_fields.issubset(allowed_fields):
                return Response(
                    {"error": "Booked slots only allow meeting link and note updates."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = TeachingSlotSerializer(
            slot, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            invalidate_cache_groups("bookings", "tutors")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            slot = TeachingSlot.objects.get(pk=pk, tutor=get_tutor_profile(request.user))
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status == "booked":
            return Response(
                {"error": "Booked slots cannot be deleted while a booking is active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot.status = "cancelled"
        slot.save(update_fields=["status"])
        invalidate_cache_groups("bookings", "tutors")
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicTutorSlotListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tutor_id):
        cached = get_cached_response("bookings", request, f"public-slots:{tutor_id}")
        if cached is not None:
            return Response(cached)
        slots = (
            TeachingSlot.objects.filter(
                tutor_id=tutor_id,
                status="available",
                start_time__gte=timezone.now(),
            )
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        set_cached_response("bookings", serializer.data, request, f"public-slots:{tutor_id}")
        return Response(serializer.data)


class StudentBookSlotView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking_action"

    @transaction.atomic
    def post(self, request, slot_id):
        try:
            slot = (
                TeachingSlot.objects.select_for_update(of=("self",))
                .select_related("tutor", "subject")
                .get(pk=slot_id)
            )
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status != "available":
            return Response(
                {"error": "Slot is no longer available"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        refresh_new_class_lock(slot.tutor)
        if not can_receive_new_classes(slot.tutor):
            return Response(
                {
                    "error": "Tutor cannot receive new classes because guarantee deposit is too low.",
                    "lock_reason": slot.tutor.new_class_lock_reason,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject_id = request.data.get("subject") or getattr(slot.subject, "id", None)
        if not subject_id:
            return Response(
                {"subject": "Please choose a subject for this schedule."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tutor_subject = TutorSubject.objects.select_related("subject").get(
                tutor=slot.tutor,
                subject_id=subject_id,
            )
        except TutorSubject.DoesNotExist:
            return Response(
                {"subject": "This tutor does not teach the selected subject."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_amount = calculate_deposit_amount(
            tutor_subject, slot.start_time, slot.end_time
        )
        deposit_amount = calculate_booking_deposit(total_amount)
        booking = Booking.objects.create(
            student=request.user,
            tutor=slot.tutor,
            subject=tutor_subject.subject,
            start_time=slot.start_time,
            end_time=slot.end_time,
            total_price=total_amount,
            deposit_amount=deposit_amount,
            notes=request.data.get("notes", ""),
            teaching_slot=slot,
            status="pending",
        )
        slot.status = "booked"
        slot.save(update_fields=["status"])
        transaction.on_commit(lambda: send_booking_requested_email(booking))
        invalidate_cache_groups("bookings", "tutors")

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StudentCreateBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking_action"

    @transaction.atomic
    def post(self, request, tutor_id):
        subject_id = request.data.get("subject")
        slot_ids = request.data.get("slot_ids") or []
        study_start_date = parse_date(str(request.data.get("study_start_date") or ""))
        study_end_date = parse_date(str(request.data.get("study_end_date") or ""))

        if not subject_id:
            return Response(
                {"subject": "Please choose a subject for this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not slot_ids or not isinstance(slot_ids, list):
            return Response(
                {"slot_ids": "Please choose at least one schedule."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not study_start_date or not study_end_date:
            return Response(
                {"study_start_date": "Start date and end date are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if study_end_date < study_start_date:
            return Response(
                {"study_end_date": "End date must be after or equal to start date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tutor_subject = TutorSubject.objects.select_related(
                "tutor", "subject"
            ).get(tutor_id=tutor_id, subject_id=subject_id)
        except TutorSubject.DoesNotExist:
            return Response(
                {"subject": "This tutor does not teach the selected subject."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh_new_class_lock(tutor_subject.tutor)
        if not can_receive_new_classes(tutor_subject.tutor):
            return Response(
                {
                    "error": "Tutor cannot receive new classes because guarantee deposit is too low.",
                    "lock_reason": tutor_subject.tutor.new_class_lock_reason,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = list(
            TeachingSlot.objects.select_for_update(of=("self",))
            .filter(id__in=slot_ids, tutor_id=tutor_id)
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        if len(slots) != len(set(slot_ids)):
            return Response(
                {"slot_ids": "One or more selected schedules were not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        unavailable = [slot.id for slot in slots if slot.status != "available"]
        if unavailable:
            return Response(
                {
                    "error": "One or more schedules are no longer available.",
                    "slot_ids": unavailable,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected_schedules = request.data.get("schedules") or []
        total_amount = calculate_recurring_slots_total(
            tutor_subject,
            slots,
            selected_schedules,
            study_start_date,
            study_end_date,
        )
        deposit_amount = calculate_booking_deposit(total_amount)
        booking = Booking.objects.create(
            student=request.user,
            tutor=tutor_subject.tutor,
            subject=tutor_subject.subject,
            start_time=slots[0].start_time,
            end_time=slots[-1].end_time,
            study_start_date=study_start_date,
            study_end_date=study_end_date,
            selected_schedules=selected_schedules,
            selected_slot_ids=[slot.id for slot in slots],
            student_info=request.data.get("student_info") or {},
            total_price=total_amount,
            deposit_amount=deposit_amount,
            notes=request.data.get("notes", ""),
            teaching_slot=slots[0],
            status="pending",
        )
        TeachingSlot.objects.filter(id__in=booking.selected_slot_ids).update(
            status="booked"
        )
        transaction.on_commit(lambda: send_booking_requested_email(booking))
        invalidate_cache_groups("bookings", "tutors")

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BookingDepositPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_action"

    def post(self, request, pk):
        try:
            with transaction.atomic():
                booking = get_student_booking_for_payment(
                    user=request.user, booking_id=pk
                )

                if booking.status != "approved":
                    return Response(
                        {"error": "Booking is not approved for deposit payment."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if booking.payment_status == "paid":
                    return Response(
                        {
                            "checkout_url": None,
                            "booking": BookingSerializer(
                                booking, context={"request": request}
                            ).data,
                        }
                    )
                if booking.payment_status == "pending" and booking.payment_checkout_url:
                    return Response(
                        {
                            "checkout_url": booking.payment_checkout_url,
                            "booking": BookingSerializer(
                                booking, context={"request": request}
                            ).data,
                        }
                    )

                if not booking.payos_order_code:
                    booking.payos_order_code = int(
                        f"{booking.id}{timezone.now():%H%M%S}{get_random_string(3, '0123456789')}"
                    )
                    booking.payment_status = "pending"
                    booking.save(update_fields=["payos_order_code", "payment_status"])
                order_code = booking.payos_order_code
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND
            )

        frontend_base_url = get_frontend_base_url(request)
        return_url = f"{frontend_base_url}/payment/success?bookingId={pk}"
        cancel_url = (
            f"{frontend_base_url}/registration-history?payment=cancelled"
            f"&bookingId={pk}"
        )

        try:
            booking_for_payos = (
                Booking.objects.select_related("student", "tutor__user", "subject")
                .get(pk=pk, student=request.user, payos_order_code=order_code)
            )
            payos_data = create_payment_link(
                booking=booking_for_payos, return_url=return_url, cancel_url=cancel_url
            )
        except PayOSError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            booking = get_student_booking_for_payment(user=request.user, booking_id=pk)
            if booking.payment_status == "paid":
                return Response(
                    {
                        "checkout_url": None,
                        "booking": BookingSerializer(
                            booking, context={"request": request}
                        ).data,
                    }
                )
            booking.payment_status = "pending"
            booking.payos_payment_link_id = str(payos_data.get("paymentLinkId") or "")
            booking.payment_checkout_url = payos_data.get("checkoutUrl") or ""
            booking.save(
                update_fields=[
                    "payment_status",
                    "payos_payment_link_id",
                    "payment_checkout_url",
                ]
            )
        return Response(
            {
                "checkout_url": booking.payment_checkout_url,
                "booking": BookingSerializer(
                    booking, context={"request": request}
                ).data,
            }
        )


class BookingPaymentVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment_action"

    def post(self, request):
        order_code = request.data.get("orderCode") or request.query_params.get(
            "orderCode"
        )
        booking_id = request.data.get("bookingId") or request.query_params.get(
            "bookingId"
        )
        filters = {"student": request.user}
        if order_code:
            filters["payos_order_code"] = order_code
        elif booking_id:
            filters["id"] = booking_id
        else:
            return Response(
                {"orderCode": "orderCode or bookingId is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking_snapshot = Booking.objects.only(
                "id", "payos_order_code", "payment_status"
            ).get(**filters)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if booking_snapshot.payment_status == "paid":
            booking = Booking.objects.select_related(
                "student", "tutor__user", "subject"
            ).get(pk=booking_snapshot.id)
            return Response(
                BookingSerializer(booking, context={"request": request}).data
            )

        if not booking_snapshot.payos_order_code:
            return Response(
                {"error": "Booking has no PayOS order code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            process_booking_payment(booking_snapshot.id)
        except PayOSError as exc:
            try:
                enqueue_payment_verification(booking_snapshot.id)
            except QueueOperationalError:
                return Response(
                    {"error": "Payment queue is unavailable."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        booking = Booking.objects.select_related(
            "student", "tutor__user", "subject"
        ).get(pk=booking_snapshot.id)
        return Response(BookingSerializer(booking, context={"request": request}).data)

        """
        course = Course.objects.create(
            student=request.user,
            tutor=slot.tutor,
            subject=tutor_subject.subject,
            title=f"{tutor_subject.subject.name} với {slot.tutor.full_name or slot.tutor.user.username}",
            description=request.data.get("notes", ""),
            total_sessions=1,
            session_duration_minutes=max(
                30, int((slot.end_time - slot.start_time).total_seconds() // 60)
            ),
            schedule_time=slot.start_time.strftime("%d/%m/%Y %H:%M"),
            start_date=slot.start_time.date(),
            end_date=slot.end_time.date(),
            hourly_rate=tutor_subject.hourly_rate,
            status="active",
        )
        CourseSession.objects.create(
            course=course,
            session_number=1,
            title="Buổi học đầu tiên",
            scheduled_date=slot.start_time.date(),
            scheduled_time=slot.start_time.time(),
        )

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        """
