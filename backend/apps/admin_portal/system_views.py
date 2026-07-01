import csv

from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone

from apps.bookings.models import Booking
from apps.courses.models import Course, CourseCommission, CourseReview
from apps.tutors.models import TutorProfile as TeachingProfile
from apps.users.models import TutorProfile as UserTutorProfile

from .models import SystemSetting, ViolationCase
from .serializers import AdminSystemSettingSerializer
from .views import IsAdminUser, money_sum, selected_month


def ensure_system_settings():
    defaults = [
        ("tutor-guarantee-required-amount", "Cọc bảo chứng gia sư", getattr(settings, "TUTOR_GUARANTEE_REQUIRED_AMOUNT", "200000.00"), "money", "Số tiền cọc tối thiểu để gia sư được nhận lớp mới."),
        ("tutor-commission-rate", "Tỷ lệ commission", str(getattr(settings, "TUTOR_COMMISSION_RATE", "0.10")), "percent", "Tỷ lệ nền tảng thu khi khóa học hoàn thành."),
        ("tutor-commission-due-days", "Số ngày đến hạn commission", str(getattr(settings, "TUTOR_COMMISSION_DUE_DAYS", 7)), "number", "Số ngày gia sư cần thanh toán commission trước khi bị nhắc/quản lý."),
        ("booking-deposit-rate", "Tỷ lệ cọc booking", "0.30", "percent", "Tỷ lệ cọc gợi ý cho booking mới."),
        ("refund-policy-note", "Ghi chú chính sách hoàn tiền", "Admin đối soát và hoàn tiền thủ công khi booking bị hủy hợp lệ.", "text", "Nội dung nội bộ hiển thị cho nhóm vận hành."),
    ]
    for key, label, value, value_type, description in defaults:
        SystemSetting.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "value": value,
                "value_type": value_type,
                "description": description,
            },
        )


class AdminSystemSettingListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminSystemSettingSerializer

    def get_queryset(self):
        ensure_system_settings()
        return SystemSetting.objects.all()


class AdminSystemSettingUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, key):
        ensure_system_settings()
        try:
            item = SystemSetting.objects.get(key=key)
        except SystemSetting.DoesNotExist:
            return Response({"error": "Setting not found"}, status=404)
        item.value = request.data.get("value", item.value)
        item.updated_by = request.user
        item.save(update_fields=["value", "updated_by", "updated_at"])
        return Response(AdminSystemSettingSerializer(item).data)


class AdminReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month, year = selected_month(request)
        bookings = Booking.objects.filter(created_at__year=year, created_at__month=month)
        courses = Course.objects.filter(created_at__year=year, created_at__month=month)
        commissions = CourseCommission.objects.filter(created_at__year=year, created_at__month=month)
        reviews = CourseReview.objects.filter(created_at__year=year, created_at__month=month)
        data = {
            "selected": {"month": month, "year": year},
            "bookings": {
                "total": bookings.count(),
                "paid": bookings.filter(payment_status="paid").count(),
                "cancelled": bookings.filter(status="cancelled").count(),
                "revenue": money_sum(bookings.filter(payment_status="paid"), "total_price"),
                "deposit": money_sum(bookings.filter(payment_status="paid"), "deposit_amount"),
            },
            "courses": {
                "total": courses.count(),
                "active": courses.filter(status="active").count(),
                "completed": courses.filter(status="completed").count(),
                "cancelled": courses.filter(status="cancelled").count(),
            },
            "finance": {
                "commission": money_sum(commissions, "commission_amount"),
                "commission_paid": money_sum(commissions, "paid_amount"),
                "commission_debt": money_sum(TeachingProfile.objects.all(), "commission_debt"),
                "deposit_balance": money_sum(TeachingProfile.objects.all(), "guarantee_deposit_balance"),
            },
            "quality": {
                "reviews": reviews.count(),
                "low_reviews": reviews.filter(rating__lte=2).count(),
                "violations_open": ViolationCase.objects.exclude(status__in=["resolved", "dismissed"]).count(),
            },
        }
        if request.query_params.get("format") == "csv":
            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = f'attachment; filename="admin-report-{year}-{month}.csv"'
            writer = csv.writer(response)
            writer.writerow(["Section", "Metric", "Value"])
            for section, metrics in data.items():
                if section == "selected":
                    continue
                for key, value in metrics.items():
                    writer.writerow([section, key, value])
            return response
        return Response(data)


class AdminNotificationOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "pending_tutors": UserTutorProfile.objects.filter(status="PENDING").count(),
                "pending_payments": Booking.objects.filter(payment_status="pending").count(),
                "failed_payments": Booking.objects.filter(payment_status="failed").count(),
                "overdue_commissions": CourseCommission.objects.filter(due_at__lt=timezone.now())
                .exclude(status__in=["paid", "deducted", "waived"])
                .count(),
                "low_reviews": CourseReview.objects.filter(rating__lte=2).count(),
                "open_violations": ViolationCase.objects.exclude(status__in=["resolved", "dismissed"]).count(),
            }
        )
