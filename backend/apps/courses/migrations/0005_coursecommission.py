import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0004_coursereview_courseextensionrequest"),
        ("tutors", "0005_tutor_guarantee"),
    ]

    operations = [
        migrations.CreateModel(
            name="CourseCommission",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("gross_amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "commission_rate",
                    models.DecimalField(decimal_places=4, max_digits=5),
                ),
                (
                    "commission_amount",
                    models.DecimalField(decimal_places=2, max_digits=12),
                ),
                (
                    "paid_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "deducted_amount",
                    models.DecimalField(decimal_places=2, default=0, max_digits=12),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("due", "Due"),
                            ("paid", "Paid"),
                            ("deducted", "Deducted"),
                            ("partial", "Partial"),
                            ("waived", "Waived"),
                        ],
                        default="due",
                        max_length=20,
                    ),
                ),
                ("due_at", models.DateTimeField()),
                ("settled_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "course",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="commission",
                        to="courses.course",
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="course_commissions",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
