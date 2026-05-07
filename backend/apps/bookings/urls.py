from django.urls import path
from .views import TutorBookingsView, TutorAvailabilityView, TutorStudentsView

urlpatterns = [
    path('tutor/bookings/', TutorBookingsView.as_view(), name='tutor-bookings'),
    path('tutor/availability/', TutorAvailabilityView.as_view(), name='tutor-availability'),
    path('tutor/students/', TutorStudentsView.as_view(), name='tutor-students'),
]
