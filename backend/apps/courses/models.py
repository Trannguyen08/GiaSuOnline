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

    @property
    def can_student_review(self):
        return bool(self.end_date and self.end_date < timezone.localdate() and not hasattr(self, 'review'))


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
        ('video', 'Video'),
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
    s3_key = models.CharField(max_length=500, blank=True)
    external_url = models.URLField(max_length=1000, blank=True)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    content_type = models.CharField(max_length=255, blank=True)
    upload_status = models.CharField(
        max_length=20,
        choices=[('ready', 'Ready'), ('pending', 'Pending')],
        default='ready'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_material_type_display()} - {self.session}"


class StudyRoom(models.Model):
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='study_rooms')
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='StudyRoomStudent',
        related_name='study_rooms'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class StudyRoomStudent(models.Model):
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='memberships')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='room_memberships')
    invited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['room', 'student']]

    def __str__(self):
        return f"{self.student.email} in {self.room.title}"


class StudyRoomSession(models.Model):
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='room_sessions')
    session_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=255)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    content_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['session_number', 'created_at']
        unique_together = [['room', 'session_number']]

    def __str__(self):
        return f"{self.room.title} - {self.title}"


class StudyRoomMaterial(models.Model):
    MATERIAL_TYPES = [
        ('file', 'File'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('link', 'Link'),
    ]

    session = models.ForeignKey(StudyRoomSession, on_delete=models.CASCADE, related_name='materials')
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPES, default='file')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    file = models.FileField(upload_to='study_room_materials/', null=True, blank=True)
    s3_key = models.CharField(max_length=500, blank=True)
    external_url = models.URLField(max_length=1000, blank=True)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    content_type = models.CharField(max_length=255, blank=True)
    upload_status = models.CharField(
        max_length=20,
        choices=[('ready', 'Ready'), ('pending', 'Pending')],
        default='ready'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.title


class StudyRoomRead(models.Model):
    session = models.ForeignKey(StudyRoomSession, on_delete=models.CASCADE, related_name='reads')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_room_reads')
    read_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['session', 'student']]

    def __str__(self):
        return f"{self.student.email} read {self.session.title}"


class CourseReview(models.Model):
    course = models.OneToOneField(Course, on_delete=models.CASCADE, related_name='review')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_reviews')
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name='course_reviews')
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review {self.rating}/5 for {self.course.title}"


class CourseExtensionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='extension_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_extension_requests')
    requested_end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    tutor_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Extend {self.course_id} to {self.requested_end_date}"
