from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_tutordegreeimage"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorprofile",
            name="subjects_text",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="experience_years",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="teaching_levels",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="teaching_region",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
