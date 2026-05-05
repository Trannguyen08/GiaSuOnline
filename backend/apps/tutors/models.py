from django.db import models
from django.conf import settings

class Subject(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class TutorProfile(models.Model):
    TEACHING_MODES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('both', 'Both')
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tutor_profile')
    subjects = models.ManyToManyField(Subject, related_name='tutors')
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    experience_years = models.PositiveIntegerField(default=0)
    education = models.TextField()
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_reviews = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    location = models.CharField(max_length=255, blank=True)
    teaching_mode = models.CharField(max_length=20, choices=TEACHING_MODES, default='online')

    def __str__(self):
        return f"TutorProfile for {self.user.username}"

class TutorDocument(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to='tutor_documents/')
    document_type = models.CharField(max_length=100)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.document_type} for {self.tutor.user.username}"
