import uuid
from pathlib import Path

import boto3
from django.conf import settings
from django.utils.text import get_valid_filename


def material_limits():
    direct_max = settings.SESSION_MATERIAL_DIRECT_UPLOAD_MAX_MB * 1024 * 1024
    presigned_max = settings.SESSION_MATERIAL_PRESIGNED_UPLOAD_MAX_MB * 1024 * 1024
    return direct_max, presigned_max


def validate_material_upload(content_type, size, allow_presigned=False):
    _, presigned_max = material_limits()
    direct_max, _ = material_limits()
    max_size = presigned_max if allow_presigned else direct_max

    if content_type not in settings.SESSION_MATERIAL_ALLOWED_TYPES:
        return f"File type {content_type or 'unknown'} is not allowed."
    if size and int(size) > max_size:
        max_mb = settings.SESSION_MATERIAL_PRESIGNED_UPLOAD_MAX_MB if allow_presigned else settings.SESSION_MATERIAL_DIRECT_UPLOAD_MAX_MB
        return f"File exceeds {max_mb}MB limit."
    return None


def build_material_key(folder, filename):
    safe_name = get_valid_filename(Path(filename).name or 'material')
    return f"media/{folder}/{uuid.uuid4()}-{safe_name}"


def public_s3_url(key):
    custom_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', '')
    if custom_domain:
        return f"https://{custom_domain}/{key}"
    return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}"


def s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def create_presigned_post(key, content_type, size):
    error = validate_material_upload(content_type, size, allow_presigned=True)
    if error:
        raise ValueError(error)

    fields = {
        'Content-Type': content_type,
        'acl': getattr(settings, 'AWS_S3_UPLOAD_ACL', 'public-read'),
    }
    conditions = [
        {'Content-Type': content_type},
        {'acl': fields['acl']},
        ['content-length-range', 1, settings.SESSION_MATERIAL_PRESIGNED_UPLOAD_MAX_MB * 1024 * 1024],
    ]
    return s3_client().generate_presigned_post(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=key,
        Fields=fields,
        Conditions=conditions,
        ExpiresIn=getattr(settings, 'AWS_PRESIGNED_URL_EXPIRES_SECONDS', 900),
    )
