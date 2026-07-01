from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone

from apps.bookings.models import Booking, TeachingSlot
from apps.bookings.views import release_booking_slots

from .serializers import AdminBookingSerializer, AdminTeachingSlotSerializer
from .views import IsAdminUser, money_sum, selected_month


class AdminBookingListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminBookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related(
            "student", "tutor__user", "subject", "teaching_slot"
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)

        payment_status = self.request.query_params.get("payment_status")
        if payment_status and payment_status != "all":
            queryset = queryset.filter(payment_status=payment_status)

        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        if year:
            queryset = queryset.filter(created_at__year=year)
        if month:
            queryset = queryset.filter(created_at__month=month)

        search = self.request.query_params.get("search")
        if search:
            search_filter = (
                Q(student__email__icontains=search)
                | Q(student__username__icontains=search)
                | Q(tutor__full_name__icontains=search)
                | Q(tutor__user__email__icontains=search)
                | Q(subject__name__icontains=search)
            )
            if search.isdigit():
                search_filter |= Q(payos_order_code=int(search))
            queryset = queryset.filter(search_filter)
        return queryset


class AdminBookingActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related("teaching_slot").get(pk=pk)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        note = request.data.get("note", "")
        status_actions = ["pending", "approved", "confirmed", "cancelled", "completed"]
        payment_actions = ["unpaid", "pending_payment", "paid", "failed", "cancelled_payment"]

        if action in status_actions:
            booking.status = action
            if action == "cancelled":
                release_booking_slots(booking)
            if action in ["confirmed", "completed"] and booking.teaching_slot:
                booking.teaching_slot.status = "booked"
                booking.teaching_slot.save(update_fields=["status"])
        elif action in payment_actions:
            mapped_status = action.replace("_payment", "")
            booking.payment_status = mapped_status
            if mapped_status == "paid" and not booking.paid_at:
                booking.paid_at = timezone.now()
            if mapped_status != "paid":
                booking.paid_at = None
        else:
            return Response({"error": "Invalid booking action."}, status=status.HTTP_400_BAD_REQUEST)

        if note:
            booking.notes = f"{booking.notes}\n[Admin] {note}".strip()
        booking.save()
        return Response(AdminBookingSerializer(booking).data)


class AdminPaymentOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month, year = selected_month(request)
        bookings = Booking.objects.filter(created_at__year=year, created_at__month=month)
        return Response(
            {
                "selected": {"month": month, "year": year},
                "summary": {
                    "paid_total": money_sum(bookings.filter(payment_status="paid"), "total_price"),
                    "deposit_total": money_sum(bookings.filter(payment_status="paid"), "deposit_amount"),
                    "pending_count": bookings.filter(payment_status="pending").count(),
                    "failed_count": bookings.filter(payment_status="failed").count(),
                    "cancelled_count": bookings.filter(payment_status="cancelled").count(),
                },
                "items": AdminBookingSerializer(
                    bookings.select_related("student", "tutor__user", "subject", "teaching_slot")
                    .exclude(payment_status="unpaid")
                    .order_by("-created_at")[:200],
                    many=True,
                ).data,
            }
        )


class AdminTeachingSlotListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminTeachingSlotSerializer

    def get_queryset(self):
        queryset = TeachingSlot.objects.select_related(
            "tutor__user", "subject", "booking"
        ).order_by("start_time")
        slot_status = self.request.query_params.get("status")
        if slot_status and slot_status != "all":
            queryset = queryset.filter(status=slot_status)
        upcoming = self.request.query_params.get("upcoming")
        if upcoming == "true":
            queryset = queryset.filter(start_time__gte=timezone.now())
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(tutor__full_name__icontains=search)
                | Q(tutor__user__email__icontains=search)
                | Q(subject__name__icontains=search)
                | Q(meeting_link__icontains=search)
            )
        return queryset[:300]
