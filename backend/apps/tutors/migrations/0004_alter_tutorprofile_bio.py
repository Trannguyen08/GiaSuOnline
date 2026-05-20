from django.core.validators import MaxLengthValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tutors", "0003_remove_tutorprofile_education_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tutorprofile",
            name="bio",
            field=models.TextField(
                blank=True,
                max_length=1000,
                validators=[MaxLengthValidator(1000)],
            ),
        ),
    ]
