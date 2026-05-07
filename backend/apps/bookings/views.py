from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from .models import Booking, TutorAvailability
from .serializers import BookingSerializer, TutorAvailabilitySerializer
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class TutorBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response({"error": "Only tutors can access this"}, status=status.HTTP_403_FORBIDDEN)
        
        bookings = Booking.objects.filter(tutor=request.user.tutor_profile).order_by('-start_time')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)

class TutorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response({"error": "Only tutors can access this"}, status=status.HTTP_403_FORBIDDEN)
        
        availabilities = TutorAvailability.objects.filter(tutor=request.user.tutor_profile)
        serializer = TutorAvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_tutor:
            return Response({"error": "Only tutors can access this"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TutorAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(tutor=request.user.tutor_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TutorStudentsView(APIView):
    """
    Returns a list of students who have booked this tutor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response({"error": "Only tutors can access this"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get unique students from bookings
        student_ids = Booking.objects.filter(
            tutor=request.user.tutor_profile
        ).values_list('student', flat=True).distinct()
        
        students = User.objects.filter(id__in=student_ids)
        serializer = UserSerializer(students, many=True)
        
        # We could enhance this with progress data if we had a dedicated model
        return Response(serializer.data)
