from rest_framework import serializers
from .models import (
    TutorProfile, Subject, TutorSubject, 
    TutorEducation, TutorCertification, TutorFAQ, 
    TutorDocument
)

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

class TutorProfileSerializer(serializers.ModelSerializer):
    tutor_subjects = TutorSubjectSerializer(many=True, required=False)
    educations = TutorEducationSerializer(many=True, required=False)
    certifications = TutorCertificationSerializer(many=True, required=False)
    faqs = TutorFAQSerializer(many=True, required=False)
    
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        model = TutorProfile
        fields = [
            'id', 'username', 'email', 'avatar', 'full_name', 'title', 'bio',
            'experience_years', 'tutor_subjects', 'educations', 
            'certifications', 'faqs', 'rating_avg', 'total_reviews', 
            'is_available', 'location', 'teaching_mode'
        ]
        read_only_fields = ['rating_avg', 'total_reviews']

    def update(self, instance, validated_data):
        # Handle nested data
        tutor_subjects_data = validated_data.pop('tutor_subjects', None)
        educations_data = validated_data.pop('educations', None)
        certifications_data = validated_data.pop('certifications', None)
        faqs_data = validated_data.pop('faqs', None)

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

        return instance
