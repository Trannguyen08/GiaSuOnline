from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITransactionTestCase

from apps.bookings.models import Booking
from apps.courses.models import Course, CourseSession
from apps.tutors.models import Subject, TutorProfile


User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    CELERY_TASK_EAGER_PROPAGATES=True,
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "booking-payment-tests",
        }
    },
)
class BookingPaymentTransactionTests(APITransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="password123",
        )
        self.tutor_user = User.objects.create_user(
            username="tutor",
            email="tutor@example.com",
            password="password123",
            is_tutor=True,
        )
        self.tutor = TutorProfile.objects.create(
            user=self.tutor_user,
            full_name="Tutor One",
        )
        self.subject = Subject.objects.create(
            name="Math",
            slug="math",
            category="STEM",
        )
        start_time = timezone.now() + timedelta(days=1)
        self.booking = Booking.objects.create(
            student=self.student,
            tutor=self.tutor,
            subject=self.subject,
            start_time=start_time,
            end_time=start_time + timedelta(hours=2),
            status="approved",
            total_price=Decimal("400000.00"),
            deposit_amount=Decimal("400000.00"),
            payment_status="pending",
            payos_order_code=123456789,
        )
        self.client.force_authenticate(self.student)

    @patch("apps.bookings.services.payment_processing.send_deposit_paid_email")
    @patch("apps.bookings.services.payment_processing.get_payment_request")
    def test_paid_verify_atomically_confirms_booking_and_creates_course(self, payos_mock, email_mock):
        payos_mock.return_value = {"status": "PAID"}

        response = self.client.post(
            reverse("booking-payment-verify"),
            {"orderCode": self.booking.payos_order_code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertIsNotNone(self.booking.paid_at)
        self.assertEqual(Course.objects.count(), 1)
        self.assertEqual(CourseSession.objects.count(), 1)
        email_mock.assert_called_once()

    @patch("apps.bookings.services.payment_processing.send_deposit_paid_email")
    @patch("apps.bookings.services.payment_processing.get_payment_request")
    def test_paid_verify_is_idempotent(self, payos_mock, email_mock):
        payos_mock.return_value = {"status": "PAID"}

        for _ in range(2):
            response = self.client.post(
                reverse("booking-payment-verify"),
                {"orderCode": self.booking.payos_order_code},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "paid")
        self.assertEqual(Course.objects.count(), 1)
        self.assertEqual(CourseSession.objects.count(), 1)
        email_mock.assert_called_once()
        payos_mock.assert_called_once()

    @patch("apps.bookings.services.payment_processing.send_deposit_paid_email")
    @patch("apps.bookings.services.payment_processing.get_payment_request")
    def test_cancelled_payment_does_not_create_course(self, payos_mock, email_mock):
        payos_mock.return_value = {"status": "CANCELLED"}

        response = self.client.post(
            reverse("booking-payment-verify"),
            {"orderCode": self.booking.payos_order_code},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.payment_status, "cancelled")
        self.assertEqual(self.booking.status, "approved")
        self.assertEqual(Course.objects.count(), 0)
        self.assertEqual(CourseSession.objects.count(), 0)
        email_mock.assert_not_called()

    @patch("apps.bookings.views.create_payment_link")
    def test_deposit_payment_link_creation_reuses_pending_checkout_url(self, create_link_mock):
        create_link_mock.return_value = {
            "paymentLinkId": "payos-link-1",
            "checkoutUrl": "https://pay.payos.vn/checkout/1",
        }
        self.booking.payment_status = "unpaid"
        self.booking.payos_order_code = None
        self.booking.save(update_fields=["payment_status", "payos_order_code"])

        first_response = self.client.post(
            reverse("booking-deposit-payment", kwargs={"pk": self.booking.id}),
            format="json",
        )
        second_response = self.client.post(
            reverse("booking-deposit-payment", kwargs={"pk": self.booking.id}),
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            second_response.data["checkout_url"], "https://pay.payos.vn/checkout/1"
        )
        create_link_mock.assert_called_once()
