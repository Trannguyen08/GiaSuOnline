from rest_framework import serializers
from .models import Course, CourseSession, SessionMaterial
from apps.tutors.models import TutorProfile


class SessionMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SessionMaterial
        fields = ['id', 'material_type', 'title', 'content', 'file', 'file_url', 'uploaded_by_name', 'created_at']
        read_only_fields = ['id', 'uploaded_by_name', 'created_at', 'file_url']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
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
