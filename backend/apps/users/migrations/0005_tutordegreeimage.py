import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_alter_tutorprofile_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="TutorDegreeImage",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="tutors/degrees/")),
                ("description", models.CharField(blank=True, max_length=255)),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="degree_images",
                        to="users.tutorprofile",
                    ),
                ),
            ],
        ),
    ]
