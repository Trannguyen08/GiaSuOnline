from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from datetime import date, timedelta

from .models import Course, CourseSession, SessionMaterial
from .serializers import (
    CourseListSerializer, CourseDetailSerializer,
    CourseCreateSerializer, CourseSessionSerializer,
    SessionMaterialSerializer
)


class StudentCourseListView(APIView):
    """Student: Xem danh sách khóa học của mình + summary tuần"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        courses = Course.objects.filter(
            student=request.user
        ).select_related('tutor', 'subject').prefetch_related('sessions')

        # Weekly summary
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        total_this_week = CourseSession.objects.filter(
            course__student=request.user,
            scheduled_date__range=[start_of_week, end_of_week]
        ).count()

        completed_this_week = CourseSession.objects.filter(
            course__student=request.user,
            scheduled_date__range=[start_of_week, end_of_week],
            student_completed=True
        ).count()

        total_completed_all = CourseSession.objects.filter(
            course__student=request.user,
            student_completed=True
        ).count()

        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return Response({
            'summary': {
                'total_this_week': total_this_week,
                'completed_this_week': completed_this_week,
                'total_completed_all': total_completed_all,
                'active_courses': courses.filter(status='active').count(),
            },
            'courses': serializer.data
        })


class StudentCourseDetailView(APIView):
    """Student: Xem chi tiết 1 khóa học + các buổi học"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, student=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Không tìm thấy khóa học'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseDetailSerializer(course, context={'request': request})
        return Response(serializer.data)


class StudentSessionCompleteView(APIView):
    """Student: Đánh dấu hoàn thành buổi học"""
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = CourseSession.objects.get(
                pk=session_id,
                course__student=request.user
            )
        except CourseSession.DoesNotExist:
            return Response({'error': 'Không tìm thấy buổi học'}, status=status.HTTP_404_NOT_FOUND)

        if session.student_completed:
            return Response({'message': 'Buổi học đã được đánh dấu hoàn thành trước đó'})

        session.mark_completed()
        return Response({
            'message': 'Đã đánh dấu hoàn thành buổi học!',
            'completed_at': session.student_completed_at
        })


# ─── TUTOR VIEWS ─────────────────────────────────────────────────────────────

class TutorCourseListView(APIView):
    """Tutor: Xem các khóa học mình đang dạy"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            tutor_profile = request.user.teaching_profile
        except Exception:
            return Response({'error': 'Không tìm thấy hồ sơ gia sư'}, status=status.HTTP_404_NOT_FOUND)

        courses = Course.objects.filter(
            tutor=tutor_profile
        ).select_related('student', 'subject').prefetch_related('sessions')

        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return Response({
            'courses': serializer.data,
            'total_students': courses.values('student').distinct().count(),
            'active_courses': courses.filter(status='active').count(),
        })


class TutorCourseDetailView(APIView):
    """Tutor: Xem chi tiết khóa học"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, tutor=request.user.teaching_profile)
        except Course.DoesNotExist:
            return Response({'error': 'Không tìm thấy khóa học'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CourseDetailSerializer(course, context={'request': request})
        return Response(serializer.data)


class TutorSessionUpdateView(APIView):
    """Tutor: Cập nhật nội dung buổi học (ghi chú, tải lên file, ảnh)"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, session_id):
        """Update tutor notes for session"""
        try:
            session = CourseSession.objects.get(
                pk=session_id,
                course__tutor=request.user.teaching_profile
            )
        except CourseSession.DoesNotExist:
            return Response({'error': 'Không tìm thấy buổi học'}, status=status.HTTP_404_NOT_FOUND)

        tutor_notes = request.data.get('tutor_notes', session.tutor_notes)
        title = request.data.get('title', session.title)
        session.tutor_notes = tutor_notes
        session.title = title
        session.save()

        serializer = CourseSessionSerializer(session, context={'request': request})
        return Response(serializer.data)


class TutorSessionMaterialUploadView(APIView):
    """Tutor: Upload tài liệu (file/ảnh/note/link) cho buổi học"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, session_id):
        try:
            session = CourseSession.objects.get(
                pk=session_id,
                course__tutor=request.user.teaching_profile
            )
        except CourseSession.DoesNotExist:
            return Response({'error': 'Không tìm thấy buổi học'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SessionMaterialSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(session=session, uploaded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, session_id):
        material_id = request.query_params.get('material_id')
        try:
            material = SessionMaterial.objects.get(
                pk=material_id,
                session__course__tutor=request.user.teaching_profile
            )
        except SessionMaterial.DoesNotExist:
            return Response({'error': 'Không tìm thấy tài liệu'}, status=status.HTTP_404_NOT_FOUND)

        material.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
