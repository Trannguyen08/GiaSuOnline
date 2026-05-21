import hashlib
import hmac
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings


class PayOSError(Exception):
    pass


def amount_to_vnd(value):
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def build_signature(data):
    raw = "&".join(f"{key}={data[key]}" for key in sorted(data.keys()))
    return hmac.new(
        settings.PAYOS_CHECKSUM_KEY.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_payment_link(*, booking, return_url, cancel_url):
    if not (
        settings.PAYOS_CLIENT_ID
        and settings.PAYOS_API_KEY
        and settings.PAYOS_CHECKSUM_KEY
    ):
        raise PayOSError("PayOS is not configured.")

    amount = amount_to_vnd(booking.deposit_amount)
    payload = {
        "orderCode": booking.payos_order_code,
        "amount": amount,
        "description": f"Coc booking {booking.id}",
        "buyerName": booking.student.get_full_name()
        or booking.student.username
        or booking.student.email,
        "buyerEmail": booking.student.email,
        "items": [
            {
                "name": f"Dat coc buoi hoc {booking.subject.name if booking.subject else ''}".strip(),
                "quantity": 1,
                "price": amount,
            }
        ],
        "returnUrl": return_url,
        "cancelUrl": cancel_url,
    }
    signature_data = {
        "amount": payload["amount"],
        "cancelUrl": payload["cancelUrl"],
        "description": payload["description"],
        "orderCode": payload["orderCode"],
        "returnUrl": payload["returnUrl"],
    }
    payload["signature"] = build_signature(signature_data)

    response = requests.post(
        f"{settings.PAYOS_API_BASE_URL}/v2/payment-requests",
        json=payload,
        headers={
            "x-client-id": settings.PAYOS_CLIENT_ID,
            "x-api-key": settings.PAYOS_API_KEY,
            "Content-Type": "application/json",
        },
        timeout=15,
    )
    data = response.json()
    if response.status_code >= 400 or data.get("code") != "00":
        raise PayOSError(data.get("desc") or data.get("message") or "PayOS error.")
    return data["data"]


def get_payment_request(order_code):
    response = requests.get(
        f"{settings.PAYOS_API_BASE_URL}/v2/payment-requests/{order_code}",
        headers={
            "x-client-id": settings.PAYOS_CLIENT_ID,
            "x-api-key": settings.PAYOS_API_KEY,
        },
        timeout=15,
    )
    data = response.json()
    if response.status_code >= 400 or data.get("code") != "00":
        raise PayOSError(data.get("desc") or data.get("message") or "PayOS error.")
    return data["data"]
