from django.urls import path
from .views import (
    TutorBookingsView,
    TutorAvailabilityView,
    TutorStudentsView,
    TutorTeachingSlotListCreateView,
    TutorTeachingSlotDetailView,
    PublicTutorSlotListView,
    StudentBookSlotView,
    StudentBookingHistoryView,
    TutorBookingDecisionView,
    BookingDepositPaymentView,
    BookingPaymentVerifyView,
)

urlpatterns = [
    path("tutor/bookings/", TutorBookingsView.as_view(), name="tutor-bookings"),
    path(
        "tutor/bookings/<int:pk>/decision/",
        TutorBookingDecisionView.as_view(),
        name="tutor-booking-decision",
    ),
    path(
        "tutor/availability/",
        TutorAvailabilityView.as_view(),
        name="tutor-availability",
    ),
    path("tutor/students/", TutorStudentsView.as_view(), name="tutor-students"),
    path(
        "tutor/slots/",
        TutorTeachingSlotListCreateView.as_view(),
        name="tutor-teaching-slots",
    ),
    path(
        "tutor/slots/<int:pk>/",
        TutorTeachingSlotDetailView.as_view(),
        name="tutor-teaching-slot-detail",
    ),
    path(
        "public/tutors/<int:tutor_id>/slots/",
        PublicTutorSlotListView.as_view(),
        name="public-tutor-slots",
    ),
    path(
        "student/slots/<int:slot_id>/book/",
        StudentBookSlotView.as_view(),
        name="student-book-slot",
    ),
    path(
        "student/bookings/",
        StudentBookingHistoryView.as_view(),
        name="student-booking-history",
    ),
    path(
        "student/bookings/<int:pk>/deposit/",
        BookingDepositPaymentView.as_view(),
        name="booking-deposit-payment",
    ),
    path(
        "student/payments/verify/",
        BookingPaymentVerifyView.as_view(),
        name="booking-payment-verify",
    ),
]
