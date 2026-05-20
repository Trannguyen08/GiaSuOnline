from django.urls import path
from .views import (
    TutorBookingsView,
    TutorAvailabilityView,
    TutorStudentsView,
    TutorTeachingSlotListCreateView,
    TutorTeachingSlotDetailView,
    PublicTutorSlotListView,
    StudentBookSlotView,
)

urlpatterns = [
    path("tutor/bookings/", TutorBookingsView.as_view(), name="tutor-bookings"),
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
]
