# Generated manually for S3 material metadata and presigned uploads.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sessionmaterial",
            name="content_type",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="sessionmaterial",
            name="external_url",
            field=models.URLField(blank=True, max_length=1000),
        ),
        migrations.AddField(
            model_name="sessionmaterial",
            name="file_size",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="sessionmaterial",
            name="s3_key",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="sessionmaterial",
            name="upload_status",
            field=models.CharField(
                choices=[("ready", "Ready"), ("pending", "Pending")],
                default="ready",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="studyroommaterial",
            name="content_type",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="studyroommaterial",
            name="external_url",
            field=models.URLField(blank=True, max_length=1000),
        ),
        migrations.AddField(
            model_name="studyroommaterial",
            name="file_size",
            field=models.PositiveBigIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studyroommaterial",
            name="s3_key",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="studyroommaterial",
            name="upload_status",
            field=models.CharField(
                choices=[("ready", "Ready"), ("pending", "Pending")],
                default="ready",
                max_length=20,
            ),
        ),
    ]
