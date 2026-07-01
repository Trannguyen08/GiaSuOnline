from rest_framework import serializers
from urllib.parse import quote
from django.core import signing
from .models import (
    Course,
    CourseSession,
    SessionMaterial,
    StudyRoom,
    StudyRoomSession,
    StudyRoomMaterial,
    CourseReview,
    TutorStudentFeedback,
    CourseExtensionRequest,
    CourseCancellationRequest,
)
from apps.users.serializers import UserSerializer


class SessionMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = SessionMaterial
        fields = [
            "id",
            "material_type",
            "title",
            "content",
            "file",
            "file_url",
            "download_url",
            "s3_key",
            "file_size",
            "content_type",
            "upload_status",
            "uploaded_by_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by_name",
            "created_at",
            "file_url",
            "download_url",
            "s3_key",
            "file_size",
            "content_type",
            "upload_status",
        ]

    def get_file_url(self, obj):
        if obj.file:
            return self.get_download_url(obj)
        if obj.external_url:
            return obj.external_url
        return None

    def get_download_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            if request is not None:
                token = signing.dumps({"material_id": obj.id}, salt="session-material-download")
                return f"/api/courses/materials/{obj.id}/download/?token={quote(token)}"
            return obj.file.url
        if obj.external_url:
            return obj.external_url
        return None

    def get_uploaded_by_name(self, obj):
        tutor = getattr(getattr(obj.session, "course", None), "tutor", None)
        if tutor:
            return tutor.full_name or tutor.user.get_full_name() or tutor.user.username
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username or obj.uploaded_by.email


class CourseSessionSerializer(serializers.ModelSerializer):
    materials = SessionMaterialSerializer(many=True, read_only=True)
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = [
            "id",
            "session_number",
            "title",
            "scheduled_date",
            "scheduled_time",
            "student_completed",
            "student_completed_at",
            "tutor_notes",
            "materials",
            "is_upcoming",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "student_completed_at"]

    def get_is_upcoming(self, obj):
        from datetime import date

        if obj.scheduled_date:
            return obj.scheduled_date >= date.today()
        return True


class CourseReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="course.subject.name", read_only=True)

    class Meta:
        model = CourseReview
        fields = [
            "id",
            "course",
            "student_name",
            "subject_name",
            "rating",
            "comment",
            "moderation_status",
            "moderation_score",
            "moderation_flags",
            "moderation_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "course",
            "student_name",
            "subject_name",
            "moderation_status",
            "moderation_score",
            "moderation_flags",
            "moderation_reason",
            "created_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class TutorStudentFeedbackSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    subject_name = serializers.CharField(source="course.subject.name", read_only=True)

    class Meta:
        model = TutorStudentFeedback
        fields = [
            "id",
            "course",
            "course_title",
            "subject_name",
            "student",
            "student_name",
            "tutor_name",
            "rating",
            "comment",
            "moderation_status",
            "moderation_score",
            "moderation_flags",
            "moderation_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "course",
            "course_title",
            "subject_name",
            "student",
            "student_name",
            "tutor_name",
            "moderation_status",
            "moderation_score",
            "moderation_flags",
            "moderation_reason",
            "created_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class CourseExtensionRequestSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseExtensionRequest
        fields = [
            "id",
            "course",
            "course_title",
            "student_name",
            "requested_end_date",
            "status",
            "tutor_note",
            "created_at",
            "responded_at",
        ]
        read_only_fields = [
            "id",
            "course",
            "course_title",
            "student_name",
            "status",
            "tutor_note",
            "created_at",
            "responded_at",
        ]

    def get_student_name(self, obj):
        return (
            obj.course.student.get_full_name()
            or obj.course.student.username
            or obj.course.student.email
        )


class CourseCancellationRequestSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()
    tutor_name = serializers.CharField(source="course.tutor.full_name", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    refund_qr_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseCancellationRequest
        fields = [
            "id",
            "course",
            "course_title",
            "student_name",
            "tutor_name",
            "requested_by_name",
            "requested_by_role",
            "reason",
            "refund_required",
            "refund_percent",
            "refund_amount",
            "refund_note",
            "bank_account_name",
            "bank_account_number",
            "bank_name",
            "bank_branch",
            "refund_qr_url",
            "status",
            "admin_note",
            "created_at",
            "processed_at",
        ]
        read_only_fields = fields

    def get_student_name(self, obj):
        return (
            obj.course.student.get_full_name()
            or obj.course.student.username
            or obj.course.student.email
        )

    def get_requested_by_name(self, obj):
        return (
            obj.requested_by.get_full_name()
            or obj.requested_by.username
            or obj.requested_by.email
        )

    def get_refund_qr_url(self, obj):
        if not obj.refund_qr:
            return None
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(obj.refund_qr.url)
        return obj.refund_qr.url


class CourseListSerializer(serializers.ModelSerializer):
    """Compact serializer for the course list (card view)"""

    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)
    student_avatar = serializers.SerializerMethodField()
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    tutor_phone = serializers.CharField(source="tutor.user.phone", read_only=True)
    tutor_address = serializers.SerializerMethodField()
    tutor_location = serializers.CharField(source="tutor.location", read_only=True)
    tutor_avatar = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    completed_sessions = serializers.IntegerField(
        source="completed_sessions_count", read_only=True
    )
    this_week_sessions = serializers.IntegerField(
        source="this_week_sessions_count", read_only=True
    )
    can_review = serializers.BooleanField(source="can_student_review", read_only=True)
    review = CourseReviewSerializer(read_only=True)
    student_feedback = TutorStudentFeedbackSerializer(read_only=True)
    pending_extension_request = serializers.SerializerMethodField()
    pending_cancellation_request = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "status",
            "student_name",
            "student_email",
            "student_avatar",
            "tutor_name",
            "tutor_email",
            "tutor_phone",
            "tutor_address",
            "tutor_location",
            "tutor_avatar",
            "subject_name",
            "total_sessions",
            "completed_sessions",
            "this_week_sessions",
            "schedule_time",
            "start_date",
            "end_date",
            "hourly_rate",
            "session_duration_minutes",
            "can_review",
            "review",
            "student_feedback",
            "pending_extension_request",
            "pending_cancellation_request",
        ]

    def get_tutor_avatar(self, obj):
        avatar = getattr(getattr(obj.tutor, "user", None), "avatar", None)
        if avatar:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(avatar.url)
            return avatar.url
        seed = obj.tutor.full_name or obj.tutor.user.username or obj.tutor.user.email
        return f"https://ui-avatars.com/api/?name={quote(seed)}&background=eef2ff&color=4f46e"

    def get_tutor_address(self, obj):
        registration = getattr(getattr(obj.tutor, "user", None), "tutor_profile", None)
        return getattr(registration, "address", "") or obj.tutor.location

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email

    def get_student_avatar(self, obj):
        seed = self.get_student_name(obj)
        return f"https://api.dicebear.com/7.x/avataaars/svg?seed={seed}"

    def get_pending_extension_request(self, obj):
        request = obj.extension_requests.filter(status="pending").first()
        if not request:
            return None
        return CourseExtensionRequestSerializer(request).data

    def get_pending_cancellation_request(self, obj):
        request = obj.cancellation_requests.filter(status="pending").first()
        if not request:
            return None
        return CourseCancellationRequestSerializer(
            request, context=self.context
        ).data


class CourseDetailSerializer(CourseListSerializer):
    """Full serializer including sessions"""

    sessions = CourseSessionSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + [
            "sessions",
            "created_at",
            "updated_at",
        ]


class CourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            "title",
            "description",
            "tutor",
            "subject",
            "total_sessions",
            "session_duration_minutes",
            "schedule_time",
            "start_date",
            "end_date",
            "hourly_rate",
        ]

    def create(self, validated_data):
        course = super().create(validated_data)
        # Auto-create session slots
        for i in range(1, course.total_sessions + 1):
            CourseSession.objects.create(
                course=course, session_number=i, title=f"Buổi {i}"
            )
        return course


class StudyRoomMaterialSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyRoomMaterial
        fields = [
            "id",
            "material_type",
            "title",
            "content",
            "file",
            "file_url",
            "s3_key",
            "file_size",
            "content_type",
            "upload_status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "file_url",
            "s3_key",
            "file_size",
            "content_type",
            "upload_status",
            "created_at",
        ]

    def get_file_url(self, obj):
        if obj.external_url:
            return obj.external_url
        if obj.file:
            request = self.context.get("request")
            if request is not None:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class StudyRoomSessionSerializer(serializers.ModelSerializer):
    materials = StudyRoomMaterialSerializer(many=True, read_only=True)
    read_students = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = StudyRoomSession
        fields = [
            "id",
            "session_number",
            "title",
            "scheduled_at",
            "content_text",
            "materials",
            "read_students",
            "is_read",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "read_students",
            "is_read",
            "created_at",
            "updated_at",
        ]

    def get_read_students(self, obj):
        return [
            {
                "id": item.student_id,
                "name": item.student.get_full_name()
                or item.student.username
                or item.student.email,
                "read_at": item.read_at,
            }
            for item in obj.reads.select_related("student").all()
        ]

    def get_is_read(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.reads.filter(student=request.user).exists()


class StudyRoomListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    student_count = serializers.IntegerField(source="students.count", read_only=True)
    session_count = serializers.IntegerField(
        source="room_sessions.count", read_only=True
    )

    class Meta:
        model = StudyRoom
        fields = [
            "id",
            "title",
            "description",
            "subject",
            "subject_name",
            "tutor_name",
            "student_count",
            "session_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "tutor_name",
            "student_count",
            "session_count",
            "created_at",
            "updated_at",
        ]


class StudyRoomDetailSerializer(StudyRoomListSerializer):
    students = UserSerializer(many=True, read_only=True)
    sessions = serializers.SerializerMethodField()

    class Meta(StudyRoomListSerializer.Meta):
        fields = StudyRoomListSerializer.Meta.fields + ["students", "sessions"]

    def get_sessions(self, obj):
        sessions = obj.room_sessions.prefetch_related(
            "materials", "reads__student"
        ).all()
        return StudyRoomSessionSerializer(
            sessions, many=True, context=self.context
        ).data


class StudyRoomStudentAddSerializer(serializers.Serializer):
    student_ids = serializers.ListField(
        child=serializers.IntegerField(), allow_empty=False
    )
