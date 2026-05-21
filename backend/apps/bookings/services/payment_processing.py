from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.courses.models import Course, CourseSession

from ..emails import send_deposit_paid_email
from ..models import Booking
from ..payments import get_payment_request


def create_course_from_booking(booking):
    duration_hours = Decimal(
        str((booking.end_time - booking.start_time).total_seconds())
    ) / Decimal("3600")
    course, created = Course.objects.get_or_create(
        student=booking.student,
        tutor=booking.tutor,
        subject=booking.subject,
        start_date=booking.start_time.date(),
        schedule_time=booking.start_time.strftime("%d/%m/%Y %H:%M"),
        defaults={
            "title": f"{booking.subject.name if booking.subject else 'Khoa hoc'} voi {booking.tutor.full_name or booking.tutor.user.username}",
            "description": booking.notes,
            "total_sessions": 1,
            "session_duration_minutes": max(
                30,
                int((booking.end_time - booking.start_time).total_seconds() // 60),
            ),
            "end_date": booking.end_time.date(),
            "hourly_rate": booking.deposit_amount / duration_hours,
            "status": "active",
        },
    )
    if created:
        CourseSession.objects.create(
            course=course,
            session_number=1,
            title="Buoi hoc dau tien",
            scheduled_date=booking.start_time.date(),
            scheduled_time=booking.start_time.time(),
        )
    return course


def process_booking_payment(booking_id):
    booking_snapshot = Booking.objects.only(
        "id", "payos_order_code", "payment_status"
    ).get(pk=booking_id)
    if booking_snapshot.payment_status == "paid":
        return "already_paid"
    if not booking_snapshot.payos_order_code:
        return "missing_order_code"

    payos_data = get_payment_request(booking_snapshot.payos_order_code)
    payos_status = payos_data.get("status")

    with transaction.atomic():
        booking = (
            Booking.objects.select_for_update(of=("self",))
            .select_related("student", "tutor__user", "subject")
            .get(pk=booking_id)
        )

        if booking.payment_status == "paid":
            return "already_paid"

        should_notify_tutor = False
        if payos_status == "PAID":
            booking.payment_status = "paid"
            booking.status = "confirmed"
            booking.paid_at = timezone.now()
            booking.save(update_fields=["payment_status", "status", "paid_at"])
            create_course_from_booking(booking)
            should_notify_tutor = True
        elif payos_status == "CANCELLED":
            booking.payment_status = "cancelled"
            booking.save(update_fields=["payment_status"])
        else:
            return "unchanged"

        if should_notify_tutor:
            transaction.on_commit(lambda: send_deposit_paid_email(booking))

    return payos_status.lower()
