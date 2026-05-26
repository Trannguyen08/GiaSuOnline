from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.admin_portal.models import SystemSetting, ViolationCase
from apps.bookings.models import Booking
from apps.bookings.views import release_booking_slots
from apps.courses.models import Course, CourseReview

from .support_serializers import (
    PolicySettingSerializer,
    ViolationCaseCreateSerializer,
    ViolationCaseListSerializer,
)
from .views import get_tutor_profile
from core.cache_utils import (
    get_cached_response,
    invalidate_cache_groups,
    set_cached_response,
)

User = get_user_model()


def ensure_public_policy_settings():
    defaults = [
        (
            "booking-deposit-rate",
            "Tỷ lệ cọc booking",
            "0.20",
            "percent",
            "Tỷ lệ cọc gợi ý cho booking mới.",
        ),
        (
            "refund-policy-note",
            "Chính sách hoàn tiền",
            "Admin đối soát và hoàn tiền thủ công khi booking bị hủy hợp lệ.",
            "text",
            "Nội dung chính sách hiển thị cho người dùng.",
        ),
        (
            "tutor-commission-rate",
            "Tỷ lệ commission",
            "0.15",
            "percent",
            "Tỷ lệ nền tảng thu khi khóa học hoàn thành.",
        ),
        (
            "tutor-guarantee-required-amount",
            "Cọc bảo chứng gia sư",
            "200000.00",
            "money",
            "Số tiền cọc tối thiểu để gia sư được nhận lớp mới.",
        ),
    ]
    for key, label, value, value_type, description in defaults:
        setting, created = SystemSetting.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "value": value,
                "value_type": value_type,
                "description": description,
            },
        )
        if not created and key == "booking-deposit-rate" and setting.value == "0.30":
            setting.value = "0.20"
            setting.save(update_fields=["value", "updated_at"])
        if not created and key == "tutor-commission-rate" and setting.value == "0.10":
            setting.value = "0.15"
            setting.save(update_fields=["value", "updated_at"])


class PublicPolicySettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cached = get_cached_response("bookings", request, "public-policies")
        if cached is not None:
            return Response(cached)
        ensure_public_policy_settings()
        settings = SystemSetting.objects.filter(
            key__in=[
                "booking-deposit-rate",
                "refund-policy-note",
                "tutor-commission-rate",
                "tutor-guarantee-required-amount",
            ]
        )
        data = PolicySettingSerializer(settings, many=True).data
        set_cached_response("bookings", data, request, "public-policies")
        return Response(data)


class StudentBookingCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "booking_action"

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related("teaching_slot").get(
                pk=pk, student=request.user
            )
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        if booking.status in ["cancelled", "completed"]:
            return Response(
                {"error": "This booking cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get("reason", "")
        booking.status = "cancelled"
        if booking.payment_status != "paid":
            booking.payment_status = "cancelled"
        if reason:
            booking.notes = f"{booking.notes}\n[Student cancelled] {reason}".strip()
        booking.save(update_fields=["status", "payment_status", "notes"])
        release_booking_slots(booking)
        invalidate_cache_groups("bookings", "tutors")
        return Response({"message": "Booking cancelled successfully."})


class UserViolationCaseListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback_action"

    def get(self, request):
        queryset = ViolationCase.objects.select_related(
            "reporter", "target_user", "booking", "course"
        ).filter(Q(reporter=request.user) | Q(target_user=request.user))
        return Response(ViolationCaseListSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = ViolationCaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        booking = None
        course = None
        target_user = None

        booking_id = data.get("booking")
        if booking_id:
            booking_filter = Q(student=request.user)
            tutor_profile = get_tutor_profile(request.user)
            if tutor_profile:
                booking_filter |= Q(tutor=tutor_profile)
            try:
                booking = Booking.objects.select_related("student", "tutor__user").get(
                    booking_filter, pk=booking_id
                )
            except Booking.DoesNotExist:
                return Response({"booking": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
            target_user = booking.tutor.user if booking.student_id == request.user.id else booking.student

        course_id = data.get("course")
        if course_id:
            tutor_profile = get_tutor_profile(request.user)
            course_filter = Q(student=request.user)
            if tutor_profile:
                course_filter |= Q(tutor=tutor_profile)
            try:
                course = Course.objects.select_related("student", "tutor__user").get(
                    course_filter, pk=course_id
                )
            except Course.DoesNotExist:
                return Response({"course": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
            target_user = course.tutor.user if course.student_id == request.user.id else course.student

        target_user_id = data.get("target_user")
        if target_user_id and not target_user:
            try:
                target_user = User.objects.get(pk=target_user_id)
            except User.DoesNotExist:
                return Response({"target_user": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)

        case = ViolationCase.objects.create(
            title=data["title"],
            description=data.get("description", ""),
            reporter=request.user,
            target_user=target_user,
            booking=booking,
            course=course,
            severity=data.get("severity", "medium"),
            created_by=request.user,
        )
        return Response(
            ViolationCaseListSerializer(case).data, status=status.HTTP_201_CREATED
        )


class TutorReviewDisputeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback_action"

    def post(self, request, pk):
        tutor_profile = get_tutor_profile(request.user)
        if not tutor_profile:
            return Response({"error": "Only tutors can dispute reviews."}, status=403)
        try:
            review = CourseReview.objects.select_related("course", "student").get(
                pk=pk, tutor=tutor_profile
            )
        except CourseReview.DoesNotExist:
            return Response({"error": "Review not found"}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get("reason", "")
        case = ViolationCase.objects.create(
            title=f"Yêu cầu xem xét đánh giá #{review.id}",
            description=reason or review.comment,
            reporter=request.user,
            target_user=review.student,
            course=review.course,
            severity="medium",
            created_by=request.user,
        )
        return Response(
            ViolationCaseListSerializer(case).data, status=status.HTTP_201_CREATED
        )
