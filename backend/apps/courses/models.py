from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.tutors.models import TutorProfile, Subject


class Course(models.Model):
    """Khóa học - hợp đồng học giữa student và tutor"""
    STATUS_CHOICES = [
        ('active', 'Đang học'),
        ('completed', 'Hoàn thành'),
        ('paused', 'Tạm dừng'),
        ('cancelled', 'Đã hủy'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrolled_courses'
    )
    tutor = models.ForeignKey(
        TutorProfile,
        on_delete=models.CASCADE,
        related_name='teaching_courses'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_sessions = models.PositiveIntegerField(default=0)  # Tổng số buổi
    session_duration_minutes = models.PositiveIntegerField(default=60)  # Thời lượng mỗi buổi (phút)
    schedule_time = models.CharField(max_length=100, blank=True)  # VD: "Thứ 2, 4 - 18:00"
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.student.username}"

    @property
    def completed_sessions_count(self):
        return self.sessions.filter(student_completed=True).count()

    @property
    def this_week_sessions_count(self):
        from datetime import date, timedelta
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        return self.sessions.filter(
            scheduled_date__range=[start_of_week, end_of_week]
        ).count()


class CourseSession(models.Model):
    """Buổi học trong một khóa học"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sessions')
    session_number = models.PositiveIntegerField()  # Buổi thứ mấy
    title = models.CharField(max_length=255, blank=True)  # VD: "Buổi 1: Giới thiệu"
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_time = models.TimeField(null=True, blank=True)
    student_completed = models.BooleanField(default=False)
    student_completed_at = models.DateTimeField(null=True, blank=True)
    tutor_notes = models.TextField(blank=True)  # Ghi chú của gia sư
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['session_number']
        unique_together = [['course', 'session_number']]

    def __str__(self):
        return f"Buổi {self.session_number} - {self.course.title}"

    def mark_completed(self):
        self.student_completed = True
        self.student_completed_at = timezone.now()
        self.save()


class SessionMaterial(models.Model):
    """Tài liệu/file gia sư upload cho buổi học"""
    MATERIAL_TYPES = [
        ('note', 'Ghi chú'),
        ('image', 'Hình ảnh'),
        ('file', 'File tài liệu'),
        ('link', 'Đường dẫn'),
    ]

    session = models.ForeignKey(CourseSession, on_delete=models.CASCADE, related_name='materials')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, default='note')
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField(blank=True)  # Cho text/note/link
    file = models.FileField(upload_to='session_materials/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_material_type_display()} - {self.session}"
