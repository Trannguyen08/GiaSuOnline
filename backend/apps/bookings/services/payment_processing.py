from decimal import Decimal
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.courses.models import Course, CourseSession

from ..emails import send_deposit_paid_email
from ..models import Booking
from ..payments import get_payment_request


def count_weekday_in_range(start_date, end_date, weekday):
    target_weekday = 6 if int(weekday) == 0 else int(weekday) - 1
    current = start_date
    total = 0
    while current <= end_date:
        if current.weekday() == target_weekday:
            total += 1
        current += timedelta(days=1)
    return total


def calculate_booking_session_count(booking):
    if booking.study_start_date and booking.study_end_date:
        total = 0
        for item in booking.selected_schedules or []:
            if not isinstance(item, dict) or item.get("day") is None:
                continue
            try:
                total += count_weekday_in_range(
                    booking.study_start_date,
                    booking.study_end_date,
                    item.get("day"),
                )
            except (TypeError, ValueError):
                continue
        if total > 0:
            return total
    return len(booking.selected_slot_ids or []) or 1


def create_course_from_booking(booking):
    slots = list(
        booking.tutor.teaching_slots.filter(id__in=booking.selected_slot_ids or [])
        .only("start_time", "end_time")
        .order_by("start_time")
    )
    first_slot = slots[0] if slots else None
    schedule_labels = [
        item.get("label")
        for item in (booking.selected_schedules or [])
        if isinstance(item, dict) and item.get("label")
    ]
    total_sessions = calculate_booking_session_count(booking)
    session_duration_minutes = max(
        30,
        int(
            (
                (first_slot.end_time - first_slot.start_time)
                if first_slot
                else (booking.end_time - booking.start_time)
            ).total_seconds()
            // 60
        ),
    )
    total_course_hours = (
        Decimal(str(session_duration_minutes)) / Decimal("60") * Decimal(total_sessions)
    )
    hourly_rate = booking.total_price / total_course_hours if total_course_hours else 0
    course, created = Course.objects.get_or_create(
        booking=booking,
        defaults={
            "student": booking.student,
            "tutor": booking.tutor,
            "subject": booking.subject,
            "start_date": booking.study_start_date or booking.start_time.date(),
            "schedule_time": ", ".join(schedule_labels)
            or booking.start_time.strftime("%d/%m/%Y %H:%M"),
            "title": f"{booking.subject.name if booking.subject else 'Khoa hoc'} voi {booking.tutor.full_name or booking.tutor.user.username}",
            "description": booking.notes,
            "total_sessions": total_sessions,
            "session_duration_minutes": session_duration_minutes,
            "end_date": booking.study_end_date or booking.end_time.date(),
            "hourly_rate": hourly_rate,
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
