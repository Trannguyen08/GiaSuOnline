# Generated manually to allow video materials in course sessions.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0002_material_s3_metadata'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sessionmaterial',
            name='material_type',
            field=models.CharField(
                choices=[
                    ('note', 'Ghi chu'),
                    ('image', 'Hinh anh'),
                    ('file', 'File tai lieu'),
                    ('video', 'Video'),
                    ('link', 'Duong dan'),
                ],
                default='note',
                max_length=20,
            ),
        ),
    ]
