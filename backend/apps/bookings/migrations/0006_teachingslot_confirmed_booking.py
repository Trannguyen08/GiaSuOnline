import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0005_booking_request_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="teachingslot",
            name="confirmed_booking",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="confirmed_teaching_slots",
                to="bookings.booking",
            ),
        ),
    ]
