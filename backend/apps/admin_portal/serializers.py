from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.users.models import (
    TutorProfile as UserTutorProfile,
    TutorAchievement,
    TutorDegreeImage,
)
from apps.tutors.models import (
    TutorGuaranteeTransaction,
    TutorProfile as TeachingProfile,
    TutorSubject,
)
from apps.bookings.models import Booking, TeachingSlot
from apps.courses.models import Course, CourseCommission, CourseReview
from .models import SystemSetting, ViolationCase

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone",
            "is_tutor",
            "is_active",
            "is_verified",
            "is_staff",
            "created_at",
        ]


class AdminTutorSubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source="subject.name")

    class Meta:
        model = TutorSubject
        fields = ["id", "subject", "subject_name", "level", "hourly_rate"]


class AdminTutorProfileSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    subjects = AdminTutorSubjectSerializer(
        source="tutor_subjects", many=True, read_only=True
    )
    registration_status = serializers.CharField(
        source="user.tutor_profile.status", read_only=True
    )
    university = serializers.CharField(
        source="user.tutor_profile.university", read_only=True
    )
    qualification = serializers.CharField(
        source="user.tutor_profile.qualification", read_only=True
    )

    class Meta:
        model = TeachingProfile
        fields = [
            "id",
            "user",
            "full_name",
            "title",
            "bio",
            "experience_years",
            "rating_avg",
            "total_reviews",
            "is_available",
            "location",
            "teaching_mode",
            "subjects",
            "registration_status",
            "university",
            "qualification",
        ]


class AdminTutorAchievementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorAchievement
        fields = ["id", "image_url", "description"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url if obj.image else ""
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class AdminTutorDegreeImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TutorDegreeImage
        fields = ["id", "image_url", "description"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        url = obj.image.url if obj.image else ""
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )


class AdminTutorRegistrationSerializer(serializers.ModelSerializer):
    user = AdminUserSerializer(read_only=True)
    user_email = serializers.ReadOnlyField(source="user.email")
    registration_status = serializers.CharField(source="status", read_only=True)
    subjects = serializers.SerializerMethodField()
    experience_years = serializers.SerializerMethodField()
    id_front_url = serializers.SerializerMethodField()
    id_back_url = serializers.SerializerMethodField()
    degree_image_url = serializers.SerializerMethodField()
    degree_images = AdminTutorDegreeImageSerializer(many=True, read_only=True)
    achievements = AdminTutorAchievementSerializer(many=True, read_only=True)
    teaching_profile_id = serializers.SerializerMethodField()
    guarantee_deposit_balance = serializers.SerializerMethodField()
    commission_debt = serializers.SerializerMethodField()
    new_class_locked = serializers.SerializerMethodField()
    new_class_lock_reason = serializers.SerializerMethodField()

    class Meta:
        model = UserTutorProfile
        fields = [
            "id",
            "user",
            "user_email",
            "full_name",
            "birthday",
            "university",
            "qualification",
            "bio",
            "address",
            "subjects_text",
            "experience_years",
            "teaching_levels",
            "teaching_region",
            "id_front_url",
            "id_back_url",
            "degree_image_url",
            "degree_images",
            "achievements",
            "status",
            "registration_status",
            "subjects",
            "teaching_profile_id",
            "guarantee_deposit_balance",
            "commission_debt",
            "new_class_locked",
            "new_class_lock_reason",
            "created_at",
        ]

    def _file_url(self, field):
        if not field:
            return ""
        request = self.context.get("request")
        url = field.url
        return (
            request.build_absolute_uri(url) if request and url.startswith("/") else url
        )

    def get_id_front_url(self, obj):
        return self._file_url(obj.id_front)

    def get_id_back_url(self, obj):
        return self._file_url(obj.id_back)

    def get_degree_image_url(self, obj):
        return self._file_url(obj.degree_image)

    def get_subjects(self, obj):
        teaching_profile = getattr(obj.user, "teaching_profile", None)
        if not teaching_profile:
            return []
        return AdminTutorSubjectSerializer(
            teaching_profile.tutor_subjects.all(), many=True
        ).data

    def get_experience_years(self, obj):
        teaching_profile = getattr(obj.user, "teaching_profile", None)
        return (
            teaching_profile.experience_years
            if teaching_profile
            else obj.experience_years
        )

    def _teaching_profile(self, obj):
        return getattr(obj.user, "teaching_profile", None)

    def get_teaching_profile_id(self, obj):
        teaching_profile = self._teaching_profile(obj)
        return teaching_profile.id if teaching_profile else None

    def get_guarantee_deposit_balance(self, obj):
        teaching_profile = self._teaching_profile(obj)
        return teaching_profile.guarantee_deposit_balance if teaching_profile else 0

    def get_commission_debt(self, obj):
        teaching_profile = self._teaching_profile(obj)
        return teaching_profile.commission_debt if teaching_profile else 0

    def get_new_class_locked(self, obj):
        teaching_profile = self._teaching_profile(obj)
        return teaching_profile.new_class_locked if teaching_profile else False

    def get_new_class_lock_reason(self, obj):
        teaching_profile = self._teaching_profile(obj)
        return teaching_profile.new_class_lock_reason if teaching_profile else ""


class AdminCourseSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    completed_sessions = serializers.IntegerField(
        source="completed_sessions_count", read_only=True
    )
    commission_status = serializers.SerializerMethodField()
    commission_amount = serializers.SerializerMethodField()
    commission_outstanding = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "student",
            "student_name",
            "student_email",
            "tutor",
            "tutor_name",
            "tutor_email",
            "subject",
            "subject_name",
            "total_sessions",
            "completed_sessions",
            "session_duration_minutes",
            "schedule_time",
            "start_date",
            "end_date",
            "hourly_rate",
            "status",
            "commission_status",
            "commission_amount",
            "commission_outstanding",
            "created_at",
            "updated_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email

    def _commission(self, obj):
        return getattr(obj, "commission", None)

    def get_commission_status(self, obj):
        commission = self._commission(obj)
        return commission.status if commission else None

    def get_commission_amount(self, obj):
        commission = self._commission(obj)
        return commission.commission_amount if commission else 0

    def get_commission_outstanding(self, obj):
        commission = self._commission(obj)
        return commission.outstanding_amount if commission else 0


class AdminCourseCommissionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    outstanding_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = CourseCommission
        fields = [
            "id",
            "course",
            "course_title",
            "tutor",
            "tutor_name",
            "gross_amount",
            "commission_rate",
            "commission_amount",
            "paid_amount",
            "deducted_amount",
            "outstanding_amount",
            "status",
            "due_at",
            "settled_at",
            "created_at",
        ]


class AdminFinanceTutorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    required_deposit = serializers.SerializerMethodField()
    active_courses = serializers.IntegerField(read_only=True)
    due_commissions = serializers.IntegerField(read_only=True)

    class Meta:
        model = TeachingProfile
        fields = [
            "id",
            "full_name",
            "email",
            "guarantee_deposit_balance",
            "required_deposit",
            "commission_debt",
            "new_class_locked",
            "new_class_lock_reason",
            "active_courses",
            "due_commissions",
        ]

    def get_required_deposit(self, obj):
        from apps.tutors.services.guarantee import get_required_deposit

        return get_required_deposit()


class AdminGuaranteeTransactionSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = TutorGuaranteeTransaction
        fields = [
            "id",
            "tutor",
            "tutor_name",
            "course",
            "course_title",
            "transaction_type",
            "amount",
            "balance_after",
            "debt_after",
            "note",
            "created_at",
        ]


class AdminBookingSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    slot_status = serializers.CharField(source="teaching_slot.status", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "student",
            "student_name",
            "student_email",
            "tutor",
            "tutor_name",
            "tutor_email",
            "subject",
            "subject_name",
            "start_time",
            "end_time",
            "status",
            "total_price",
            "deposit_amount",
            "payment_status",
            "payos_order_code",
            "payos_payment_link_id",
            "payment_checkout_url",
            "paid_at",
            "notes",
            "teaching_slot",
            "slot_status",
            "created_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email


class AdminTeachingSlotSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    booking_status = serializers.CharField(source="booking.status", read_only=True)
    payment_status = serializers.CharField(source="booking.payment_status", read_only=True)

    class Meta:
        model = TeachingSlot
        fields = [
            "id",
            "tutor",
            "tutor_name",
            "tutor_email",
            "subject",
            "subject_name",
            "start_time",
            "end_time",
            "price",
            "meeting_link",
            "note",
            "status",
            "booking_id",
            "booking_status",
            "payment_status",
            "created_at",
        ]


class AdminCourseReviewSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    subject_name = serializers.CharField(source="course.subject.name", read_only=True)

    class Meta:
        model = CourseReview
        fields = [
            "id",
            "course",
            "course_title",
            "student",
            "student_name",
            "student_email",
            "tutor",
            "tutor_name",
            "tutor_email",
            "subject_name",
            "rating",
            "comment",
            "created_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username or obj.student.email


class AdminViolationCaseSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    target_user_email = serializers.EmailField(source="target_user.email", read_only=True)
    booking_label = serializers.SerializerMethodField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = ViolationCase
        fields = [
            "id",
            "title",
            "description",
            "reporter",
            "reporter_name",
            "target_user",
            "target_user_name",
            "target_user_email",
            "booking",
            "booking_label",
            "course",
            "course_title",
            "severity",
            "status",
            "resolution_note",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["resolved_by", "resolved_at", "created_at", "updated_at"]

    def _user_label(self, user):
        if not user:
            return ""
        return user.get_full_name() or user.username or user.email

    def get_reporter_name(self, obj):
        return self._user_label(obj.reporter)

    def get_target_user_name(self, obj):
        return self._user_label(obj.target_user)

    def get_booking_label(self, obj):
        if not obj.booking:
            return ""
        return f"Booking #{obj.booking_id} - {obj.booking.start_time:%d/%m/%Y %H:%M}"


class AdminSystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = [
            "id",
            "key",
            "label",
            "value",
            "value_type",
            "description",
            "updated_by",
            "updated_at",
        ]
        read_only_fields = ["key", "label", "value_type", "description", "updated_by", "updated_at"]
