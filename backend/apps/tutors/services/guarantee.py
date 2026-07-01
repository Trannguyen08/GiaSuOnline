from decimal import Decimal
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.courses.models import CourseCommission

from ..models import TutorGuaranteeTransaction, TutorProfile


MONEY_ZERO = Decimal("0.00")


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


def get_required_deposit():
    return money(getattr(settings, "TUTOR_GUARANTEE_REQUIRED_AMOUNT", "200000.00"))


def get_commission_rate():
    return Decimal(str(getattr(settings, "TUTOR_COMMISSION_RATE", "0.15")))


def get_commission_due_at():
    days = int(getattr(settings, "TUTOR_COMMISSION_DUE_DAYS", 7))
    return timezone.now() + timedelta(days=days)


def calculate_course_gross_amount(course):
    hours = (
        Decimal(str(course.session_duration_minutes))
        / Decimal("60")
        * Decimal(str(course.total_sessions))
    )
    return money(course.hourly_rate * hours)


def can_receive_new_classes(tutor):
    return (
        not tutor.new_class_locked
        and tutor.guarantee_deposit_balance >= get_required_deposit()
    )


def refresh_new_class_lock(tutor):
    required = get_required_deposit()
    lock_reason = ""
    locked = False

    if tutor.commission_debt > 0 and tutor.guarantee_deposit_balance <= 0:
        locked = True
        lock_reason = "commission_debt"
    elif tutor.guarantee_deposit_balance < required:
        locked = True
        lock_reason = "low_deposit"

    tutor.new_class_locked = locked
    tutor.new_class_lock_reason = lock_reason
    tutor.save(
        update_fields=[
            "new_class_locked",
            "new_class_lock_reason",
        ]
    )
    return tutor


def record_transaction(tutor, transaction_type, amount, *, course=None, note=""):
    return TutorGuaranteeTransaction.objects.create(
        tutor=tutor,
        course=course,
        transaction_type=transaction_type,
        amount=money(amount),
        balance_after=tutor.guarantee_deposit_balance,
        debt_after=tutor.commission_debt,
        note=note,
    )


@transaction.atomic
def top_up_deposit(tutor_id, amount, *, note=""):
    amount = money(amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")

    tutor = TutorProfile.objects.select_for_update().get(pk=tutor_id)
    tutor.guarantee_deposit_balance = money(tutor.guarantee_deposit_balance + amount)
    tutor.save(update_fields=["guarantee_deposit_balance"])
    refresh_new_class_lock(tutor)
    record_transaction(tutor, "deposit_topup", amount, note=note)
    return tutor


@transaction.atomic
def accrue_course_commission(course):
    course = course.__class__.objects.select_related("tutor", "booking").get(pk=course.pk)
    existing = getattr(course, "commission", None)
    if existing:
        return existing

    tutor = TutorProfile.objects.select_for_update().get(pk=course.tutor_id)
    gross_amount = calculate_course_gross_amount(course)
    rate = get_commission_rate()
    commission_amount = money(gross_amount * rate)
    booking = getattr(course, "booking", None)
    deposit_amount = money(getattr(booking, "deposit_amount", 0) or 0)
    covered_by_booking_deposit = deposit_amount >= commission_amount

    commission = CourseCommission.objects.create(
        course=course,
        tutor=tutor,
        gross_amount=gross_amount,
        commission_rate=rate,
        commission_amount=commission_amount,
        deducted_amount=commission_amount if covered_by_booking_deposit else MONEY_ZERO,
        status="deducted" if covered_by_booking_deposit else "due",
        due_at=get_commission_due_at(),
        settled_at=timezone.now() if covered_by_booking_deposit else None,
    )
    if not covered_by_booking_deposit:
        tutor.commission_debt = money(tutor.commission_debt + commission_amount)
        tutor.save(update_fields=["commission_debt"])
    record_transaction(
        tutor,
        "commission_accrual",
        commission_amount,
        course=course,
        note=(
            "Commission deducted from booking deposit after course completion."
            if covered_by_booking_deposit
            else "Commission accrued after course completion."
        ),
    )
    return commission


def get_course_deposit_release_amount(course):
    commission = getattr(course, "commission", None) or accrue_course_commission(course)
    booking = getattr(course, "booking", None)
    if not booking:
        return MONEY_ZERO
    return money(max(money(booking.deposit_amount) - commission.commission_amount, MONEY_ZERO))


@transaction.atomic
def mark_payout_request_processed(request_id, action, *, admin_user=None, admin_note=""):
    from apps.admin_portal.models import TutorPayoutRequest

    payout = (
        TutorPayoutRequest.objects.select_for_update()
        .select_related("tutor", "course")
        .get(pk=request_id)
    )
    if payout.status not in ["pending", "approved"]:
        raise ValueError("Request has already been processed.")
    if action not in ["approve", "reject", "paid"]:
        raise ValueError("Invalid payout action.")

    payout.admin_note = admin_note
    payout.processed_by = admin_user
    payout.processed_at = timezone.now()
    if action == "reject":
        payout.status = "rejected"
    elif action == "approve":
        payout.status = "approved"
    else:
        payout.status = "paid"
        tutor = TutorProfile.objects.select_for_update().get(pk=payout.tutor_id)
        if payout.request_type == "platform_exit":
            refund_amount = min(money(payout.amount), money(tutor.guarantee_deposit_balance))
            tutor.guarantee_deposit_balance = money(
                tutor.guarantee_deposit_balance - refund_amount
            )
            tutor.is_available = False
            tutor.save(update_fields=["guarantee_deposit_balance", "is_available"])
            refresh_new_class_lock(tutor)
            record_transaction(
                tutor,
                "deposit_refund",
                refund_amount,
                note=admin_note or "Platform exit guarantee deposit refund.",
            )
        elif payout.request_type == "course_deposit_release":
            record_transaction(
                tutor,
                "deposit_release",
                payout.amount,
                course=payout.course,
                note=admin_note or "Released remaining booking deposit to tutor.",
            )
    payout.save(
        update_fields=[
            "status",
            "admin_note",
            "processed_by",
            "processed_at",
            "updated_at",
        ]
    )
    return payout


def _allocate_commission_settlement(tutor, amount, field_name, settled_status):
    remaining = money(amount)
    commissions = (
        CourseCommission.objects.select_for_update()
        .filter(tutor=tutor)
        .exclude(status__in=["paid", "deducted", "waived"])
        .order_by("due_at", "id")
    )
    for commission in commissions:
        if remaining <= 0:
            break
        outstanding = money(commission.outstanding_amount)
        if outstanding <= 0:
            continue
        applied = min(remaining, outstanding)
        setattr(commission, field_name, money(getattr(commission, field_name) + applied))
        remaining = money(remaining - applied)
        if commission.outstanding_amount <= 0:
            commission.status = settled_status
            commission.settled_at = timezone.now()
        else:
            commission.status = "partial"
        commission.save(
            update_fields=[field_name, "status", "settled_at", "updated_at"]
        )


@transaction.atomic
def pay_commission_debt(tutor_id, amount, *, note=""):
    amount = money(amount)
    if amount <= 0:
        raise ValueError("Amount must be greater than 0.")

    tutor = TutorProfile.objects.select_for_update().get(pk=tutor_id)
    paid_amount = min(amount, tutor.commission_debt)
    if paid_amount <= 0:
        return tutor

    tutor.commission_debt = money(tutor.commission_debt - paid_amount)
    tutor.save(update_fields=["commission_debt"])
    _allocate_commission_settlement(tutor, paid_amount, "paid_amount", "paid")
    refresh_new_class_lock(tutor)
    record_transaction(
        tutor,
        "commission_payment",
        paid_amount,
        note=note or "Tutor paid commission debt.",
    )
    return tutor


@transaction.atomic
def deduct_commission_debt_from_deposit(tutor_id, *, note=""):
    tutor = TutorProfile.objects.select_for_update().get(pk=tutor_id)
    deducted_amount = min(tutor.commission_debt, tutor.guarantee_deposit_balance)
    deducted_amount = money(deducted_amount)
    if deducted_amount <= 0:
        refresh_new_class_lock(tutor)
        return tutor

    tutor.guarantee_deposit_balance = money(
        tutor.guarantee_deposit_balance - deducted_amount
    )
    tutor.commission_debt = money(tutor.commission_debt - deducted_amount)
    tutor.save(update_fields=["guarantee_deposit_balance", "commission_debt"])
    _allocate_commission_settlement(tutor, deducted_amount, "deducted_amount", "deducted")
    refresh_new_class_lock(tutor)
    record_transaction(
        tutor,
        "deposit_deduction",
        deducted_amount,
        note=note or "Commission debt deducted from guarantee deposit.",
    )
    return tutor
