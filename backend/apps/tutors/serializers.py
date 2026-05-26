from decimal import Decimal

from rest_framework import serializers
from .models import (
    TutorProfile,
    TutorGuaranteeTransaction,
    Subject,
    TutorSubject,
    TutorEducation,
    TutorCertification,
    TutorFAQ,
    TutorDocument,
)
from apps.users.models import TutorAchievement


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "category"]


class TutorSubjectSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = TutorSubject
        fields = ["id", "subject", "subject_name", "level", "hourly_rate", "is_active"]


class TutorEducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorEducation
        fields = ["id", "degree", "school", "years"]


class TutorCertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorCertification
        fields = ["id", "title", "organization", "year"]


class TutorFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorFAQ
        fields = ["id", "question", "answer"]


class TutorDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorDocument
        fields = ["id", "file", "file_url", "document_type", "is_verified"]
        read_only_fields = ["id", "file_url", "is_verified"]

    def get_file_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        url = obj.file.url
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class TutorAchievementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorAchievement
        fields = ["id", "image_url", "description"]

    def get_image_url(self, obj):
        if not obj.image:
            return ""
        request = self.context.get("request")
        url = obj.image.url
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class TutorProfileSerializer(serializers.ModelSerializer):
    tutor_subjects = TutorSubjectSerializer(many=True, required=False)
    educations = TutorEducationSerializer(many=True, required=False)
    certifications = TutorCertificationSerializer(many=True, required=False)
    faqs = TutorFAQSerializer(many=True, required=False)
    documents = TutorDocumentSerializer(many=True, required=False)
    achievements = serializers.SerializerMethodField()
    university = serializers.SerializerMethodField()
    qualification = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    teaching_levels = serializers.SerializerMethodField()
    teaching_region = serializers.SerializerMethodField()
    birthday = serializers.SerializerMethodField()
    cccd_number = serializers.SerializerMethodField()
    subjects_text = serializers.SerializerMethodField()
    id_front_url = serializers.SerializerMethodField()
    id_back_url = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.ImageField(source="user.avatar", read_only=True)

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "avatar",
            "avatar_url",
            "full_name",
            "title",
            "bio",
            "experience_years",
            "tutor_subjects",
            "educations",
            "certifications",
            "faqs",
            "rating_avg",
            "total_reviews",
            "is_available",
            "guarantee_deposit_balance",
            "commission_debt",
            "new_class_locked",
            "new_class_lock_reason",
            "location",
            "teaching_mode",
            "documents",
            "achievements",
            "university",
            "qualification",
            "address",
            "birthday",
            "cccd_number",
            "subjects_text",
            "teaching_levels",
            "teaching_region",
            "id_front_url",
            "id_back_url",
        ]
        read_only_fields = [
            "rating_avg",
            "total_reviews",
            "guarantee_deposit_balance",
            "commission_debt",
            "new_class_locked",
            "new_class_lock_reason",
            "achievements",
            "university",
            "qualification",
            "address",
            "birthday",
            "cccd_number",
            "subjects_text",
            "teaching_levels",
            "teaching_region",
            "id_front_url",
            "id_back_url",
            "avatar_url",
        ]

    def _registration_profile(self, obj):
        return getattr(obj.user, "tutor_profile", None)

    def _file_url(self, field):
        if not field:
            return ""
        request = self.context.get("request")
        url = field.url
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )

    def get_university(self, obj):
        registration = self._registration_profile(obj)
        return registration.university if registration else ""

    def get_qualification(self, obj):
        registration = self._registration_profile(obj)
        return registration.qualification if registration else ""

    def get_address(self, obj):
        registration = self._registration_profile(obj)
        return registration.address if registration else ""

    def get_teaching_levels(self, obj):
        registration = self._registration_profile(obj)
        return registration.teaching_levels if registration else []

    def get_teaching_region(self, obj):
        registration = self._registration_profile(obj)
        return registration.teaching_region if registration else obj.location

    def get_birthday(self, obj):
        registration = self._registration_profile(obj)
        return registration.birthday if registration else None

    def get_cccd_number(self, obj):
        registration = self._registration_profile(obj)
        return registration.cccd_number if registration else ""

    def get_subjects_text(self, obj):
        registration = self._registration_profile(obj)
        return registration.subjects_text if registration else ""

    def get_id_front_url(self, obj):
        registration = self._registration_profile(obj)
        return self._file_url(registration.id_front) if registration else ""

    def get_id_back_url(self, obj):
        registration = self._registration_profile(obj)
        return self._file_url(registration.id_back) if registration else ""

    def get_avatar_url(self, obj):
        return self._file_url(obj.user.avatar)

    def get_achievements(self, obj):
        registration = self._registration_profile(obj)
        if not registration:
            return []
        return TutorAchievementSerializer(
            registration.achievements.all(),
            many=True,
            context=self.context,
        ).data

    def update(self, instance, validated_data):
        # Handle nested data
        tutor_subjects_data = validated_data.pop("tutor_subjects", None)
        educations_data = validated_data.pop("educations", None)
        certifications_data = validated_data.pop("certifications", None)
        faqs_data = validated_data.pop("faqs", None)
        documents_data = validated_data.pop("documents", None)

        # Update main profile
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tutor_subjects_data is not None:
            for item in tutor_subjects_data:
                subject_id = item.get("subject")
                if not subject_id:
                    continue
                subject_obj = subject_id
                item_id = item.get("id")
                defaults = {
                    "subject": subject_obj,
                    "level": item.get("level", ""),
                    "hourly_rate": item.get("hourly_rate", 0),
                    "is_active": item.get("is_active", True),
                }
                if item_id:
                    TutorSubject.objects.filter(id=item_id, tutor=instance).update(
                        **defaults
                    )
                else:
                    TutorSubject.objects.update_or_create(
                        tutor=instance,
                        subject=subject_obj,
                        defaults=defaults,
                    )

        # Update Educations
        if educations_data is not None:
            instance.educations.all().delete()
            for item in educations_data:
                TutorEducation.objects.create(tutor=instance, **item)

        # Update Certifications
        if certifications_data is not None:
            instance.certifications.all().delete()
            for item in certifications_data:
                TutorCertification.objects.create(tutor=instance, **item)

        # Update FAQs
        if faqs_data is not None:
            instance.faqs.all().delete()
            for item in faqs_data:
                TutorFAQ.objects.create(tutor=instance, **item)

        if documents_data is not None:
            instance.documents.all().delete()
            for item in documents_data:
                TutorDocument.objects.create(tutor=instance, **item)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("include_inactive_subjects"):
            data["tutor_subjects"] = [
                item
                for item in data.get("tutor_subjects", [])
                if item.get("is_active") is not False
            ]
        return data


class TutorGuaranteeTransactionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = TutorGuaranteeTransaction
        fields = [
            "id",
            "transaction_type",
            "amount",
            "balance_after",
            "debt_after",
            "course",
            "course_title",
            "note",
            "created_at",
        ]


class TutorGuaranteeStatusSerializer(serializers.ModelSerializer):
    required_deposit = serializers.SerializerMethodField()
    can_receive_new_classes = serializers.SerializerMethodField()
    recent_transactions = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "guarantee_deposit_balance",
            "required_deposit",
            "commission_debt",
            "new_class_locked",
            "new_class_lock_reason",
            "can_receive_new_classes",
            "recent_transactions",
        ]

    def get_required_deposit(self, obj):
        from .services.guarantee import get_required_deposit

        return get_required_deposit()

    def get_can_receive_new_classes(self, obj):
        from .services.guarantee import can_receive_new_classes

        return can_receive_new_classes(obj)

    def get_recent_transactions(self, obj):
        transactions = obj.guarantee_transactions.select_related("course").all()[:20]
        return TutorGuaranteeTransactionSerializer(transactions, many=True).data


class MoneyAmountSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal("0.01")
    )
    note = serializers.CharField(required=False, allow_blank=True)
