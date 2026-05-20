from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from .models import Booking, TutorAvailability, TeachingSlot
from .serializers import (
    BookingSerializer,
    TutorAvailabilitySerializer,
    TeachingSlotSerializer,
)
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model
from apps.tutors.models import TutorSubject
from apps.courses.models import Course, CourseSession

User = get_user_model()


class TutorBookingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        bookings = Booking.objects.filter(tutor=request.user.tutor_profile).order_by(
            "-start_time"
        )
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class TutorAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        availabilities = TutorAvailability.objects.filter(
            tutor=request.user.tutor_profile
        )
        serializer = TutorAvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

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
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get unique students from bookings
        student_ids = (
            Booking.objects.filter(tutor=request.user.tutor_profile)
            .values_list("student", flat=True)
            .distinct()
        )

        students = User.objects.filter(id__in=student_ids)
        serializer = UserSerializer(students, many=True)

        # We could enhance this with progress data if we had a dedicated model
        return Response(serializer.data)


class TutorTeachingSlotListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        slots = (
            TeachingSlot.objects.filter(tutor=request.user.teaching_profile)
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        return Response(serializer.data)

    def post(self, request):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TeachingSlotSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(tutor=request.user.teaching_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TutorTeachingSlotDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            slot = TeachingSlot.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status == "booked":
            return Response(
                {"error": "Booked slots cannot be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TeachingSlotSerializer(
            slot, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not request.user.is_tutor:
            return Response(
                {"error": "Only tutors can access this"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            slot = TeachingSlot.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status == "booked":
            return Response(
                {"error": "Booked slots cannot be deleted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicTutorSlotListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tutor_id):
        slots = (
            TeachingSlot.objects.filter(
                tutor_id=tutor_id,
                status="available",
            )
            .select_related("subject", "tutor")
            .order_by("start_time")
        )
        serializer = TeachingSlotSerializer(
            slots, many=True, context={"request": request}
        )
        return Response(serializer.data)


class StudentBookSlotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, slot_id):
        try:
            slot = (
                TeachingSlot.objects.select_for_update()
                .select_related("tutor", "subject")
                .get(pk=slot_id)
            )
        except TeachingSlot.DoesNotExist:
            return Response(
                {"error": "Slot not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if slot.status != "available":
            return Response(
                {"error": "Slot is no longer available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject_id = request.data.get("subject") or getattr(slot.subject, "id", None)
        if not subject_id:
            return Response(
                {"subject": "Please choose a subject for this schedule."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tutor_subject = TutorSubject.objects.select_related("subject").get(
                tutor=slot.tutor,
                subject_id=subject_id,
            )
        except TutorSubject.DoesNotExist:
            return Response(
                {"subject": "This tutor does not teach the selected subject."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking = Booking.objects.create(
            student=request.user,
            tutor=slot.tutor,
            subject=tutor_subject.subject,
            start_time=slot.start_time,
            end_time=slot.end_time,
            total_price=slot.price or tutor_subject.hourly_rate,
            notes=request.data.get("notes", ""),
            teaching_slot=slot,
            status="confirmed",
        )
        slot.status = "booked"
        slot.save(update_fields=["status"])

        course = Course.objects.create(
            student=request.user,
            tutor=slot.tutor,
            subject=tutor_subject.subject,
            title=f"{tutor_subject.subject.name} với {slot.tutor.full_name or slot.tutor.user.username}",
            description=request.data.get("notes", ""),
            total_sessions=1,
            session_duration_minutes=max(
                30, int((slot.end_time - slot.start_time).total_seconds() // 60)
            ),
            schedule_time=slot.start_time.strftime("%d/%m/%Y %H:%M"),
            start_date=slot.start_time.date(),
            end_date=slot.end_time.date(),
            hourly_rate=tutor_subject.hourly_rate,
            status="active",
        )
        CourseSession.objects.create(
            course=course,
            session_number=1,
            title="Buổi học đầu tiên",
            scheduled_date=slot.start_time.date(),
            scheduled_time=slot.start_time.time(),
        )

        serializer = BookingSerializer(booking, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
