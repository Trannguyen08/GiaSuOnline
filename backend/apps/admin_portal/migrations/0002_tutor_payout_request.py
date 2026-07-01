import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("admin_portal", "0001_initial"),
        ("courses", "0008_course_booking"),
        ("tutors", "0007_default_tutor_subject_hourly_rate"),
    ]

    operations = [
        migrations.CreateModel(
            name="TutorPayoutRequest",
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
                    "request_type",
                    models.CharField(
                        choices=[
                            ("course_deposit_release", "Course deposit release"),
                            ("platform_exit", "Platform exit"),
                        ],
                        max_length=40,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2, default=0, max_digits=12
                    ),
                ),
                ("bank_info", models.TextField(blank=True)),
                ("qr_code_url", models.URLField(blank=True, max_length=1000)),
                ("note", models.TextField(blank=True)),
                ("admin_note", models.TextField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("paid", "Paid"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "course",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payout_requests",
                        to="courses.course",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_tutor_payout_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "processed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="processed_tutor_payout_requests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payout_requests",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="tutorpayoutrequest",
            index=models.Index(
                fields=["status", "request_type"],
                name="admin_porta_status_3ba997_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="tutorpayoutrequest",
            index=models.Index(
                fields=["tutor", "status"], name="admin_porta_tutor_i_086a41_idx"
            ),
        ),
    ]
