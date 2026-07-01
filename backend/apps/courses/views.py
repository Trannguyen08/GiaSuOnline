from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from django.http import HttpResponseRedirect
from django.core import signing
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from datetime import date, datetime, timedelta

from .models import (
    Course,
    CourseSession,
    SessionMaterial,
    StudyRoom,
    StudyRoomStudent,
    StudyRoomSession,
    StudyRoomMaterial,
    StudyRoomRead,
    CourseReview,
    TutorStudentFeedback,
    CourseExtensionRequest,
    CourseCancellationRequest,
)
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseSessionSerializer,
    SessionMaterialSerializer,
    StudyRoomListSerializer,
    StudyRoomDetailSerializer,
    StudyRoomSessionSerializer,
    StudyRoomMaterialSerializer,
    StudyRoomStudentAddSerializer,
    CourseReviewSerializer,
    TutorStudentFeedbackSerializer,
    CourseExtensionRequestSerializer,
    CourseCancellationRequestSerializer,
)


class SessionMaterialDownloadView(APIView):
    permission_classes = []

    def get(self, request, material_id):
        try:
            material = (
                SessionMaterial.objects.select_related(
                    "session__course__student", "session__course__tutor__user"
                )
                .get(pk=material_id)
            )
        except SessionMaterial.DoesNotExist:
            return Response({"error": "Material not found"}, status=status.HTTP_404_NOT_FOUND)

        course = material.session.course
        token = request.query_params.get("token")
        has_valid_token = False
        if token:
            try:
                payload = signing.loads(
                    token, salt="session-material-download", max_age=60 * 60 * 24
                )
                has_valid_token = payload.get("material_id") == material.id
            except signing.BadSignature:
                has_valid_token = False

        user = getattr(request, "user", None)
        is_student = bool(user and user.is_authenticated and course.student_id == user.id)
        is_tutor = bool(
            user
            and user.is_authenticated
            and getattr(course.tutor, "user_id", None) == user.id
        )
        if not (has_valid_token or is_student or is_tutor):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        if material.file:
            return HttpResponseRedirect(material.file.url)
        if material.external_url:
            return HttpResponseRedirect(material.external_url)
        return Response({"error": "Material has no file"}, status=status.HTTP_404_NOT_FOUND)
from .tasks import moderate_course_review, moderate_tutor_student_feedback
from core.cache_utils import (
    get_cached_response,
    invalidate_cache_groups,
    set_cached_response,
)
from core.s3_uploads import (
    build_material_key,
    create_presigned_post,
    public_s3_url,
    validate_material_upload,
    s3_client,
)


def calculate_course_cancellation_refund(course, requested_by_role):
    booking = getattr(course, "booking", None)
    deposit = getattr(booking, "deposit_amount", 0) if booking else 0
    payment_status = getattr(booking, "payment_status", "")
    completed_count = course.sessions.filter(student_completed=True).count()

    if payment_status != "paid" or not deposit:
        return 0, 0, "No paid deposit to refund."
    if requested_by_role == "tutor":
        return 100, deposit, "Tutor cancelled after deposit: refund 100%."
    if completed_count >= 1:
        return 0, 0, "Student cancelled after at least one completed session: no deposit refund."
    return 100, deposit, "Student cancelled after deposit before any completed session: refund 80-100%."


def create_course_cancellation_request(course, request, requested_by_role):
    if course.status == "cancelled":
        return None, Response(
            {"error": "Course is already cancelled."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if course.cancellation_requests.filter(status="pending").exists():
        return None, Response(
            {"error": "This course already has a pending cancellation request."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = (request.data.get("reason") or "").strip()
    if not reason:
        return None, Response(
            {"reason": "Cancellation reason is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    refund_percent, refund_amount, refund_note = calculate_course_cancellation_refund(
        course, requested_by_role
    )
    refund_required = refund_amount > 0
    if refund_required:
        has_bank_info = all(
            (request.data.get(field) or "").strip()
            for field in ["bank_account_name", "bank_account_number", "bank_name"]
        )
        has_qr = bool(request.FILES.get("refund_qr"))
        if not has_bank_info and not has_qr:
            return None, Response(
                {
                    "refund_info": "Refund requests require bank account details or a transfer QR image."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    cancellation = CourseCancellationRequest.objects.create(
        course=course,
        requested_by=request.user,
        requested_by_role=requested_by_role,
        reason=reason,
        refund_required=refund_required,
        refund_percent=refund_percent,
        refund_amount=refund_amount,
        refund_note=refund_note,
        bank_account_name=request.data.get("bank_account_name", ""),
        bank_account_number=request.data.get("bank_account_number", ""),
        bank_name=request.data.get("bank_name", ""),
        bank_branch=request.data.get("bank_branch", ""),
        refund_qr=request.FILES.get("refund_qr"),
    )
    invalidate_cache_groups("courses", "bookings")
    return cancellation, None
from apps.tutors.services.guarantee import accrue_course_commission

User = get_user_model()


def ensure_s3_upload_enabled():
    return getattr(settings, "USE_S3", False) and getattr(
        settings, "AWS_STORAGE_BUCKET_NAME", ""
    )


def apply_direct_file_metadata(material, file_obj):
    if not file_obj:
        return
    error = validate_material_upload(
        getattr(file_obj, "content_type", ""), getattr(file_obj, "size", 0)
    )
    if error:
        raise ValueError(error)
    material.file_size = file_obj.size
    material.content_type = file_obj.content_type
    material.s3_key = material.file.name
    material.external_url = ""
    material.upload_status = "ready"
    material.save(
        update_fields=[
            "file_size",
            "content_type",
            "s3_key",
            "external_url",
            "upload_status",
        ]
    )


def confirm_s3_object_uploaded(material):
    if not ensure_s3_upload_enabled() or not material.s3_key:
        raise ValueError("S3 object key is missing.")
    s3_client().head_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=material.s3_key
    )


class StudentCourseListView(APIView):
    """Student: Xem danh sách khóa học của mình + summary tuần"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cached = get_cached_response("courses", request, "student-list")
        if cached is not None:
            return Response(cached)
        courses = (
            Course.objects.filter(student=request.user)
            .select_related("tutor", "tutor__user", "tutor__user__tutor_profile", "subject")
            .prefetch_related("sessions")
        )

        # Weekly summary
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        total_this_week = CourseSession.objects.filter(
            course__student=request.user,
            scheduled_date__range=[start_of_week, end_of_week],
        ).count()

        completed_this_week = CourseSession.objects.filter(
            course__student=request.user,
            scheduled_date__range=[start_of_week, end_of_week],
            student_completed=True,
        ).count()

        total_completed_all = CourseSession.objects.filter(
            course__student=request.user, student_completed=True
        ).count()

        serializer = CourseListSerializer(
            courses, many=True, context={"request": request}
        )
        data = {
                "summary": {
                    "total_this_week": total_this_week,
                    "completed_this_week": completed_this_week,
                    "total_completed_all": total_completed_all,
                    "active_courses": courses.filter(status="active").count(),
                },
                "courses": serializer.data,
            }
        set_cached_response("courses", data, request, "student-list")
        return Response(data)


class StudentCourseDetailView(APIView):
    """Student: Xem chi tiết 1 khóa học + các buổi học"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        cached = get_cached_response("courses", request, f"student-detail:{pk}")
        if cached is not None:
            return Response(cached)
        try:
            course = (
                Course.objects.select_related("tutor", "tutor__user", "tutor__user__tutor_profile", "subject")
                .prefetch_related("sessions__materials")
                .get(pk=pk, student=request.user)
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseDetailSerializer(course, context={"request": request})
        set_cached_response("courses", serializer.data, request, f"student-detail:{pk}")
        return Response(serializer.data)


class StudentSessionCompleteView(APIView):
    """Student: Đánh dấu hoàn thành buổi học"""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def post(self, request, session_id):
        try:
            session = CourseSession.objects.get(
                pk=session_id, course__student=request.user
            )
        except CourseSession.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy buổi học"}, status=status.HTTP_404_NOT_FOUND
            )

        if session.student_completed:
            return Response(
                {"message": "Buổi học đã được đánh dấu hoàn thành trước đó"}
            )

        if not session.scheduled_date or not session.scheduled_time:
            return Response(
                {"error": "Chua co du ngay gio buoi hoc de danh dau hoan thanh"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_start = datetime.combine(session.scheduled_date, session.scheduled_time)
        session_start = timezone.make_aware(session_start, timezone.get_current_timezone())
        session_end = session_start + timedelta(
            minutes=session.course.session_duration_minutes or 0
        )
        if timezone.now() <= session_end:
            return Response(
                {"error": "Chi co the danh dau hoan thanh sau khi buoi hoc ket thuc"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.mark_completed()
        course = session.course
        if (
            course.sessions.filter(student_completed=False).count() == 0
            and course.status != "completed"
        ):
            course.status = "completed"
            course.save(update_fields=["status", "updated_at"])
            accrue_course_commission(course)
        invalidate_cache_groups("courses")
        return Response(
            {
                "message": "Đã đánh dấu hoàn thành buổi học!",
                "completed_at": session.student_completed_at,
            }
        )


class StudentCourseReviewView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback_action"

    def post(self, request, pk):
        try:
            course = Course.objects.select_related("tutor").get(
                pk=pk, student=request.user
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        if not course.end_date or course.end_date >= timezone.localdate():
            return Response(
                {"error": "Chỉ có thể đánh giá sau ngày kết thúc khóa học"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(course, "review"):
            return Response(
                {"error": "Bạn đã đánh giá khóa học này"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CourseReviewSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            review = serializer.save(
                course=course, student=request.user, tutor=course.tutor
            )
            moderate_course_review.delay(review.id)
            invalidate_cache_groups("courses", "reviews")
            return Response(
                CourseReviewSerializer(review, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentCourseExtensionRequestView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def post(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, student=request.user)
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        requested_end_date = request.data.get("requested_end_date")
        if not requested_end_date:
            return Response(
                {"requested_end_date": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if CourseExtensionRequest.objects.filter(
            course=course, status="pending"
        ).exists():
            return Response(
                {"error": "Khóa học đang có yêu cầu gia hạn chờ xử lý"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CourseExtensionRequestSerializer(
            data={"requested_end_date": requested_end_date},
            context={"request": request},
        )
        if serializer.is_valid():
            extension = serializer.save(course=course, requested_by=request.user)
            invalidate_cache_groups("courses")
            return Response(
                CourseExtensionRequestSerializer(extension).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── TUTOR VIEWS ─────────────────────────────────────────────────────────────


class TutorCourseListView(APIView):
    """Tutor: Xem các khóa học mình đang dạy"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cached = get_cached_response("courses", request, "tutor-list")
        if cached is not None:
            return Response(cached)
        try:
            tutor_profile = request.user.teaching_profile
        except Exception:
            return Response(
                {"error": "Không tìm thấy hồ sơ gia sư"},
                status=status.HTTP_404_NOT_FOUND,
            )

        courses = (
            Course.objects.filter(tutor=tutor_profile)
            .select_related("student", "subject")
            .prefetch_related("sessions")
        )

        serializer = CourseListSerializer(
            courses, many=True, context={"request": request}
        )
        data = {
                "courses": serializer.data,
                "total_students": courses.values("student").distinct().count(),
                "active_courses": courses.filter(status="active").count(),
            }
        set_cached_response("courses", data, request, "tutor-list")
        return Response(data)


class TutorCourseReviewListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = (
            CourseReview.objects.filter(
                tutor=request.user.teaching_profile,
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


class TutorExtensionRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        extensions = (
            CourseExtensionRequest.objects.filter(
                course__tutor=request.user.teaching_profile
            )
            .select_related("course__student", "course")
            .order_by("-created_at")
        )
        return Response(CourseExtensionRequestSerializer(extensions, many=True).data)


class TutorExtensionRequestDecisionView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def post(self, request, pk):
        try:
            extension = CourseExtensionRequest.objects.select_related("course").get(
                pk=pk,
                course__tutor=request.user.teaching_profile,
                status="pending",
            )
        except CourseExtensionRequest.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy yêu cầu gia hạn"},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = request.data.get("action")
        if action not in ["approve", "reject"]:
            return Response(
                {"action": "Use approve or reject."}, status=status.HTTP_400_BAD_REQUEST
            )

        extension.status = "approved" if action == "approve" else "rejected"
        extension.tutor_note = request.data.get("tutor_note", "")
        extension.responded_at = timezone.now()
        extension.save(update_fields=["status", "tutor_note", "responded_at"])

        if action == "approve":
            extension.course.end_date = extension.requested_end_date
            extension.course.status = "active"
            extension.course.save(update_fields=["end_date", "status", "updated_at"])

        invalidate_cache_groups("courses")
        return Response(CourseExtensionRequestSerializer(extension).data)


class TutorCourseCancellationRequestView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def post(self, request, pk):
        try:
            course = Course.objects.select_related("booking", "student", "tutor__user").get(
                pk=pk, tutor=request.user.teaching_profile
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Khong tim thay khoa hoc"}, status=status.HTTP_404_NOT_FOUND
            )
        cancellation, error_response = create_course_cancellation_request(
            course, request, "tutor"
        )
        if error_response:
            return error_response
        return Response(
            CourseCancellationRequestSerializer(
                cancellation, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class TutorCourseDetailView(APIView):
    """Tutor: Xem chi tiết khóa học"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        cached = get_cached_response("courses", request, f"tutor-detail:{pk}")
        if cached is not None:
            return Response(cached)
        try:
            course = (
                Course.objects.select_related("student", "subject")
                .prefetch_related("sessions__materials")
                .get(pk=pk, tutor=request.user.teaching_profile)
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseDetailSerializer(course, context={"request": request})
        set_cached_response("courses", serializer.data, request, f"tutor-detail:{pk}")
        return Response(serializer.data)


class TutorStudentFeedbackCreateView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback_action"

    def post(self, request, pk):
        try:
            course = Course.objects.select_related("student", "tutor").get(
                pk=pk,
                tutor=request.user.teaching_profile,
                status="completed",
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Chi co the feedback hoc vien sau khi khoa hoc hoan thanh."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if hasattr(course, "student_feedback"):
            return Response(
                {"error": "Ban da feedback hoc vien cho khoa hoc nay."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TutorStudentFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            feedback = serializer.save(
                course=course, tutor=course.tutor, student=course.student
            )
            moderate_tutor_student_feedback.delay(feedback.id)
            invalidate_cache_groups("courses", "student_feedback")
            return Response(
                TutorStudentFeedbackSerializer(feedback).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentCourseCancellationRequestView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def post(self, request, pk):
        try:
            course = Course.objects.select_related("booking", "student", "tutor__user").get(
                pk=pk, student=request.user
            )
        except Course.DoesNotExist:
            return Response(
                {"error": "Khong tim thay khoa hoc"}, status=status.HTTP_404_NOT_FOUND
            )
        cancellation, error_response = create_course_cancellation_request(
            course, request, "student"
        )
        if error_response:
            return error_response
        return Response(
            CourseCancellationRequestSerializer(
                cancellation, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


class TutorStudentFeedbackListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        try:
            tutor_profile = request.user.teaching_profile
        except Exception:
            return Response(
                {"error": "Khong tim thay ho so gia su"},
                status=status.HTTP_404_NOT_FOUND,
            )

        has_booking = Course.objects.filter(
            tutor=tutor_profile, student_id=student_id
        ).exists()
        if not has_booking:
            from apps.bookings.models import Booking

            has_booking = Booking.objects.filter(
                tutor=tutor_profile, student_id=student_id
            ).exists()
        if not has_booking:
            return Response(
                {"error": "Chi gia su co booking/khoa hoc voi hoc vien moi duoc xem feedback."},
                status=status.HTTP_403_FORBIDDEN,
            )

        feedbacks = TutorStudentFeedback.objects.filter(
            student_id=student_id,
            moderation_status=TutorStudentFeedback.ModerationStatus.APPROVED,
        ).select_related("course__subject", "tutor")
        return Response(TutorStudentFeedbackSerializer(feedbacks, many=True).data)


class TutorSessionUpdateView(APIView):
    """Tutor: Cập nhật nội dung buổi học (ghi chú, tải lên file, ảnh)"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "course_action"

    def patch(self, request, session_id):
        """Update tutor notes for session"""
        try:
            session = CourseSession.objects.get(
                pk=session_id, course__tutor=request.user.teaching_profile
            )
        except CourseSession.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy buổi học"}, status=status.HTTP_404_NOT_FOUND
            )

        tutor_notes = request.data.get("tutor_notes", session.tutor_notes)
        title = request.data.get("title", session.title)
        session.tutor_notes = tutor_notes
        session.title = title
        session.save()
        invalidate_cache_groups("courses")

        serializer = CourseSessionSerializer(session, context={"request": request})
        return Response(serializer.data)


class TutorSessionMaterialUploadView(APIView):
    """Tutor: Upload tài liệu (file/ảnh/note/link) cho buổi học"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "upload_action"

    def post(self, request, session_id):
        try:
            session = CourseSession.objects.get(
                pk=session_id, course__tutor=request.user.teaching_profile
            )
        except CourseSession.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy buổi học"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = SessionMaterialSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            file_obj = request.FILES.get("file")
            if file_obj and not ensure_s3_upload_enabled():
                return Response(
                    {"error": "S3 upload is not configured"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if file_obj:
                error = validate_material_upload(
                    getattr(file_obj, "content_type", ""), getattr(file_obj, "size", 0)
                )
                if error:
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )
            try:
                material = serializer.save(session=session, uploaded_by=request.user)
                apply_direct_file_metadata(material, file_obj)
            except ValueError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            invalidate_cache_groups("courses")
            return Response(
                SessionMaterialSerializer(material, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, session_id):
        material_id = request.query_params.get("material_id")
        try:
            material = SessionMaterial.objects.get(
                pk=material_id, session__course__tutor=request.user.teaching_profile
            )
        except SessionMaterial.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy tài liệu"}, status=status.HTTP_404_NOT_FOUND
            )

        material.delete()
        invalidate_cache_groups("courses")
        return Response(status=status.HTTP_204_NO_CONTENT)


class TutorSessionMaterialPresignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if not ensure_s3_upload_enabled():
            return Response(
                {"error": "S3 upload is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            session = CourseSession.objects.get(
                pk=session_id, course__tutor=request.user.teaching_profile
            )
        except CourseSession.DoesNotExist:
            return Response(
                {"error": "Khong tim thay buoi hoc"}, status=status.HTTP_404_NOT_FOUND
            )

        filename = request.data.get("filename", "material")
        content_type = request.data.get("content_type", "")
        file_size = int(request.data.get("file_size") or 0)
        key = build_material_key("session_materials", filename)

        try:
            presigned = create_presigned_post(key, content_type, file_size)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        material = SessionMaterial.objects.create(
            session=session,
            uploaded_by=request.user,
            material_type=request.data.get("material_type", "file"),
            title=request.data.get("title", filename),
            content=request.data.get("content", ""),
            s3_key=key,
            external_url="",
            file_size=file_size,
            content_type=content_type,
            upload_status="pending",
        )
        invalidate_cache_groups("courses")
        return Response(
            {
                "material": SessionMaterialSerializer(
                    material, context={"request": request}
                ).data,
                "upload": presigned,
                "max_size_mb": settings.SESSION_MATERIAL_PRESIGNED_UPLOAD_MAX_MB,
            },
            status=status.HTTP_201_CREATED,
        )


class TutorSessionMaterialCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, material_id):
        try:
            material = SessionMaterial.objects.get(
                pk=material_id, session__course__tutor=request.user.teaching_profile
            )
        except SessionMaterial.DoesNotExist:
            return Response(
                {"error": "Khong tim thay tai lieu"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            confirm_s3_object_uploaded(material)
        except Exception:
            return Response(
                {"error": "File chua upload xong tren S3"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        material.upload_status = "ready"
        material.save(update_fields=["upload_status"])
        invalidate_cache_groups("courses")
        return Response(
            SessionMaterialSerializer(material, context={"request": request}).data
        )


class TutorStudyRoomListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            tutor_profile = request.user.teaching_profile
        except Exception:
            return Response(
                {"error": "Khong tim thay ho so gia su"},
                status=status.HTTP_404_NOT_FOUND,
            )

        rooms = StudyRoom.objects.filter(tutor=tutor_profile).prefetch_related(
            "students", "room_sessions"
        )
        serializer = StudyRoomListSerializer(
            rooms, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        try:
            tutor_profile = request.user.teaching_profile
        except Exception:
            return Response(
                {"error": "Khong tim thay ho so gia su"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = StudyRoomListSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            room = serializer.save(tutor=tutor_profile)
            student_ids = request.data.get("student_ids", [])
            if student_ids:
                students = User.objects.filter(id__in=student_ids, is_tutor=False)
                StudyRoomStudent.objects.bulk_create(
                    [
                        StudyRoomStudent(room=room, student=student)
                        for student in students
                    ],
                    ignore_conflicts=True,
                )
            return Response(
                StudyRoomDetailSerializer(room, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_room(self, request, pk):
        return StudyRoom.objects.prefetch_related(
            "students", "room_sessions__materials", "room_sessions__reads__student"
        ).get(pk=pk, tutor=request.user.teaching_profile)

    def get(self, request, pk):
        try:
            room = self.get_room(request, pk)
        except StudyRoom.DoesNotExist:
            return Response(
                {"error": "Khong tim thay room"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            StudyRoomDetailSerializer(room, context={"request": request}).data
        )

    def patch(self, request, pk):
        try:
            room = self.get_room(request, pk)
        except StudyRoom.DoesNotExist:
            return Response(
                {"error": "Khong tim thay room"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StudyRoomListSerializer(
            room, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                StudyRoomDetailSerializer(room, context={"request": request}).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomStudentsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            room = StudyRoom.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except StudyRoom.DoesNotExist:
            return Response(
                {"error": "Khong tim thay room"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StudyRoomStudentAddSerializer(data=request.data)
        if serializer.is_valid():
            students = User.objects.filter(
                id__in=serializer.validated_data["student_ids"], is_tutor=False
            )
            StudyRoomStudent.objects.bulk_create(
                [StudyRoomStudent(room=room, student=student) for student in students],
                ignore_conflicts=True,
            )
            return Response(
                StudyRoomDetailSerializer(room, context={"request": request}).data
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            room = StudyRoom.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except StudyRoom.DoesNotExist:
            return Response(
                {"error": "Khong tim thay room"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StudyRoomSessionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(room=room)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, session_id):
        try:
            session = StudyRoomSession.objects.get(
                pk=session_id, room__tutor=request.user.teaching_profile
            )
        except StudyRoomSession.DoesNotExist:
            return Response(
                {"error": "Khong tim thay buoi hoc"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StudyRoomSessionSerializer(
            session, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomMaterialView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, session_id):
        try:
            session = StudyRoomSession.objects.get(
                pk=session_id, room__tutor=request.user.teaching_profile
            )
        except StudyRoomSession.DoesNotExist:
            return Response(
                {"error": "Khong tim thay buoi hoc"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = StudyRoomMaterialSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            file_obj = request.FILES.get("file")
            if file_obj and not ensure_s3_upload_enabled():
                return Response(
                    {"error": "S3 upload is not configured"},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            if file_obj:
                error = validate_material_upload(
                    getattr(file_obj, "content_type", ""), getattr(file_obj, "size", 0)
                )
                if error:
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )
            try:
                material = serializer.save(session=session)
                apply_direct_file_metadata(material, file_obj)
            except ValueError as exc:
                return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                StudyRoomMaterialSerializer(
                    material, context={"request": request}
                ).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorStudyRoomMaterialPresignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        if not ensure_s3_upload_enabled():
            return Response(
                {"error": "S3 upload is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            session = StudyRoomSession.objects.get(
                pk=session_id, room__tutor=request.user.teaching_profile
            )
        except StudyRoomSession.DoesNotExist:
            return Response(
                {"error": "Khong tim thay buoi hoc"}, status=status.HTTP_404_NOT_FOUND
            )

        filename = request.data.get("filename", "material")
        content_type = request.data.get("content_type", "")
        file_size = int(request.data.get("file_size") or 0)
        key = build_material_key("study_room_materials", filename)

        try:
            presigned = create_presigned_post(key, content_type, file_size)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        material = StudyRoomMaterial.objects.create(
            session=session,
            material_type=request.data.get("material_type", "file"),
            title=request.data.get("title", filename),
            content=request.data.get("content", ""),
            s3_key=key,
            external_url="",
            file_size=file_size,
            content_type=content_type,
            upload_status="pending",
        )
        return Response(
            {
                "material": StudyRoomMaterialSerializer(
                    material, context={"request": request}
                ).data,
                "upload": presigned,
                "max_size_mb": settings.SESSION_MATERIAL_PRESIGNED_UPLOAD_MAX_MB,
            },
            status=status.HTTP_201_CREATED,
        )


class TutorStudyRoomMaterialCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, material_id):
        try:
            material = StudyRoomMaterial.objects.get(
                pk=material_id, session__room__tutor=request.user.teaching_profile
            )
        except StudyRoomMaterial.DoesNotExist:
            return Response(
                {"error": "Khong tim thay tai lieu"}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            confirm_s3_object_uploaded(material)
        except Exception:
            return Response(
                {"error": "File chua upload xong tren S3"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        material.upload_status = "ready"
        material.save(update_fields=["upload_status"])
        return Response(
            StudyRoomMaterialSerializer(material, context={"request": request}).data
        )


class StudentStudyRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms = StudyRoom.objects.filter(
            students=request.user, is_active=True
        ).prefetch_related("room_sessions")
        serializer = StudyRoomListSerializer(
            rooms, many=True, context={"request": request}
        )
        return Response(serializer.data)


class StudentStudyRoomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            room = StudyRoom.objects.prefetch_related(
                "students", "room_sessions__materials", "room_sessions__reads__student"
            ).get(pk=pk, students=request.user, is_active=True)
        except StudyRoom.DoesNotExist:
            return Response(
                {"error": "Khong tim thay room"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(
            StudyRoomDetailSerializer(room, context={"request": request}).data
        )


class StudentStudyRoomSessionReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = StudyRoomSession.objects.get(
                pk=session_id, room__students=request.user, room__is_active=True
            )
        except StudyRoomSession.DoesNotExist:
            return Response(
                {"error": "Khong tim thay buoi hoc"}, status=status.HTTP_404_NOT_FOUND
            )

        read, _ = StudyRoomRead.objects.get_or_create(
            session=session, student=request.user
        )
        read.read_at = timezone.now()
        read.save(update_fields=["read_at"])
        return Response({"message": "Da danh dau da doc", "read_at": read.read_at})
