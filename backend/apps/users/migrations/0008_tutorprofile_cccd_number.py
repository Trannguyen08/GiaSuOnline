from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_tutorprofile_bio"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorprofile",
            name="cccd_number",
            field=models.CharField(
                blank=True, max_length=12, null=True, unique=True
            ),
        ),
    ]
