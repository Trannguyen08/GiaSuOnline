from rest_framework import serializers
from .models import (
    Course, CourseSession, SessionMaterial,
    StudyRoom, StudyRoomStudent, StudyRoomSession, StudyRoomMaterial, StudyRoomRead
)
from apps.tutors.models import TutorProfile
from apps.users.serializers import UserSerializer


class SessionMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SessionMaterial
        fields = [
            'id', 'material_type', 'title', 'content', 'file', 'file_url',
            's3_key', 'file_size', 'content_type', 'upload_status',
            'uploaded_by_name', 'created_at'
        ]
        read_only_fields = [
            'id', 'uploaded_by_name', 'created_at', 'file_url',
            's3_key', 'file_size', 'content_type', 'upload_status'
        ]

    def get_file_url(self, obj):
        if obj.external_url:
            return obj.external_url
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class CourseSessionSerializer(serializers.ModelSerializer):
    materials = SessionMaterialSerializer(many=True, read_only=True)
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = [
            'id', 'session_number', 'title', 'scheduled_date', 'scheduled_time',
            'student_completed', 'student_completed_at', 'tutor_notes',
            'materials', 'is_upcoming', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'student_completed_at']

    def get_is_upcoming(self, obj):
        from datetime import date
        if obj.scheduled_date:
            return obj.scheduled_date >= date.today()
        return True


class CourseListSerializer(serializers.ModelSerializer):
    """Compact serializer for the course list (card view)"""
    tutor_name = serializers.CharField(source='tutor.full_name', read_only=True)
    tutor_avatar = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    completed_sessions = serializers.IntegerField(source='completed_sessions_count', read_only=True)
    this_week_sessions = serializers.IntegerField(source='this_week_sessions_count', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'status',
            'tutor_name', 'tutor_avatar', 'subject_name',
            'total_sessions', 'completed_sessions', 'this_week_sessions',
            'schedule_time', 'start_date', 'end_date',
            'hourly_rate', 'session_duration_minutes',
        ]

    def get_tutor_avatar(self, obj):
        request = self.context.get('request')
        # Return dicebear avatar based on tutor name
        return f"https://api.dicebear.com/7.x/avataaars/svg?seed={obj.tutor.full_name}"


class CourseDetailSerializer(CourseListSerializer):
    """Full serializer including sessions"""
    sessions = CourseSessionSerializer(many=True, read_only=True)

    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ['sessions', 'created_at', 'updated_at']


class CourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'tutor', 'subject',
            'total_sessions', 'session_duration_minutes',
            'schedule_time', 'start_date', 'end_date', 'hourly_rate'
        ]

    def create(self, validated_data):
        course = super().create(validated_data)
        # Auto-create session slots
        for i in range(1, course.total_sessions + 1):
            CourseSession.objects.create(
                course=course,
                session_number=i,
                title=f"Buổi {i}"
            )
        return course


class StudyRoomMaterialSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyRoomMaterial
        fields = [
            'id', 'material_type', 'title', 'content', 'file', 'file_url',
            's3_key', 'file_size', 'content_type', 'upload_status', 'created_at'
        ]
        read_only_fields = ['id', 'file_url', 's3_key', 'file_size', 'content_type', 'upload_status', 'created_at']

    def get_file_url(self, obj):
        if obj.external_url:
            return obj.external_url
        if obj.file:
            request = self.context.get('request')
            if request:
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
            'id', 'session_number', 'title', 'scheduled_at', 'content_text',
            'materials', 'read_students', 'is_read', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'read_students', 'is_read', 'created_at', 'updated_at']

    def get_read_students(self, obj):
        return [
            {
                'id': item.student_id,
                'name': item.student.get_full_name() or item.student.username or item.student.email,
                'read_at': item.read_at,
            }
            for item in obj.reads.select_related('student').all()
        ]

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.reads.filter(student=request.user).exists()


class StudyRoomListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.full_name', read_only=True)
    student_count = serializers.IntegerField(source='students.count', read_only=True)
    session_count = serializers.IntegerField(source='room_sessions.count', read_only=True)

    class Meta:
        model = StudyRoom
        fields = [
            'id', 'title', 'description', 'subject', 'subject_name',
            'tutor_name', 'student_count', 'session_count',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tutor_name', 'student_count', 'session_count', 'created_at', 'updated_at']


class StudyRoomDetailSerializer(StudyRoomListSerializer):
    students = UserSerializer(many=True, read_only=True)
    sessions = serializers.SerializerMethodField()

    class Meta(StudyRoomListSerializer.Meta):
        fields = StudyRoomListSerializer.Meta.fields + ['students', 'sessions']

    def get_sessions(self, obj):
        sessions = obj.room_sessions.prefetch_related('materials', 'reads__student').all()
        return StudyRoomSessionSerializer(sessions, many=True, context=self.context).data


class StudyRoomStudentAddSerializer(serializers.Serializer):
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
