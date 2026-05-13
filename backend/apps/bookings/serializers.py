from rest_framework import serializers
from .models import Booking, TutorAvailability, TeachingSlot
from apps.users.serializers import UserSerializer

class BookingSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.full_name', read_only=True)
    slot_id = serializers.IntegerField(source='teaching_slot_id', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'student', 'student_details', 'tutor', 'subject', 
            'subject_name', 'start_time', 'end_time', 'status', 
            'total_price', 'notes', 'teaching_slot', 'slot_id', 'tutor_name', 'created_at'
        ]
        read_only_fields = ['student', 'status', 'created_at']

class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ['id', 'tutor', 'day_of_week', 'start_time', 'end_time']
        read_only_fields = ['tutor']


class TeachingSlotSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    tutor_name = serializers.CharField(source='tutor.full_name', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = TeachingSlot
        fields = [
            'id', 'tutor', 'tutor_name', 'subject', 'subject_name',
            'start_time', 'end_time', 'price', 'meeting_link', 'note',
            'status', 'student_name', 'created_at'
        ]
        read_only_fields = ['id', 'tutor', 'status', 'student_name', 'created_at']

    def get_student_name(self, obj):
        booking = getattr(obj, 'booking', None)
        if not booking:
            return None
        return booking.student.get_full_name() or booking.student.username or booking.student.email

    def validate(self, attrs):
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        return attrs
