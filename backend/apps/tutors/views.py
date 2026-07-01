from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Min, Sum
from datetime import time
from django.conf import settings
from django.utils import timezone
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from .models import TutorProfile, Subject
from .serializers import (
    MoneyAmountSerializer,
    TutorGuaranteeStatusSerializer,
    TutorProfileSerializer,
    SubjectSerializer,
)
from .services.guarantee import (
    accrue_course_commission,
    deduct_commission_debt_from_deposit,
    get_course_deposit_release_amount,
    get_required_deposit,
    pay_commission_debt,
    refresh_new_class_lock,
    top_up_deposit,
)
from apps.admin_portal.models import TutorPayoutRequest
from apps.admin_portal.serializers import TutorPayoutRequestSerializer
from apps.courses.models import CourseReview
from apps.bookings.models import Booking, TeachingSlot
from apps.courses.models import Course, CourseSession
from apps.courses.serializers import CourseReviewSerializer
from core.cache_utils import get_cached_response, invalidate_cache_groups, set_cached_response


class TutorSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(
                profile,
                context={"request": request, "include_inactive_subjects": True},
            )
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            # Create profile if it doesn't exist (for existing users)
            profile = TutorProfile.objects.create(user=request.user)
            serializer = TutorProfileSerializer(
                profile,
                context={"request": request, "include_inactive_subjects": True},
            )
            return Response(serializer.data)

    def patch(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(
                profile,
                data=request.data,
                partial=True,
                context={"request": request, "include_inactive_subjects": True},
            )
            if serializer.is_valid():
                serializer.save()
                invalidate_cache_groups("tutors")
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )


def file_url(request, field):
    if not field:
        return ""
    url = field.url
    return request.build_absolute_uri(url) if url.startswith("/") else url


def profile_completion(profile):
    registration = getattr(profile.user, "tutor_profile", None)
    checks = [
        bool(profile.full_name),
        bool(profile.bio),
        bool(profile.location or getattr(registration, "address", "")),
        bool(profile.experience_years),
        profile.tutor_subjects.exists(),
        bool(getattr(profile.user, "avatar", None)),
        bool(getattr(registration, "cccd_number", "")),
        bool(getattr(registration, "teaching_levels", [])),
    ]
    return round((sum(checks) / len(checks)) * 100)


class TutorDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = (
                TutorProfile.objects.select_related("user", "user__tutor_profile")
                .prefetch_related("tutor_subjects__subject")
                .get(user=request.user)
            )
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        today = timezone.localdate()
        month_start = today.replace(day=1)
        registration = getattr(profile.user, "tutor_profile", None)

        booked_slots = (
            TeachingSlot.objects.filter(
                tutor=profile,
                status="booked",
                start_time__date=today,
            )
            .select_related(
                "subject",
                "booking__student",
                "booking__subject",
                "confirmed_booking__student",
                "confirmed_booking__subject",
            )
            .order_by("start_time")
        )
        course_sessions = (
            CourseSession.objects.filter(
                course__tutor=profile,
                scheduled_date=today,
                student_completed=False,
            )
            .select_related("course", "course__subject", "course__student")
            .order_by("scheduled_time", "session_number")
        )

        pending_bookings = (
            Booking.objects.filter(tutor=profile, status="pending")
            .select_related("student", "subject")
            .order_by("start_time")[:6]
        )
        active_courses = Course.objects.filter(tutor=profile, status="active")
        monthly_income = (
            Booking.objects.filter(
                tutor=profile,
                payment_status="paid",
                paid_at__date__gte=month_start,
            ).aggregate(total=Sum("total_price"))["total"]
            or 0
        )
        completed_sessions = CourseSession.objects.filter(
            course__tutor=profile,
            student_completed=True,
        ).count()
        active_students = active_courses.values("student").distinct().count()
        latest_reviews = (
            CourseReview.objects.filter(
                tutor=profile,
                moderation_status=CourseReview.ModerationStatus.APPROVED,
            )
            .select_related("course", "course__subject", "student")
            .order_by("-created_at")[:5]
        )

        def user_name(user):
            return user.get_full_name() or user.username or user.email

        def booking_for_slot(slot):
            return getattr(slot, "confirmed_booking", None) or getattr(
                slot, "booking", None
            )

        def booking_student_name(booking):
            if booking:
                student_info = booking.student_info or {}
                for key in ("fullName", "full_name", "name"):
                    if student_info.get(key):
                        return student_info[key]
                return user_name(booking.student)
            return ""

        booked_slot_booking_ids = {
            booking.id
            for booking in (booking_for_slot(slot) for slot in booked_slots)
            if booking
        }
        visible_course_sessions = [
            session
            for session in course_sessions
            if not (
                session.course.booking_id
                and session.course.booking_id in booked_slot_booking_ids
            )
        ]
        today_schedule = [
            {
                "id": f"slot-{slot.id}",
                "kind": "slot",
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "subject": (
                    getattr(getattr(booking_for_slot(slot), "subject", None), "name", "")
                    or (slot.subject.name if slot.subject else "")
                ),
                "student_name": booking_student_name(booking_for_slot(slot)),
                "meeting_link": slot.meeting_link,
            }
            for slot in booked_slots
        ] + [
            {
                "id": f"session-{session.id}",
                "kind": "course_session",
                "start_time": session.scheduled_time,
                "end_time": None,
                "subject": session.course.subject.name
                if session.course.subject
                else session.course.title,
                "student_name": (
                    booking_student_name(getattr(session.course, "booking", None))
                    or user_name(session.course.student)
                ),
                "meeting_link": "",
            }
            for session in visible_course_sessions
        ]

        data = {
            "profile": {
                "id": profile.id,
                "full_name": profile.full_name or user_name(profile.user),
                "email": profile.user.email,
                "avatar_url": file_url(request, profile.user.avatar),
                "title": profile.title,
                "qualification": getattr(registration, "qualification", ""),
                "profile_completion": profile_completion(profile),
                "rating_avg": str(profile.rating_avg),
                "total_reviews": profile.total_reviews,
            },
            "summary": {
                "today_upcoming_count": len(today_schedule),
                "pending_booking_count": Booking.objects.filter(
                    tutor=profile, status="pending"
                ).count(),
                "active_course_count": active_courses.count(),
                "completed_session_count": completed_sessions,
                "active_student_count": active_students,
                "monthly_income": monthly_income,
                "rating_avg": str(profile.rating_avg),
                "total_reviews": profile.total_reviews,
            },
            "today_schedule": today_schedule,
            "pending_bookings": [
                {
                    "id": booking.id,
                    "student_name": user_name(booking.student),
                    "subject_name": booking.subject.name if booking.subject else "",
                    "start_time": booking.start_time,
                    "end_time": booking.end_time,
                    "deposit_amount": booking.deposit_amount,
                    "total_price": booking.total_price,
                    "notes": booking.notes,
                }
                for booking in pending_bookings
            ],
            "latest_reviews": CourseReviewSerializer(latest_reviews, many=True).data,
        }
        return Response(data)


class TutorGuaranteeStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.teaching_profile
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        refresh_new_class_lock(profile)
        return Response(TutorGuaranteeStatusSerializer(profile).data)


class TutorGuaranteeDepositView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MoneyAmountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            profile = request.user.teaching_profile
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        profile = top_up_deposit(
            profile.id,
            serializer.validated_data["amount"],
            note=serializer.validated_data.get("note", ""),
        )
        return Response(TutorGuaranteeStatusSerializer(profile).data)


class TutorCommissionPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MoneyAmountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            profile = request.user.teaching_profile
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        profile = pay_commission_debt(
            profile.id,
            serializer.validated_data["amount"],
            note=serializer.validated_data.get("note", ""),
        )
        return Response(TutorGuaranteeStatusSerializer(profile).data)


class TutorPayoutRequestListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_profile(self, request):
        return request.user.teaching_profile

    def get(self, request):
        try:
            profile = self.get_profile(request)
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )
        queryset = TutorPayoutRequest.objects.filter(tutor=profile).select_related(
            "course", "tutor__user"
        )
        return Response(TutorPayoutRequestSerializer(queryset, many=True).data)

    @transaction.atomic
    def post(self, request):
        try:
            profile = self.get_profile(request)
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        request_type = request.data.get("request_type")
        bank_info = (request.data.get("bank_info") or "").strip()
        qr_code_url = (request.data.get("qr_code_url") or "").strip()
        note = (request.data.get("note") or "").strip()
        if request_type not in ["course_deposit_release", "platform_exit"]:
            return Response(
                {"request_type": "Invalid payout request type."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not bank_info and not qr_code_url:
            return Response(
                {"bank_info": "Please provide bank information or QR code URL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course = None
        if request_type == "course_deposit_release":
            try:
                course = Course.objects.select_related("booking", "commission").get(
                    pk=request.data.get("course"), tutor=profile
                )
            except Course.DoesNotExist:
                return Response(
                    {"course": "Completed course not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if course.status != "completed":
                return Response(
                    {"course": "Only completed courses can request deposit release."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            accrue_course_commission(course)
            amount = get_course_deposit_release_amount(course)
            if amount <= 0:
                return Response(
                    {"amount": "This course has no remaining deposit to release."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            duplicate = TutorPayoutRequest.objects.filter(
                tutor=profile,
                course=course,
                request_type=request_type,
                status__in=["pending", "approved", "paid"],
            ).exists()
            if duplicate:
                return Response(
                    {"error": "A payout request already exists for this course."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            amount = min(profile.guarantee_deposit_balance, get_required_deposit())
            if amount <= 0:
                return Response(
                    {"amount": "No guarantee deposit is available for refund."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            duplicate = TutorPayoutRequest.objects.filter(
                tutor=profile,
                request_type=request_type,
                status__in=["pending", "approved"],
            ).exists()
            if duplicate:
                return Response(
                    {"error": "A platform exit request is already pending."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payout = TutorPayoutRequest.objects.create(
            tutor=profile,
            course=course,
            request_type=request_type,
            amount=amount,
            bank_info=bank_info,
            qr_code_url=qr_code_url,
            note=note,
            created_by=request.user,
        )
        return Response(
            TutorPayoutRequestSerializer(payout).data,
            status=status.HTTP_201_CREATED,
        )


class AdminTutorCommissionDeductView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            TutorProfile.objects.get(pk=pk)
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND
            )

        profile = deduct_commission_debt_from_deposit(
            pk, note=request.data.get("note", "")
        )
        return Response(TutorGuaranteeStatusSerializer(profile).data)


class SubjectListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = get_cached_response("tutors", request, "subjects")
        if cached is not None:
            return Response(cached)
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        set_cached_response("tutors", serializer.data, request, "subjects")
        return Response(serializer.data)


class TutorPublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = get_cached_response("tutors", request, "public-list")
        if cached is not None:
            return Response(cached)
        queryset = (
            TutorProfile.objects.filter(
                is_available=True,
                new_class_locked=False,
                guarantee_deposit_balance__gte=get_required_deposit(),
                tutor_subjects__is_active=True,
            )
            .select_related("user", "user__tutor_profile")
            .prefetch_related("tutor_subjects__subject", "educations", "certifications")
        )

        # Filtering
        subject = request.query_params.get("subject")
        if subject:
            if str(subject).isdigit():
                queryset = queryset.filter(
                    tutor_subjects__is_active=True,
                    tutor_subjects__subject_id=subject,
                )
            else:
                queryset = queryset.filter(
                    tutor_subjects__is_active=True,
                    tutor_subjects__subject__name__icontains=subject
                )

        level = request.query_params.get("level")
        if level:
            queryset = queryset.filter(tutor_subjects__is_active=True, tutor_subjects__level=level)

        min_price = request.query_params.get("min_price")
        if min_price:
            queryset = queryset.filter(
                tutor_subjects__is_active=True,
                tutor_subjects__hourly_rate__gte=min_price,
            )

        max_price = request.query_params.get("max_price")
        if max_price:
            queryset = queryset.filter(
                tutor_subjects__is_active=True,
                tutor_subjects__hourly_rate__lte=max_price,
            )

        min_rating = request.query_params.get("min_rating")
        if min_rating:
            queryset = queryset.filter(rating_avg__gte=min_rating)

        max_rating = request.query_params.get("max_rating")
        if max_rating:
            queryset = queryset.filter(rating_avg__lte=max_rating)

        university = request.query_params.get("university")
        if university:
            queryset = queryset.filter(
                user__tutor_profile__university__icontains=university
            )

        location = request.query_params.get("location")
        if location:
            queryset = queryset.filter(
                Q(location__icontains=location)
                | Q(user__tutor_profile__address__icontains=location)
            )

        weekdays = self._list_param(request, "weekdays")
        if weekdays:
            django_weekdays = []
            for value in weekdays:
                if str(value).isdigit():
                    day = int(value)
                    django_weekdays.append(1 if day == 0 else day + 1)
            if django_weekdays:
                queryset = queryset.filter(
                    teaching_slots__status="available",
                    teaching_slots__start_time__week_day__in=django_weekdays,
                )

        time_ranges = self._time_ranges(request)
        if time_ranges:
            time_query = Q()
            for start, end in time_ranges:
                time_query |= Q(
                    teaching_slots__status="available",
                    teaching_slots__start_time__time__gte=start,
                    teaching_slots__end_time__time__lte=end,
                )
            queryset = queryset.filter(time_query)

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(title__icontains=search)
                | Q(bio__icontains=search)
            )

        sort = request.query_params.get("sort")
        if sort == "price_asc":
            queryset = queryset.annotate(
                min_rate=Min(
                    "tutor_subjects__hourly_rate",
                    filter=Q(tutor_subjects__is_active=True),
                )
            ).order_by("min_rate")
        elif sort == "price_desc":
            queryset = queryset.annotate(
                min_rate=Min(
                    "tutor_subjects__hourly_rate",
                    filter=Q(tutor_subjects__is_active=True),
                )
            ).order_by("-min_rate")
        elif sort == "rating_desc":
            queryset = queryset.order_by("-rating_avg", "-total_reviews")

        serializer = TutorProfileSerializer(
            queryset.distinct(), many=True, context={"request": request}
        )
        set_cached_response("tutors", serializer.data, request, "public-list")
        return Response(serializer.data)

    def _list_param(self, request, key):
        values = request.query_params.getlist(key)
        if len(values) == 1 and "," in values[0]:
            values = [item.strip() for item in values[0].split(",")]
        return [value for value in values if value not in ["", None]]

    def _time_ranges(self, request):
        starts = self._list_param(request, "start_times")
        ends = self._list_param(request, "end_times")
        ranges = []
        for start_text, end_text in zip(starts, ends):
            try:
                start = time.fromisoformat(start_text)
                end = time.fromisoformat(end_text)
            except ValueError:
                continue
            if start < end:
                ranges.append((start, end))
        return ranges


class TutorPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        cached = get_cached_response("tutors", request, f"public-detail:{pk}")
        if cached is not None:
            return Response(cached)
        try:
            profile = (
                TutorProfile.objects.select_related("user", "user__tutor_profile")
                .prefetch_related(
                    "tutor_subjects__subject",
                    "educations",
                    "certifications",
                    "documents",
                )
                .get(pk=pk, is_available=True)
            )
            refresh_new_class_lock(profile)
            if (
                profile.new_class_locked
                or profile.guarantee_deposit_balance < get_required_deposit()
                or not profile.tutor_subjects.filter(is_active=True).exists()
            ):
                raise TutorProfile.DoesNotExist
            serializer = TutorProfileSerializer(profile, context={"request": request})
            set_cached_response("tutors", serializer.data, request, f"public-detail:{pk}")
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            return Response(
                {"error": "Tutor not found"}, status=status.HTTP_404_NOT_FOUND
            )


class TutorPublicReviewListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        reviews = (
            CourseReview.objects.filter(
                tutor_id=pk,
                moderation_status=CourseReview.ModerationStatus.APPROVED,
            )
            .select_related("student", "course__subject")
            .order_by("-created_at")
        )
        return Response(
            CourseReviewSerializer(
                reviews, many=True, context={"request": request}
            ).data
        )


class TutorQuickSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        if not prompt:
            return Response(
                {"prompt": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ai_result = self.parse_prompt(prompt)
        criteria = ai_result.get("criteria") or {}
        queryset = self.query_tutors(criteria)
        serializer = TutorProfileSerializer(
            queryset[:12], many=True, context={"request": request}
        )
        return Response(
            {
                "criteria": criteria,
                "used_llm": ai_result.get("used_llm", False),
                "tutors": serializer.data,
            }
        )

    def parse_prompt(self, prompt):
        payload = json.dumps({"prompt": prompt}).encode("utf-8")
        req = urlrequest.Request(
            f"{settings.AI_SERVICE_URL.rstrip('/')}/parse-tutor-search",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            return {
                "criteria": {"subjects": [prompt], "notes": prompt},
                "used_llm": False,
            }

    def query_tutors(self, criteria):
        queryset = (
            TutorProfile.objects.filter(
                is_available=True,
                new_class_locked=False,
                guarantee_deposit_balance__gte=get_required_deposit(),
                tutor_subjects__is_active=True,
            )
            .select_related("user", "user__tutor_profile")
            .prefetch_related("tutor_subjects__subject", "educations", "certifications")
        )

        subject_query = Q()
        for subject in criteria.get("subjects") or []:
            subject_query |= Q(
                tutor_subjects__is_active=True,
                tutor_subjects__subject__name__icontains=subject,
            )
        if subject_query:
            queryset = queryset.filter(subject_query)

        location = criteria.get("location")
        if location:
            queryset = queryset.filter(
                Q(location__icontains=location)
                | Q(user__tutor_profile__address__icontains=location)
                | Q(user__tutor_profile__teaching_region__icontains=location)
            )

        university = criteria.get("university")
        if university:
            queryset = queryset.filter(
                user__tutor_profile__university__icontains=university
            )

        min_price = criteria.get("min_price")
        if min_price:
            queryset = queryset.filter(
                tutor_subjects__is_active=True,
                tutor_subjects__hourly_rate__gte=min_price,
            )
        max_price = criteria.get("max_price")
        if max_price:
            queryset = queryset.filter(
                tutor_subjects__is_active=True,
                tutor_subjects__hourly_rate__lte=max_price,
            )

        min_rating = criteria.get("min_rating")
        if min_rating:
            queryset = queryset.filter(rating_avg__gte=min_rating)

        for level in criteria.get("teaching_levels") or []:
            queryset = queryset.filter(
                Q(user__tutor_profile__teaching_levels__contains=[level])
                | Q(tutor_subjects__is_active=True, tutor_subjects__level__icontains=level)
            )

        weekdays = criteria.get("weekdays") or []
        if weekdays:
            django_weekdays = [
                1 if int(day) == 0 else int(day) + 1
                for day in weekdays
                if str(day).isdigit()
            ]
            if django_weekdays:
                queryset = queryset.filter(
                    teaching_slots__status="available",
                    teaching_slots__start_time__week_day__in=django_weekdays,
                )

        time_query = Q()
        for item in criteria.get("time_ranges") or []:
            try:
                start = time.fromisoformat(item.get("start") or "")
                end = time.fromisoformat(item.get("end") or "")
            except ValueError:
                continue
            if start < end:
                time_query |= Q(
                    teaching_slots__status="available",
                    teaching_slots__start_time__time__gte=start,
                    teaching_slots__end_time__time__lte=end,
                )
        if time_query:
            queryset = queryset.filter(time_query)

        return (
            queryset.annotate(
                min_rate=Min(
                    "tutor_subjects__hourly_rate",
                    filter=Q(tutor_subjects__is_active=True),
                )
            )
            .order_by("-rating_avg", "min_rate")
            .distinct()
        )
