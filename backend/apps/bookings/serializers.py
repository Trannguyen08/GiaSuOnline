from rest_framework import serializers
from .models import Booking, TutorAvailability
from apps.users.serializers import UserSerializer

class BookingSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'student', 'student_details', 'tutor', 'subject', 
            'subject_name', 'start_time', 'end_time', 'status', 
            'total_price', 'notes'
        ]

class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ['id', 'tutor', 'day_of_week', 'start_time', 'end_time']
        read_only_fields = ['tutor']
