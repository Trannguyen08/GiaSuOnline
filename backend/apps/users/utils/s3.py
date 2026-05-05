import boto3
import uuid
from django.conf import settings
from botocore.exceptions import ClientError

def upload_file_to_s3(file, folder="tutors"):
    """
    Uploads a file to an S3 bucket and returns the public URL.
    """
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    
    file_extension = file.name.split('.')[-1]
    file_name = f"{folder}/{uuid.uuid4()}.{file_extension}"
    
    try:
        s3_client.upload_fileobj(
            file,
            settings.AWS_STORAGE_BUCKET_NAME,
            file_name,
            ExtraArgs={'ACL': 'public-read', 'ContentType': file.content_type}
        )
        
        # Construct the URL
        if settings.AWS_S3_CUSTOM_DOMAIN:
            url = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{file_name}"
        else:
            url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{file_name}"
            
        return url
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        return None
