from django.db import models
from django.conf import settings
from django.core.validators import MaxLengthValidator


class Subject(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    category = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class TutorProfile(models.Model):
    MAX_BIO_LENGTH = 1000

    TEACHING_MODES = [("online", "Online"), ("offline", "Offline"), ("both", "Both")]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="teaching_profile",
    )
    full_name = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255, blank=True)  # Tiêu đề chuyên môn
    bio = models.TextField(
        blank=True,
        max_length=MAX_BIO_LENGTH,
        validators=[MaxLengthValidator(MAX_BIO_LENGTH)],
    )  # Giới thiệu bản thân
    experience_years = models.PositiveIntegerField(default=0)

    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    total_reviews = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    guarantee_deposit_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    commission_debt = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    new_class_locked = models.BooleanField(default=False)
    new_class_lock_reason = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    teaching_mode = models.CharField(
        max_length=20, choices=TEACHING_MODES, default="online"
    )

    def __str__(self):
        return f"TutorProfile for {self.user.username}"


class TutorGuaranteeTransaction(models.Model):
    TYPE_CHOICES = [
        ("deposit_topup", "Deposit top-up"),
        ("commission_accrual", "Commission accrual"),
        ("commission_payment", "Commission payment"),
        ("deposit_deduction", "Deposit deduction"),
        ("deposit_refund", "Deposit refund"),
        ("deposit_release", "Booking deposit release"),
    ]

    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="guarantee_transactions"
    )
    course = models.ForeignKey(
        "courses.Course",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guarantee_transactions",
    )
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    debt_after = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tutor_id} {self.transaction_type} {self.amount}"


class TutorSubject(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="tutor_subjects"
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    level = models.CharField(max_length=100)  # Cấp độ: Nâng cao, Cơ bản...
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=70000)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.tutor.user.username} teaches {self.subject.name}"


class TutorEducation(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="educations"
    )
    degree = models.CharField(max_length=255)
    school = models.CharField(max_length=255)
    years = models.CharField(max_length=100)  # e.g. "2016 - 2018"

    def __str__(self):
        return f"{self.degree} at {self.school}"


class TutorCertification(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="certifications"
    )
    title = models.CharField(max_length=255)
    organization = models.CharField(max_length=255)
    year = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.title} from {self.organization}"


class TutorFAQ(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="faqs"
    )
    question = models.CharField(max_length=500)
    answer = models.TextField()

    def __str__(self):
        return self.question


class TutorDocument(models.Model):
    tutor = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="documents"
    )
    file = models.FileField(upload_to="tutor_documents/")
    document_type = models.CharField(max_length=100)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.document_type} for {self.tutor.user.username}"
