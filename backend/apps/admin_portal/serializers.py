from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.models import TutorProfile as UserTutorProfile, TutorAchievement
from apps.tutors.models import TutorProfile as TeachingProfile, TutorSubject, Subject

User = get_user_model()

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'is_tutor', 'is_active', 'is_verified', 'is_staff', 'created_at']

class AdminTutorSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    class Meta:
        model = TutorSubject
        fields = ['id', 'subject', 'subject_name', 'level', 'hourly_rate']

class AdminTutorProfileSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    subjects = AdminTutorSubjectSerializer(source='tutor_subjects', many=True, read_only=True)
    registration_status = serializers.CharField(source='user.tutor_profile.status', read_only=True)
    university = serializers.CharField(source='user.tutor_profile.university', read_only=True)
    qualification = serializers.CharField(source='user.tutor_profile.qualification', read_only=True)

    class Meta:
        model = TeachingProfile
        fields = [
            'id', 'user', 'full_name', 'title', 'bio', 'experience_years', 
            'rating_avg', 'total_reviews', 'is_available', 'location', 
            'teaching_mode', 'subjects', 'registration_status', 
            'university', 'qualification'
        ]

class AdminTutorRegistrationSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    achievements = serializers.StringRelatedField(many=True, read_only=True)
    
    class Meta:
        model = UserTutorProfile
        fields = '__all__'
