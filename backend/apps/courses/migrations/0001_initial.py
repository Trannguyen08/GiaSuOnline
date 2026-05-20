# Generated manually for courses and study room workflows.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("tutors", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Course",
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
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("total_sessions", models.PositiveIntegerField(default=0)),
                ("session_duration_minutes", models.PositiveIntegerField(default=60)),
                ("schedule_time", models.CharField(blank=True, max_length=100)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "hourly_rate",
                    models.DecimalField(decimal_places=2, default=0, max_digits=10),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Dang hoc"),
                            ("completed", "Hoan thanh"),
                            ("paused", "Tam dung"),
                            ("cancelled", "Da huy"),
                        ],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="enrolled_courses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "subject",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="tutors.subject",
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="teaching_courses",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="StudyRoom",
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
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "subject",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="tutors.subject",
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="study_rooms",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CourseSession",
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
                ("session_number", models.PositiveIntegerField()),
                ("title", models.CharField(blank=True, max_length=255)),
                ("scheduled_date", models.DateField(blank=True, null=True)),
                ("scheduled_time", models.TimeField(blank=True, null=True)),
                ("student_completed", models.BooleanField(default=False)),
                ("student_completed_at", models.DateTimeField(blank=True, null=True)),
                ("tutor_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "course",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to="courses.course",
                    ),
                ),
            ],
            options={
                "ordering": ["session_number"],
                "unique_together": {("course", "session_number")},
            },
        ),
        migrations.CreateModel(
            name="StudyRoomSession",
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
                ("session_number", models.PositiveIntegerField(default=1)),
                ("title", models.CharField(max_length=255)),
                ("scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("content_text", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_sessions",
                        to="courses.studyroom",
                    ),
                ),
            ],
            options={
                "ordering": ["session_number", "created_at"],
                "unique_together": {("room", "session_number")},
            },
        ),
        migrations.CreateModel(
            name="SessionMaterial",
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
                (
                    "material_type",
                    models.CharField(
                        choices=[
                            ("note", "Ghi chu"),
                            ("image", "Hinh anh"),
                            ("file", "File tai lieu"),
                            ("link", "Duong dan"),
                        ],
                        default="note",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=255)),
                ("content", models.TextField(blank=True)),
                (
                    "file",
                    models.FileField(
                        blank=True, null=True, upload_to="session_materials/"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="materials",
                        to="courses.coursesession",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="StudyRoomMaterial",
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
                (
                    "material_type",
                    models.CharField(
                        choices=[
                            ("file", "File"),
                            ("image", "Image"),
                            ("video", "Video"),
                            ("link", "Link"),
                        ],
                        default="file",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("content", models.TextField(blank=True)),
                (
                    "file",
                    models.FileField(
                        blank=True, null=True, upload_to="study_room_materials/"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="materials",
                        to="courses.studyroomsession",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="StudyRoomStudent",
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
                ("invited_at", models.DateTimeField(auto_now_add=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="courses.studyroom",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"unique_together": {("room", "student")}},
        ),
        migrations.AddField(
            model_name="studyroom",
            name="students",
            field=models.ManyToManyField(
                related_name="study_rooms",
                through="courses.StudyRoomStudent",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="StudyRoomRead",
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
                ("read_at", models.DateTimeField(auto_now=True)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reads",
                        to="courses.studyroomsession",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="study_room_reads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"unique_together": {("session", "student")}},
        ),
    ]
