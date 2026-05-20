from django.conf import settings
from django.db import models


class AIReview(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    class RiskLevel(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    tutor = models.ForeignKey(
        settings.TUTOR_MODEL, on_delete=models.CASCADE, related_name="ai_reviews"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    pass_score = models.PositiveSmallIntegerField(default=0)
    risk_level = models.CharField(
        max_length=20, choices=RiskLevel.choices, default=RiskLevel.HIGH
    )
    good_points = models.JSONField(default=list, blank=True)
    bad_points = models.JSONField(default=list, blank=True)
    missing_fields = models.JSONField(default=list, blank=True)
    warning_flags = models.JSONField(default=list, blank=True)
    admin_suggestion = models.TextField(blank=True)
    raw_ocr_result = models.JSONField(null=True, blank=True)
    raw_ai_result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"AIReview #{self.pk} - {self.tutor}"
