from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

from apps.tutors.models import Subject, TutorProfile as TeachingProfile, TutorSubject

from ..models import TutorAchievement, TutorDegreeImage, TutorProfile
from ..tasks import (
    send_tutor_registration_pending_email,
    send_tutor_registration_result_email,
)

User = get_user_model()


def _unique_username(email):
    username = email.split('@')[0]
    base_username = username
    counter = 1

    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    return username


def register_tutor(data, files):
    email = data.get('email')
    password = data.get('password')
    required_fields = [
        'full_name', 'phone', 'email', 'university', 'qualification',
        'password', 'address', 'subjects_text', 'teaching_region'
    ]
    missing_fields = [field for field in required_fields if not data.get(field)]
    degree_files = files.getlist('degrees') or ([files.get('degree')] if files.get('degree') else [])
    missing_files = [field for field in ['id_front', 'id_back'] if not files.get(field)]
    if not degree_files:
        missing_files.append('degrees')
    teaching_levels = data.getlist('teaching_levels') if hasattr(data, 'getlist') else data.get('teaching_levels', [])
    if not teaching_levels:
        missing_fields.append('teaching_levels')

    if missing_fields or missing_files:
        missing = ', '.join(missing_fields + missing_files)
        raise ValueError(f'Thieu thong tin bat buoc: {missing}.')

    if data.get('password_confirm') and data.get('password_confirm') != password:
        raise ValueError('Mat khau xac nhan khong khop.')

    if User.objects.filter(email=email).exists():
        raise ValueError('Email nay da duoc dang ky.')

    with transaction.atomic():
        user = User.objects.create_user(
            username=_unique_username(email),
            email=email,
            password=password,
            phone=data.get('phone', ''),
            is_tutor=True,
            is_active=True,
            is_verified=False,
        )
        if files.get('avatar'):
            user.avatar = files.get('avatar')
            user.save(update_fields=['avatar'])

        profile = TutorProfile.objects.create(
            user=user,
            full_name=data.get('full_name'),
            birthday=data.get('birthday') or None,
            university=data.get('university'),
            qualification=data.get('qualification'),
            address=data.get('address'),
            subjects_text=data.get('subjects_text', ''),
            experience_years=int(data.get('experience_years') or 0),
            teaching_levels=teaching_levels,
            teaching_region=data.get('teaching_region', ''),
            id_front=files.get('id_front'),
            id_back=files.get('id_back'),
            degree_image=degree_files[0],
            status='PENDING',
        )

        for file in degree_files:
            TutorDegreeImage.objects.create(tutor=profile, image=file)

        for file in files.getlist('achievements'):
            TutorAchievement.objects.create(tutor=profile, image=file)

    send_tutor_registration_pending_email.delay(user.email, profile.full_name)
    return profile


def _subject_names(subjects_text):
    names = []
    for raw in subjects_text.replace(';', ',').replace('\n', ',').split(','):
        name = raw.strip()
        if name and name.lower() not in [item.lower() for item in names]:
            names.append(name)
    return names


def approve_tutor_registration(profile):
    profile.status = 'APPROVED'
    profile.user.is_verified = True
    profile.user.save(update_fields=['is_verified'])
    profile.save(update_fields=['status'])

    teaching_profile, _ = TeachingProfile.objects.get_or_create(
        user=profile.user,
        defaults={
            'full_name': profile.full_name,
            'title': profile.qualification,
            'location': profile.teaching_region or profile.address,
            'experience_years': profile.experience_years,
        },
    )
    teaching_profile.full_name = profile.full_name
    teaching_profile.title = profile.qualification
    teaching_profile.location = profile.teaching_region or profile.address
    teaching_profile.experience_years = profile.experience_years
    teaching_profile.save(update_fields=['full_name', 'title', 'location', 'experience_years'])

    level = ', '.join(profile.teaching_levels or []) or 'Mọi trình độ'
    for name in _subject_names(profile.subjects_text):
        slug = slugify(name)
        subject, _ = Subject.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'category': 'Gia sư đăng ký'},
        )
        TutorSubject.objects.get_or_create(
            tutor=teaching_profile,
            subject=subject,
            defaults={'level': level, 'hourly_rate': 0},
        )

    send_tutor_registration_result_email.delay(profile.user.email, profile.full_name, True)
    return profile


def reject_tutor_registration(profile, reason=''):
    profile.status = 'REJECTED'
    profile.save(update_fields=['status'])
    send_tutor_registration_result_email.delay(
        profile.user.email,
        profile.full_name,
        False,
        reason,
    )
    return profile
