import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("courses", "0004_coursereview_courseextensionrequest"),
        ("tutors", "0004_alter_tutorprofile_bio"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorprofile",
            name="commission_debt",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=12
            ),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="guarantee_deposit_balance",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=12
            ),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="new_class_lock_reason",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="tutorprofile",
            name="new_class_locked",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="TutorGuaranteeTransaction",
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
                (
                    "transaction_type",
                    models.CharField(
                        choices=[
                            ("deposit_topup", "Deposit top-up"),
                            ("commission_accrual", "Commission accrual"),
                            ("commission_payment", "Commission payment"),
                            ("deposit_deduction", "Deposit deduction"),
                        ],
                        max_length=30,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "balance_after",
                    models.DecimalField(decimal_places=2, max_digits=12),
                ),
                ("debt_after", models.DecimalField(decimal_places=2, max_digits=12)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "course",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="guarantee_transactions",
                        to="courses.course",
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="guarantee_transactions",
                        to="tutors.tutorprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
