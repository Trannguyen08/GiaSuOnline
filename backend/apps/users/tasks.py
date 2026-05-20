from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import OTP
from django.utils import timezone
import random
from datetime import timedelta


@shared_task
def send_otp_email(email):
    # Generate 6-digit OTP
    code = f"{random.randint(100000, 999999)}"

    # Invalidate old OTPs
    OTP.objects.filter(email=email, is_used=False).update(is_used=True)

    # Save new OTP
    expires_at = timezone.now() + timedelta(minutes=5)
    OTP.objects.create(email=email, code=code, expires_at=expires_at)

    # Send email
    subject = "TutorMatch - Mã xác thực tài khoản"
    message = f"Chào bạn,\n\nMã xác thực OTP của bạn là: {code}\n\nMã này sẽ hết hạn sau 5 phút.\nVui lòng không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nĐội ngũ TutorMatch."

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return True


@shared_task
def send_account_lock_email(email, reason):
    subject = "TutorMatch - Thông báo khóa tài khoản"
    message = f"Chào bạn,\n\nChúng tôi lấy làm tiếc phải thông báo rằng tài khoản gia sư của bạn đã bị tạm khóa.\n\nLý do: {reason}\n\nVì lý do này, bạn không thể đăng nhập hoặc nhận lớp mới lúc này. Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ bộ phận hỗ trợ.\n\nTrân trọng,\nĐội ngũ TutorMatch."

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return True


@shared_task
def send_tutor_registration_pending_email(email, full_name):
    subject = "TutorMatch - Ho so gia su dang cho duyet"
    message = (
        f"Chao {full_name},\n\n"
        "TutorMatch da nhan duoc ho so dang ky gia su cua ban. "
        "Ho so hien dang cho quan tri vien kiem tra va phe duyet.\n\n"
        "Chung toi se gui email thong bao ngay khi co ket qua.\n\n"
        "Tran trong,\n"
        "Doi ngu TutorMatch."
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return True


@shared_task
def send_tutor_registration_result_email(email, full_name, approved, reason=""):
    if approved:
        subject = "TutorMatch - Ho so gia su da duoc duyet"
        message = (
            f"Chao {full_name},\n\n"
            "Chuc mung! Ho so dang ky gia su cua ban da duoc phe duyet. "
            "Ban co the dang nhap va bat dau hoan thien ho so giang day tren TutorMatch.\n\n"
            "Tran trong,\n"
            "Doi ngu TutorMatch."
        )
    else:
        subject = "TutorMatch - Ho so gia su bi tu choi"
        message = (
            f"Chao {full_name},\n\n" "Ho so dang ky gia su cua ban chua duoc phe duyet."
        )
        if reason:
            message += f"\n\nLy do: {reason}"
        message += (
            "\n\nBan co the lien he bo phan ho tro neu can them thong tin.\n\n"
            "Tran trong,\n"
            "Doi ngu TutorMatch."
        )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return True
