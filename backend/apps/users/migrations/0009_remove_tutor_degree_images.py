from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_tutorprofile_cccd_number"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="tutorprofile",
            name="degree_image",
        ),
        migrations.DeleteModel(
            name="TutorDegreeImage",
        ),
    ]
