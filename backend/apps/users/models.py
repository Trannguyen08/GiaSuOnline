from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager

class CustomUserManager(UserManager):
    pass

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_tutor = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    google_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class TutorProfile(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Đang chờ duyệt'),
        ('APPROVED', 'Đã duyệt'),
        ('REJECTED', 'Đã từ chối'),
    )

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='tutor_profile')
    full_name = models.CharField(max_length=255)
    birthday = models.DateField(null=True, blank=True)
    university = models.CharField(max_length=255)
    qualification = models.CharField(max_length=100) # Sinh viên, Cử nhân, v.v.
    address = models.TextField()
    
    # Document links (S3 URLs)
    id_front = models.URLField(max_length=500, null=True, blank=True)
    id_back = models.URLField(max_length=500, null=True, blank=True)
    degree_image = models.URLField(max_length=500, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Tutor: {self.full_name} ({self.user.email})"

class TutorAchievement(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='achievements')
    image_url = models.URLField(max_length=500)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Achievement for {self.tutor.full_name}"

class OTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.email} - {self.code}"
