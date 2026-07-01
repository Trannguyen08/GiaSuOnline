from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tutors", "0005_tutor_guarantee"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorsubject",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
