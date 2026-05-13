# Generated manually for teaching slot booking workflow.

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_initial'),
        ('tutors', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TeachingSlot',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('meeting_link', models.URLField(blank=True)),
                ('note', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('available', 'Available'), ('booked', 'Booked'), ('cancelled', 'Cancelled')], default='available', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('subject', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='tutors.subject')),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='teaching_slots', to='tutors.tutorprofile')),
            ],
            options={
                'ordering': ['start_time'],
            },
        ),
        migrations.AddField(
            model_name='booking',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='booking',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddField(
            model_name='booking',
            name='teaching_slot',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking', to='bookings.teachingslot'),
        ),
        migrations.AddIndex(
            model_name='teachingslot',
            index=models.Index(fields=['tutor', 'status', 'start_time'], name='bookings_te_tutor_i_0dde58_idx'),
        ),
    ]
