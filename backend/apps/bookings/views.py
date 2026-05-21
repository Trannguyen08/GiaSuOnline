from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string
from kombu.exceptions import OperationalError as QueueOperationalError
from decimal import Decimal
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
from .tasks import enqueue_payment_verification
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model
from apps.tutors.models import TutorSubject
from apps.tutors.services.guarantee import (
    can_receive_new_classes,
    refresh_new_class_lock,
)

User = get_user_model()


def get_tutor_profile(user):
    return getattr(user, "teaching_profile", None) or getattr(
        user, "tutor_profile", None
    )


def calculate_deposit_amount(tutor_subject, start_time, end_time):
    hours = Decimal(str((end_time - start_time).total_seconds())) / Decimal("3600")
    return (tutor_subject.hourly_rate * hours).quantize(Decimal("0.01"))


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


class TutorBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tutor_profile = get_tutor_profile(request.user)
        bookings = Booking.objects.filter(tutor=tutor_profile).order_by(
            "-start_time"
        )
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class StudentBookingHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bookings = (
            Booking.objects.filter(student=request.user)
            .select_related("tutor", "subject", "teaching_slot")
            .order_by("-created_at")
        )
        serializer = BookingSerializer(bookings, many=True, context={"request": request})
        return Response(serializer.data)


class TutorBookingDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        tutor_profile = get_tutor_profile(request.user)
        try:
            booking = (
                Booking.objects.select_for_update()
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
            if booking.teaching_slot:
                booking.teaching_slot.status = "available"
                booking.teaching_slot.save(update_fields=["status"])

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

        # Get unique students from bookings
        student_ids = (
            Booking.objects.filter(tutor=request.user.tutor_profile)
            .values_list("student", flat=True)
            .distinct()
        )

        students = User.objects.filter(id__in=student_ids)
        serializer = UserSerializer(students, many=True)

        # We could enhance this with progress data if we had a dedicated model
        return Response(serializer.data)


class TutorTeachingSlotListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        slots = (
            TeachingSlot.objects.filter(tutor=get_tutor_profile(request.user))
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        return Response(serializer.data)

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
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorTeachingSlotDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
            return Response(
                {"error": "Booked slots cannot be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TeachingSlotSerializer(
            slot, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
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
                {"error": "Booked slots cannot be deleted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicTutorSlotListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tutor_id):
        slots = (
            TeachingSlot.objects.filter(
                tutor_id=tutor_id,
                status="available",
            )
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        return Response(serializer.data)


class StudentBookSlotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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

        deposit_amount = calculate_deposit_amount(
            tutor_subject, slot.start_time, slot.end_time
        )
        booking = Booking.objects.create(
            student=request.user,
            tutor=slot.tutor,
            subject=tutor_subject.subject,
            start_time=slot.start_time,
            end_time=slot.end_time,
            total_price=deposit_amount,
            deposit_amount=deposit_amount,
            notes=request.data.get("notes", ""),
            teaching_slot=slot,
            status="pending",
        )
        slot.status = "booked"
        slot.save(update_fields=["status"])
        transaction.on_commit(lambda: send_booking_requested_email(booking))

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BookingDepositPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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

        frontend_base_url = getattr(
            settings, "FRONTEND_BASE_URL", "http://localhost:5173"
        ).rstrip("/")
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
            enqueue_payment_verification(booking_snapshot.id)
        except PayOSError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        except QueueOperationalError:
            return Response(
                {"error": "Payment queue is unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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
