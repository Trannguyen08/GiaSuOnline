from decimal import Decimal

from django.db import migrations, models


DEFAULT_RATE = Decimal("70000.00")


def set_default_rate_for_zero_subjects(apps, schema_editor):
    TutorSubject = apps.get_model("tutors", "TutorSubject")
    TutorSubject.objects.filter(hourly_rate=0).update(hourly_rate=DEFAULT_RATE)


class Migration(migrations.Migration):

    dependencies = [
        ("tutors", "0006_tutorsubject_is_active"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tutorsubject",
            name="hourly_rate",
            field=models.DecimalField(
                decimal_places=2,
                default=DEFAULT_RATE,
                max_digits=10,
            ),
        ),
        migrations.RunPython(
            set_default_rate_for_zero_subjects,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
