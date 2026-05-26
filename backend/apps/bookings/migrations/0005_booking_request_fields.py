from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0004_booking_deposit_payment"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="study_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="study_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="selected_schedules",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="booking",
            name="selected_slot_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="booking",
            name="student_info",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
