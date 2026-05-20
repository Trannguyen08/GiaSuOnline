from django.db import models
from django.conf import settings
from apps.tutors.models import TutorProfile, Subject


class Booking(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_bookings",
    )
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="tutor_bookings"
    )
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    teaching_slot = models.OneToOneField(
        "TeachingSlot",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking {self.id} by {self.student.username}"


class Review(models.Model):
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name="review"
    )
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for Booking {self.booking.id}"


class TutorAvailability(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="availabilities"
    )
    day_of_week = models.IntegerField()  # 0=Monday, 6=Sunday
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"Availability for {self.tutor.user.username} on {self.day_of_week}"


class TeachingSlot(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("booked", "Booked"),
        ("cancelled", "Cancelled"),
    ]

    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="teaching_slots"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    meeting_link = models.URLField(blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="available"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time"]
        indexes = [
            models.Index(fields=["tutor", "status", "start_time"]),
        ]

    def __str__(self):
        return f"{self.tutor.user.username}: {self.start_time} - {self.end_time}"
