from django.db import models
from django.conf import settings
from apps.tutors.models import TutorProfile, Subject


class Booking(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
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
    study_start_date = models.DateField(null=True, blank=True)
    study_end_date = models.DateField(null=True, blank=True)
    selected_schedules = models.JSONField(default=list, blank=True)
    selected_slot_ids = models.JSONField(default=list, blank=True)
    student_info = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default="unpaid"
    )
    payos_order_code = models.BigIntegerField(null=True, blank=True, unique=True)
    payos_payment_link_id = models.CharField(max_length=100, blank=True)
    payment_checkout_url = models.URLField(max_length=1000, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
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
            models.Index(
                fields=["tutor", "status", "start_time"],
                name="bookings_te_tutor_i_0dde58_idx",
            ),
        ]

    def __str__(self):
        return f"{self.tutor.user.username}: {self.start_time} - {self.end_time}"
