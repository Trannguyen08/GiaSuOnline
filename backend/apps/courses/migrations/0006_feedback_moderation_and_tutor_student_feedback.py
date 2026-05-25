import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0005_coursecommission"),
        ("tutors", "0005_tutor_guarantee"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="coursereview",
            name="moderation_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="coursereview",
            name="moderation_score",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="coursereview",
            name="moderation_flags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="coursereview",
            name="moderation_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="coursereview",
            name="moderation_raw",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="coursereview",
            name="moderated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name="TutorStudentFeedback",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("rating", models.PositiveSmallIntegerField()),
                ("comment", models.TextField()),
                (
                    "moderation_status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("moderation_score", models.PositiveSmallIntegerField(default=0)),
                ("moderation_flags", models.JSONField(blank=True, default=list)),
                ("moderation_reason", models.TextField(blank=True)),
                ("moderation_raw", models.JSONField(blank=True, default=dict)),
                ("moderated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "course",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_feedback",
                        to="courses.course",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="received_tutor_feedbacks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_feedbacks",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(
            lambda apps, schema_editor: apps.get_model("courses", "CourseReview")
            .objects.filter(moderation_status="pending")
            .update(moderation_status="approved"),
            migrations.RunPython.noop,
        ),
    ]
