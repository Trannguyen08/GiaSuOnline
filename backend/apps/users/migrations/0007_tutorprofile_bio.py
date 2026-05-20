from django.core.validators import MaxLengthValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_tutorprofile_registration_teaching_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorprofile",
            name="bio",
            field=models.TextField(
                blank=True,
                max_length=1000,
                validators=[MaxLengthValidator(1000)],
            ),
        ),
    ]
