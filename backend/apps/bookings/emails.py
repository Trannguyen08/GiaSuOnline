from django.conf import settings
from django.core.mail import send_mail


def _send(subject, message, recipient):
    if not recipient:
        return
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [recipient],
        fail_silently=True,
    )


def send_booking_requested_email(booking):
    tutor = booking.tutor
    student_name = booking.student.get_full_name() or booking.student.email
    subject = "TutorMatch - Co yeu cau dat lich moi"
    message = (
        f"Chao {tutor.full_name or tutor.user.email},\n\n"
        f"Hoc vien {student_name} vua gui yeu cau dat lich hoc "
        f"{booking.subject.name if booking.subject else ''} vao {booking.start_time:%d/%m/%Y %H:%M}.\n"
        "Vui long dang nhap he thong de duyet yeu cau.\n\n"
        "Tran trong,\nTutorMatch"
    )
    _send(subject, message, tutor.user.email)


def send_booking_approved_email(booking):
    tutor_name = booking.tutor.full_name or booking.tutor.user.email
    subject = "TutorMatch - Yeu cau dat lich da duoc duyet"
    message = (
        f"Chao {booking.student.get_full_name() or booking.student.email},\n\n"
        f"Gia su {tutor_name} da duyet yeu cau dat lich cua ban. "
        f"So tien coc can thanh toan la {booking.deposit_amount:,.0f} VND.\n"
        "Vui long vao Lich su dang ky khoa hoc tren TutorMatch de thanh toan coc.\n\n"
        "Tran trong,\nTutorMatch"
    )
    _send(subject, message, booking.student.email)


def send_deposit_paid_email(booking):
    subject = "TutorMatch - Hoc vien da thanh toan coc"
    message = (
        f"Chao {booking.tutor.full_name or booking.tutor.user.email},\n\n"
        f"Hoc vien {booking.student.get_full_name() or booking.student.email} "
        f"da thanh toan coc {booking.deposit_amount:,.0f} VND cho lich hoc "
        f"{booking.start_time:%d/%m/%Y %H:%M}.\n"
        "He thong da xac nhan booking va tao khoa hoc cho hoc vien.\n\n"
        "Tran trong,\nTutorMatch"
    )
    _send(subject, message, booking.tutor.user.email)
