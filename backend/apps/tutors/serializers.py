from rest_framework import serializers
from .models import (
    TutorProfile, Subject, TutorSubject, 
    TutorEducation, TutorCertification, TutorFAQ, 
    TutorDocument
)
from apps.users.models import TutorAchievement, TutorDegreeImage

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'slug', 'category']

class TutorSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = TutorSubject
        fields = ['id', 'subject', 'subject_name', 'level', 'hourly_rate']

class TutorEducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorEducation
        fields = ['id', 'degree', 'school', 'years']

class TutorCertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorCertification
        fields = ['id', 'title', 'organization', 'year']

class TutorFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorFAQ
        fields = ['id', 'question', 'answer']

class TutorDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorDocument
        fields = ['id', 'file', 'file_url', 'document_type', 'is_verified']
        read_only_fields = ['id', 'file_url', 'is_verified']

    def get_file_url(self, obj):
        if not obj.file:
            return ''
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url

class TutorAchievementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorAchievement
        fields = ['id', 'image_url', 'description']

    def get_image_url(self, obj):
        if not obj.image:
            return ''
        request = self.context.get('request')
        url = obj.image.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url

class TutorDegreeImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorDegreeImage
        fields = ['id', 'image_url', 'description']

    def get_image_url(self, obj):
        if not obj.image:
            return ''
        request = self.context.get('request')
        url = obj.image.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url

class TutorProfileSerializer(serializers.ModelSerializer):
    tutor_subjects = TutorSubjectSerializer(many=True, required=False)
    educations = TutorEducationSerializer(many=True, required=False)
    certifications = TutorCertificationSerializer(many=True, required=False)
    faqs = TutorFAQSerializer(many=True, required=False)
    documents = TutorDocumentSerializer(many=True, required=False)
    achievements = serializers.SerializerMethodField()
    degree_images = serializers.SerializerMethodField()
    degree_image_url = serializers.SerializerMethodField()
    university = serializers.SerializerMethodField()
    qualification = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    teaching_levels = serializers.SerializerMethodField()
    teaching_region = serializers.SerializerMethodField()
    
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        model = TutorProfile
        fields = [
            'id', 'username', 'email', 'avatar', 'full_name', 'title', 'bio',
            'experience_years', 'tutor_subjects', 'educations', 
            'certifications', 'faqs', 'rating_avg', 'total_reviews', 
            'is_available', 'location', 'teaching_mode', 'documents',
            'achievements', 'degree_images', 'degree_image_url', 'university', 'qualification',
            'address', 'teaching_levels', 'teaching_region'
        ]
        read_only_fields = [
            'rating_avg', 'total_reviews', 'achievements', 'degree_images', 'degree_image_url',
            'university', 'qualification', 'address', 'teaching_levels', 'teaching_region'
        ]

    def _registration_profile(self, obj):
        return getattr(obj.user, 'tutor_profile', None)

    def _file_url(self, field):
        if not field:
            return ''
        request = self.context.get('request')
        url = field.url
        return request.build_absolute_uri(url) if request and url.startswith('/') else url

    def get_degree_image_url(self, obj):
        registration = self._registration_profile(obj)
        return self._file_url(registration.degree_image) if registration else ''

    def get_university(self, obj):
        registration = self._registration_profile(obj)
        return registration.university if registration else ''

    def get_qualification(self, obj):
        registration = self._registration_profile(obj)
        return registration.qualification if registration else ''

    def get_address(self, obj):
        registration = self._registration_profile(obj)
        return registration.address if registration else ''

    def get_teaching_levels(self, obj):
        registration = self._registration_profile(obj)
        return registration.teaching_levels if registration else []

    def get_teaching_region(self, obj):
        registration = self._registration_profile(obj)
        return registration.teaching_region if registration else obj.location

    def get_achievements(self, obj):
        registration = self._registration_profile(obj)
        if not registration:
            return []
        return TutorAchievementSerializer(
            registration.achievements.all(),
            many=True,
            context=self.context,
        ).data

    def get_degree_images(self, obj):
        registration = self._registration_profile(obj)
        if not registration:
            return []
        images = registration.degree_images.all()
        if images.exists():
            return TutorDegreeImageSerializer(images, many=True, context=self.context).data
        if registration.degree_image:
            return [{'id': None, 'image_url': self._file_url(registration.degree_image), 'description': ''}]
        return []

    def update(self, instance, validated_data):
        # Handle nested data
        tutor_subjects_data = validated_data.pop('tutor_subjects', None)
        educations_data = validated_data.pop('educations', None)
        certifications_data = validated_data.pop('certifications', None)
        faqs_data = validated_data.pop('faqs', None)
        documents_data = validated_data.pop('documents', None)

        # Update main profile
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update TutorSubjects
        if tutor_subjects_data is not None:
            instance.tutor_subjects.all().delete()
            for item in tutor_subjects_data:
                TutorSubject.objects.create(tutor=instance, **item)

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
