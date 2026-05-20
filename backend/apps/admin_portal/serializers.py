from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.models import (
    TutorProfile as UserTutorProfile,
    TutorAchievement,
    TutorDegreeImage,
)
from apps.tutors.models import TutorProfile as TeachingProfile, TutorSubject

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "is_tutor",
            "is_active",
            "is_verified",
            "is_staff",
            "created_at",
        ]


class AdminTutorSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source="subject.name")

    class Meta:
        model = TutorSubject
        fields = ["id", "subject", "subject_name", "level", "hourly_rate"]


class AdminTutorProfileSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    subjects = AdminTutorSubjectSerializer(
        source="tutor_subjects", many=True, read_only=True
    )
    registration_status = serializers.CharField(
        source="user.tutor_profile.status", read_only=True
    )
    university = serializers.CharField(
        source="user.tutor_profile.university", read_only=True
    )
    qualification = serializers.CharField(
        source="user.tutor_profile.qualification", read_only=True
    )

    class Meta:
        model = TeachingProfile
        fields = [
            "id",
            "user",
            "full_name",
            "title",
            "bio",
            "experience_years",
            "rating_avg",
            "total_reviews",
            "is_available",
            "location",
            "teaching_mode",
            "subjects",
            "registration_status",
            "university",
            "qualification",
        ]


class AdminTutorAchievementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorAchievement
        fields = ["id", "image_url", "description"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url if obj.image else ""
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class AdminTutorDegreeImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorDegreeImage
        fields = ["id", "image_url", "description"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url if obj.image else ""
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class AdminTutorRegistrationSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    user_email = serializers.ReadOnlyField(source="user.email")
    registration_status = serializers.CharField(source="status", read_only=True)
    subjects = serializers.SerializerMethodField()
    experience_years = serializers.SerializerMethodField()
    id_front_url = serializers.SerializerMethodField()
    id_back_url = serializers.SerializerMethodField()
    degree_image_url = serializers.SerializerMethodField()
    degree_images = AdminTutorDegreeImageSerializer(many=True, read_only=True)
    achievements = AdminTutorAchievementSerializer(many=True, read_only=True)

    class Meta:
        model = UserTutorProfile
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "birthday",
            "university",
            "qualification",
            "bio",
            "address",
            "subjects_text",
            "experience_years",
            "teaching_levels",
            "teaching_region",
            "id_front_url",
            "id_back_url",
            "degree_image_url",
            "degree_images",
            "achievements",
            "status",
            "registration_status",
            "subjects",
            "created_at",
        ]

    def _file_url(self, field):
        if not field:
            return ""
        request = self.context.get("request")
        url = field.url
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )

    def get_id_front_url(self, obj):
        return self._file_url(obj.id_front)

    def get_id_back_url(self, obj):
        return self._file_url(obj.id_back)

    def get_degree_image_url(self, obj):
        return self._file_url(obj.degree_image)

    def get_subjects(self, obj):
        teaching_profile = getattr(obj.user, "teaching_profile", None)
        if not teaching_profile:
            return []
        return AdminTutorSubjectSerializer(
            teaching_profile.tutor_subjects.all(), many=True
        ).data

    def get_experience_years(self, obj):
        teaching_profile = getattr(obj.user, "teaching_profile", None)
        return (
            teaching_profile.experience_years
            if teaching_profile
            else obj.experience_years
        )
