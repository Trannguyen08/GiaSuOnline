from datetime import timedelta

from django.db.models import Q
from rest_framework import serializers
from .models import Booking, TutorAvailability, TeachingSlot
from apps.users.serializers import UserSerializer
from apps.courses.models import TutorStudentFeedback
from apps.courses.serializers import TutorStudentFeedbackSerializer


class BookingSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source="student", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.user.email", read_only=True)
    slot_id = serializers.IntegerField(source="teaching_slot_id", read_only=True)
    deposit_due = serializers.BooleanField(read_only=True)
    student_feedbacks = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "student",
            "student_details",
            "tutor",
            "subject",
            "subject_name",
            "start_time",
            "end_time",
            "study_start_date",
            "study_end_date",
            "selected_schedules",
            "selected_slot_ids",
            "student_info",
            "status",
            "total_price",
            "deposit_amount",
            "payment_status",
            "payos_order_code",
            "payment_checkout_url",
            "paid_at",
            "notes",
            "teaching_slot",
            "slot_id",
            "tutor_name",
            "tutor_email",
            "deposit_due",
            "student_feedbacks",
            "created_at",
        ]
        read_only_fields = [
            "student",
            "status",
            "selected_slot_ids",
            "deposit_amount",
            "payment_status",
            "payos_order_code",
            "payment_checkout_url",
            "paid_at",
            "deposit_due",
            "student_feedbacks",
            "created_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["deposit_due"] = (
            instance.status == "approved" and instance.payment_status != "paid"
        )
        return data

    def get_student_feedbacks(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_tutor", False):
            return []
        feedbacks = (
            TutorStudentFeedback.objects.filter(
                student=obj.student,
                moderation_status=TutorStudentFeedback.ModerationStatus.APPROVED,
            )
            .select_related("course__subject", "tutor")
            .order_by("-created_at")[:5]
        )
        return TutorStudentFeedbackSerializer(feedbacks, many=True).data


class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ["id", "tutor", "day_of_week", "start_time", "end_time"]
        read_only_fields = ["tutor"]


class TeachingSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    tutor_name = serializers.CharField(source="tutor.full_name", read_only=True)
    student_name = serializers.SerializerMethodField()
    booking_subject_name = serializers.SerializerMethodField()
    student_phone = serializers.SerializerMethodField()
    student_address = serializers.SerializerMethodField()
    is_system_generated = serializers.SerializerMethodField()

    class Meta:
        model = TeachingSlot
        fields = [
            "id",
            "tutor",
            "tutor_name",
            "subject",
            "subject_name",
            "start_time",
            "end_time",
            "price",
            "meeting_link",
            "note",
            "status",
            "student_name",
            "booking_subject_name",
            "student_phone",
            "student_address",
            "is_system_generated",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "tutor",
            "status",
            "student_name",
            "booking_subject_name",
            "student_phone",
            "student_address",
            "is_system_generated",
            "created_at",
        ]

    def get_booking(self, obj):
        booking = getattr(obj, "confirmed_booking", None) or getattr(
            obj, "booking", None
        )
        if booking:
            return booking
        if obj.status != "booked":
            return None
        return (
            Booking.objects.filter(
                tutor=obj.tutor,
                payment_status="paid",
                selected_slot_ids__contains=[obj.id],
            )
            .select_related("student", "subject")
            .order_by("-paid_at", "-created_at")
            .first()
        )

    def get_is_system_generated(self, obj):
        return bool(obj.subject_id and getattr(obj, "confirmed_booking_id", None))

    def get_student_name(self, obj):
        booking = self.get_booking(obj)
        if not booking:
            return None
        booking_name = (booking.student_info or {}).get("fullName")
        if booking_name:
            return booking_name
        return (
            booking.student.get_full_name()
            or booking.student.username
            or booking.student.email
        )

    def get_booking_subject_name(self, obj):
        booking = self.get_booking(obj)
        if not booking or not booking.subject:
            return None
        return booking.subject.name

    def get_student_phone(self, obj):
        booking = self.get_booking(obj)
        if not booking:
            return None
        return (booking.student_info or {}).get("phone") or booking.student.phone

    def get_student_address(self, obj):
        booking = self.get_booking(obj)
        if not booking:
            return None
        return (booking.student_info or {}).get("address")

    def validate(self, attrs):
        start_time = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end_time = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time."}
            )
        if start_time and start_time.minute not in {0, 15, 30, 45}:
            raise serializers.ValidationError(
                {"start_time": "Start minute must be one of 00, 15, 30, 45."}
            )
        if end_time and end_time.minute not in {0, 15, 30, 45}:
            raise serializers.ValidationError(
                {"end_time": "End minute must be one of 00, 15, 30, 45."}
            )

        tutor = attrs.get("tutor", getattr(self.instance, "tutor", None))
        request = self.context.get("request")
        if tutor is None and request is not None:
            tutor = getattr(request.user, "teaching_profile", None) or getattr(
                request.user, "tutor_profile", None
            )

        if tutor and start_time and end_time:
            buffered_start = start_time - timedelta(minutes=30)
            buffered_end = end_time + timedelta(minutes=30)
            conflicts = TeachingSlot.objects.filter(tutor=tutor).exclude(
                status="cancelled"
            )
            if self.instance:
                conflicts = conflicts.exclude(pk=self.instance.pk)
            conflicts = conflicts.filter(
                Q(start_time__lt=buffered_end) & Q(end_time__gt=buffered_start)
            )
            if conflicts.exists():
                raise serializers.ValidationError(
                    {
                        "start_time": (
                            "This time range overlaps another slot or is less than "
                            "30 minutes from another slot."
                        )
                    }
                )
        return attrs
