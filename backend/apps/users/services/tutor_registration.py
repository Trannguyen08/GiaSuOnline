from django.contrib.auth import get_user_model
from django.db import transaction

from apps.tutors.models import TutorProfile as TeachingProfile

from ..models import TutorAchievement, TutorProfile
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
    required_fields = ['full_name', 'phone', 'email', 'university', 'qualification', 'password', 'address']
    missing_fields = [field for field in required_fields if not data.get(field)]
    missing_files = [field for field in ['id_front', 'id_back', 'degree'] if not files.get(field)]

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

        profile = TutorProfile.objects.create(
            user=user,
            full_name=data.get('full_name'),
            birthday=data.get('birthday') or None,
            university=data.get('university'),
            qualification=data.get('qualification'),
            address=data.get('address'),
            id_front=files.get('id_front'),
            id_back=files.get('id_back'),
            degree_image=files.get('degree'),
            status='PENDING',
        )

        for file in files.getlist('achievements'):
            TutorAchievement.objects.create(tutor=profile, image=file)

    send_tutor_registration_pending_email.delay(user.email, profile.full_name)
    return profile


def approve_tutor_registration(profile):
    profile.status = 'APPROVED'
    profile.user.is_verified = True
    profile.user.save(update_fields=['is_verified'])
    profile.save(update_fields=['status'])

    TeachingProfile.objects.get_or_create(
        user=profile.user,
        defaults={
            'full_name': profile.full_name,
            'title': profile.qualification,
            'location': profile.address,
        },
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
