from celery import shared_task
from django.core.cache import cache

from .services.payment_processing import process_booking_payment


PAYMENT_VERIFY_LOCK_KEY = "booking-payment-verify:{booking_id}"
PAYMENT_VERIFY_LOCK_TIMEOUT = 300


def enqueue_payment_verification(booking_id):
    lock_key = PAYMENT_VERIFY_LOCK_KEY.format(booking_id=booking_id)
    queued = cache.add(lock_key, "1", PAYMENT_VERIFY_LOCK_TIMEOUT)
    if queued:
        try:
            process_booking_payment_verification.apply_async(
                args=[booking_id],
                queue="payments",
                task_id=f"booking-payment-verify-{booking_id}",
            )
        except Exception:
            cache.delete(lock_key)
            raise
    return queued


@shared_task(bind=True, acks_late=True, max_retries=3)
def process_booking_payment_verification(self, booking_id):
    lock_key = PAYMENT_VERIFY_LOCK_KEY.format(booking_id=booking_id)
    try:
        return process_booking_payment(booking_id)
    finally:
        cache.delete(lock_key)
