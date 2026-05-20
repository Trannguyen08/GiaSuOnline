from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from django.db.models import Avg
from datetime import date, timedelta

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
    CourseExtensionRequest,
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
    CourseExtensionRequestSerializer,
)
from core.s3_uploads import (
    build_material_key,
    create_presigned_post,
    public_s3_url,
    validate_material_upload,
    s3_client,
)

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
    material.external_url = material.file.url
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
        courses = (
            Course.objects.filter(student=request.user)
            .select_related("tutor", "subject")
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
        return Response(
            {
                "summary": {
                    "total_this_week": total_this_week,
                    "completed_this_week": completed_this_week,
                    "total_completed_all": total_completed_all,
                    "active_courses": courses.filter(status="active").count(),
                },
                "courses": serializer.data,
            }
        )


class StudentCourseDetailView(APIView):
    """Student: Xem chi tiết 1 khóa học + các buổi học"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, student=request.user)
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseDetailSerializer(course, context={"request": request})
        return Response(serializer.data)


class StudentSessionCompleteView(APIView):
    """Student: Đánh dấu hoàn thành buổi học"""

    permission_classes = [IsAuthenticated]

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

        session.mark_completed()
        return Response(
            {
                "message": "Đã đánh dấu hoàn thành buổi học!",
                "completed_at": session.student_completed_at,
            }
        )


class StudentCourseReviewView(APIView):
    permission_classes = [IsAuthenticated]

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
            stats = CourseReview.objects.filter(tutor=course.tutor).aggregate(
                avg=Avg("rating")
            )
            course.tutor.rating_avg = stats["avg"] or 0
            course.tutor.total_reviews = CourseReview.objects.filter(
                tutor=course.tutor
            ).count()
            course.tutor.save(update_fields=["rating_avg", "total_reviews"])
            return Response(
                CourseReviewSerializer(review, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentCourseExtensionRequestView(APIView):
    permission_classes = [IsAuthenticated]

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
        return Response(
            {
                "courses": serializer.data,
                "total_students": courses.values("student").distinct().count(),
                "active_courses": courses.filter(status="active").count(),
            }
        )


class TutorCourseReviewListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = (
            CourseReview.objects.filter(tutor=request.user.teaching_profile)
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

        return Response(CourseExtensionRequestSerializer(extension).data)


class TutorCourseDetailView(APIView):
    """Tutor: Xem chi tiết khóa học"""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except Course.DoesNotExist:
            return Response(
                {"error": "Không tìm thấy khóa học"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseDetailSerializer(course, context={"request": request})
        return Response(serializer.data)


class TutorSessionUpdateView(APIView):
    """Tutor: Cập nhật nội dung buổi học (ghi chú, tải lên file, ảnh)"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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

        serializer = CourseSessionSerializer(session, context={"request": request})
        return Response(serializer.data)


class TutorSessionMaterialUploadView(APIView):
    """Tutor: Upload tài liệu (file/ảnh/note/link) cho buổi học"""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
            external_url=public_s3_url(key),
            file_size=file_size,
            content_type=content_type,
            upload_status="pending",
        )
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
            external_url=public_s3_url(key),
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
