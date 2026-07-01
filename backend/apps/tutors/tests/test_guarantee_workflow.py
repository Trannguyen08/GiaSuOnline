from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITransactionTestCase

from apps.bookings.models import Booking, TeachingSlot
from apps.courses.models import Course, CourseCommission, CourseSession
from apps.tutors.models import (
    Subject,
    TutorGuaranteeTransaction,
    TutorProfile,
    TutorSubject,
)


User = get_user_model()


@override_settings(
    TUTOR_GUARANTEE_REQUIRED_AMOUNT="200000.00",
    TUTOR_COMMISSION_RATE="0.10",
    TUTOR_COMMISSION_DUE_DAYS=7,
)
class TutorGuaranteeWorkflowTests(APITransactionTestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            username="student",
            email="student-guarantee@example.com",
            password="password123",
        )
        self.tutor_user = User.objects.create_user(
            username="tutor",
            email="tutor-guarantee@example.com",
            password="password123",
            is_tutor=True,
        )
        self.admin = User.objects.create_user(
            username="admin",
            email="admin-guarantee@example.com",
            password="password123",
            is_staff=True,
        )
        self.tutor = TutorProfile.objects.create(
            user=self.tutor_user,
            full_name="Tutor Guarantee",
        )
        self.subject = Subject.objects.create(
            name="Math Guarantee",
            slug="math-guarantee",
            category="STEM",
        )
        self.tutor_subject = TutorSubject.objects.create(
            tutor=self.tutor,
            subject=self.subject,
            level="basic",
            hourly_rate=Decimal("100000.00"),
        )

    def test_low_deposit_blocks_new_booking_until_tutor_tops_up(self):
        start_time = timezone.now() + timedelta(days=1)
        slot = TeachingSlot.objects.create(
            tutor=self.tutor,
            subject=self.subject,
            start_time=start_time,
            end_time=start_time + timedelta(hours=1),
            price=Decimal("100000.00"),
        )

        self.client.force_authenticate(self.student)
        blocked_response = self.client.post(
            reverse("student-book-slot", kwargs={"slot_id": slot.id}),
            {"subject": self.subject.id},
            format="json",
        )
        self.assertEqual(blocked_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Booking.objects.count(), 0)

        self.client.force_authenticate(self.tutor_user)
        topup_response = self.client.post(
            reverse("tutor-guarantee-deposit"),
            {"amount": "200000.00"},
            format="json",
        )
        self.assertEqual(topup_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.student)
        booked_response = self.client.post(
            reverse("student-book-slot", kwargs={"slot_id": slot.id}),
            {"subject": self.subject.id},
            format="json",
        )
        self.assertEqual(booked_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Booking.objects.count(), 1)

    def test_course_completion_accrues_commission_and_admin_deducts_from_deposit(self):
        self.tutor.guarantee_deposit_balance = Decimal("200000.00")
        self.tutor.save(update_fields=["guarantee_deposit_balance"])
        course = Course.objects.create(
            student=self.student,
            tutor=self.tutor,
            subject=self.subject,
            title="Guarantee Course",
            total_sessions=1,
            session_duration_minutes=60,
            schedule_time="Monday 18:00",
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            hourly_rate=Decimal("100000.00"),
        )
        session = CourseSession.objects.create(
            course=course,
            session_number=1,
            title="Session 1",
            scheduled_date=timezone.localdate(),
        )

        self.client.force_authenticate(self.student)
        complete_response = self.client.post(
            reverse("session-complete", kwargs={"session_id": session.id}),
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)

        course.refresh_from_db()
        self.tutor.refresh_from_db()
        commission = CourseCommission.objects.get(course=course)
        self.assertEqual(course.status, "completed")
        self.assertEqual(commission.commission_amount, Decimal("10000.00"))
        self.assertEqual(self.tutor.commission_debt, Decimal("10000.00"))

        self.client.force_authenticate(self.admin)
        deduct_response = self.client.post(
            reverse("admin-tutor-commission-deduct", kwargs={"pk": self.tutor.id}),
            format="json",
        )
        self.assertEqual(deduct_response.status_code, status.HTTP_200_OK)

        self.tutor.refresh_from_db()
        commission.refresh_from_db()
        self.assertEqual(self.tutor.commission_debt, Decimal("0.00"))
        self.assertEqual(self.tutor.guarantee_deposit_balance, Decimal("190000.00"))
        self.assertTrue(self.tutor.new_class_locked)
        self.assertEqual(self.tutor.new_class_lock_reason, "low_deposit")
        self.assertEqual(commission.status, "deducted")
        self.assertEqual(
            TutorGuaranteeTransaction.objects.filter(
                tutor=self.tutor, transaction_type="deposit_deduction"
            ).count(),
            1,
        )
