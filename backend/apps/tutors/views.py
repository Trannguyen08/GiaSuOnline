from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import TutorProfile, Subject
from .serializers import TutorProfileSerializer, SubjectSerializer

class TutorSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(profile)
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            # Create profile if it doesn't exist (for existing users)
            profile = TutorProfile.objects.create(user=request.user)
            serializer = TutorProfileSerializer(profile)
            return Response(serializer.data)

    def patch(self, request):
        try:
            profile = request.user.teaching_profile
            serializer = TutorProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor profile not found"}, status=status.HTTP_404_NOT_FOUND)

class SubjectListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data)

class TutorPublicListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = TutorProfile.objects.filter(is_available=True)
        
        # Filtering
        subject_id = request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(tutor_subjects__subject_id=subject_id)
            
        level = request.query_params.get('level')
        if level:
            queryset = queryset.filter(tutor_subjects__level=level)
            
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search) | queryset.filter(title__icontains=search)

        serializer = TutorProfileSerializer(queryset.distinct(), many=True)
        return Response(serializer.data)

class TutorPublicDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            profile = TutorProfile.objects.get(pk=pk, is_available=True)
            serializer = TutorProfileSerializer(profile)
            return Response(serializer.data)
        except TutorProfile.DoesNotExist:
            return Response({"error": "Tutor not found"}, status=status.HTTP_404_NOT_FOUND)
