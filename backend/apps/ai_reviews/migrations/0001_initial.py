from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.TUTOR_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AIReview",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("COMPLETED", "Completed"),
                            ("FAILED", "Failed"),
                        ],
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("pass_score", models.PositiveSmallIntegerField(default=0)),
                (
                    "risk_level",
                    models.CharField(
                        choices=[
                            ("LOW", "Low"),
                            ("MEDIUM", "Medium"),
                            ("HIGH", "High"),
                        ],
                        default="HIGH",
                        max_length=20,
                    ),
                ),
                ("good_points", models.JSONField(blank=True, default=list)),
                ("bad_points", models.JSONField(blank=True, default=list)),
                ("missing_fields", models.JSONField(blank=True, default=list)),
                ("warning_flags", models.JSONField(blank=True, default=list)),
                ("admin_suggestion", models.TextField(blank=True)),
                ("raw_ocr_result", models.JSONField(blank=True, null=True)),
                ("raw_ai_result", models.JSONField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_reviews",
                        to=settings.TUTOR_MODEL,
                    ),
                ),
            ],
        ),
    ]
