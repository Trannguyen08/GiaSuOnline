from decimal import Decimal
from datetime import datetime, timedelta
import re

from django.db import transaction
from django.utils import timezone

from apps.courses.models import Course, CourseSession
from core.cache_utils import invalidate_cache_groups

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


def parse_schedule_time(value):
    if not value:
        return None
    match = re.search(r"(\d{1,2}):(\d{2})", str(value))
    if not match:
        return None
    return datetime.strptime(match.group(0), "%H:%M").time()


def schedule_patterns_from_booking(booking):
    patterns = []
    for item in booking.selected_schedules or []:
        if not isinstance(item, dict) or item.get("day") is None:
            continue
        label = item.get("label", "")
        parts = str(label).split(",", 1)
        time_part = parts[1] if len(parts) > 1 else label
        start_text, _, end_text = time_part.partition("-")
        start_time = parse_schedule_time(item.get("start_time") or start_text)
        end_time = parse_schedule_time(item.get("end_time") or end_text)
        if not start_time or not end_time:
            continue
        patterns.append(
            {
                "weekday": 6 if int(item.get("day")) == 0 else int(item.get("day")) - 1,
                "start_time": start_time,
                "end_time": end_time,
            }
        )
    return patterns


def build_course_session_occurrences(booking, slots):
    slot_patterns = schedule_patterns_from_booking(booking)
    if slot_patterns and booking.study_start_date and booking.study_end_date:
        current = booking.study_start_date
        occurrences = []
        while current <= booking.study_end_date:
            for pattern in slot_patterns:
                if current.weekday() == pattern["weekday"]:
                    occurrences.append(
                        {
                            "date": current,
                            "start_time": pattern["start_time"],
                            "end_time": pattern["end_time"],
                        }
                    )
            current += timedelta(days=1)
        if occurrences:
            return occurrences

    pattern_map = {
        (
            timezone.localtime(slot.start_time).weekday(),
            timezone.localtime(slot.start_time).time(),
            timezone.localtime(slot.end_time).time(),
        ): {
            "weekday": timezone.localtime(slot.start_time).weekday(),
            "start_time": timezone.localtime(slot.start_time).time(),
            "end_time": timezone.localtime(slot.end_time).time(),
        }
        for slot in slots
    }
    slot_patterns = list(pattern_map.values())

    if booking.study_start_date and booking.study_end_date:
        current = booking.study_start_date
        occurrences = []
        while current <= booking.study_end_date:
            for pattern in slot_patterns:
                if current.weekday() == pattern["weekday"]:
                    occurrences.append(
                        {
                            "date": current,
                            "start_time": pattern["start_time"],
                            "end_time": pattern["end_time"],
                        }
                    )
            current += timedelta(days=1)
        if occurrences:
            return occurrences

    if slots:
        return [
            {
                "date": timezone.localtime(slot.start_time).date(),
                "start_time": timezone.localtime(slot.start_time).time(),
                "end_time": timezone.localtime(slot.end_time).time(),
            }
            for slot in slots
        ]

    return [
        {
            "date": timezone.localtime(booking.start_time).date(),
            "start_time": timezone.localtime(booking.start_time).time(),
            "end_time": timezone.localtime(booking.end_time).time(),
        }
    ]


def append_course_sessions(course, booking, slots, total_sessions):
    occurrences = build_course_session_occurrences(booking, slots)
    start_number = course.sessions.count() + 1

    for index in range(total_sessions):
        occurrence = occurrences[index] if index < len(occurrences) else None
        session_number = start_number + index
        CourseSession.objects.create(
            course=course,
            session_number=session_number,
            title=f"Buoi {session_number}",
            scheduled_date=occurrence["date"] if occurrence else None,
            scheduled_time=occurrence["start_time"] if occurrence else None,
        )


def sync_confirmed_teaching_slots(booking, slots):
    for slot in slots:
        update_fields = []
        if slot.status != "booked":
            slot.status = "booked"
            update_fields.append("status")
        if slot.confirmed_booking_id != booking.id:
            slot.confirmed_booking = booking
            update_fields.append("confirmed_booking")
        if not slot.note and booking.notes:
            slot.note = booking.notes
            update_fields.append("note")
        if update_fields:
            slot.save(update_fields=update_fields)


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
    schedule_patterns = schedule_patterns_from_booking(booking)
    first_schedule = schedule_patterns[0] if schedule_patterns else None
    session_duration_minutes = max(
        30,
        int(
            (
                (
                    datetime.combine(booking.study_start_date, first_schedule["end_time"])
                    - datetime.combine(booking.study_start_date, first_schedule["start_time"])
                )
                if first_schedule and booking.study_start_date
                else (first_slot.end_time - first_slot.start_time)
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
    existing_course = (
        Course.objects.filter(tutor=booking.tutor, student=booking.student)
        .exclude(status__in=["completed", "cancelled"])
        .order_by("-created_at")
        .first()
    )
    if existing_course and existing_course.booking_id != booking.id:
        existing_course.total_sessions += total_sessions
        if booking.study_end_date or booking.end_time:
            new_end_date = booking.study_end_date or booking.end_time.date()
            if not existing_course.end_date or new_end_date > existing_course.end_date:
                existing_course.end_date = new_end_date
        if schedule_labels:
            existing_labels = [
                item.strip()
                for item in existing_course.schedule_time.split(",")
                if item.strip()
            ]
            existing_course.schedule_time = ", ".join(
                dict.fromkeys(existing_labels + schedule_labels)
            )
        existing_course.status = "active"
        existing_course.save(
            update_fields=[
                "total_sessions",
                "end_date",
                "schedule_time",
                "status",
                "updated_at",
            ]
        )
        append_course_sessions(existing_course, booking, slots, total_sessions)
        sync_confirmed_teaching_slots(booking, slots)
        return existing_course

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
        append_course_sessions(course, booking, slots, total_sessions)
    sync_confirmed_teaching_slots(booking, slots)
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
            transaction.on_commit(
                lambda: invalidate_cache_groups("bookings", "courses", "tutors")
            )

    return payos_status.lower()
