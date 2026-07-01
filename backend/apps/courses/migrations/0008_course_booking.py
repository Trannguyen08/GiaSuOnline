import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0005_booking_request_fields"),
        ("courses", "0007_alter_course_status_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="booking",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="course",
                to="bookings.booking",
            ),
        ),
    ]
