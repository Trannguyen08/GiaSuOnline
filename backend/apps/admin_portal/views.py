from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from apps.users.models import TutorProfile as UserTutorProfile
from apps.tutors.models import TutorProfile as TeachingProfile
from apps.bookings.models import Booking # Assuming this exists
from .serializers import AdminUserSerializer, AdminTutorProfileSerializer, AdminTutorRegistrationSerializer

User = get_user_model()

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

# Dashboard Stats
class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = {
            "total_users": User.objects.count(),
            "total_tutors": TeachingProfile.objects.count(),
            "pending_tutors": UserTutorProfile.objects.filter(status='PENDING').count(),
            "active_classes": 0, # Placeholder
            "monthly_revenue": 0, # Placeholder
        }
        # If bookings app exists and has models
        try:
            from apps.bookings.models import Booking
            data["active_classes"] = Booking.objects.filter(status='IN_PROGRESS').count()
            # data["monthly_revenue"] = Booking.objects.filter(status='COMPLETED').aggregate(Sum('total_price'))['total_price__sum'] or 0
        except ImportError:
            pass

        return Response(data)

# Tutor Management
class AdminTutorListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminTutorProfileSerializer

    def get_queryset(self):
        queryset = TeachingProfile.objects.all().select_related('user', 'user__tutor_profile').prefetch_related('tutor_subjects__subject')
        
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(user__tutor_profile__status=status_param.upper())
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(full_name__icontains=search) | queryset.filter(user__email__icontains=search)
            
        return queryset

from apps.users.tasks import send_account_lock_email

class AdminTutorActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        action = request.data.get('action')
        reason = request.data.get('reason', 'Vi phạm quy định hệ thống')
        try:
            profile = UserTutorProfile.objects.get(pk=pk)
            if action == 'approve':
                profile.status = 'APPROVED'
                profile.user.is_verified = True
                profile.user.save()
            elif action == 'reject':
                profile.status = 'REJECTED'
            elif action == 'lock':
                profile.user.is_active = False
                profile.user.save()
                # Send email notification
                send_account_lock_email.delay(profile.user.email, reason)
            elif action == 'unlock':
                profile.user.is_active = True
                profile.user.save()
            else:
                return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
            profile.save()
            return Response({"message": f"Tutor {action}ed successfully"})
        except UserTutorProfile.DoesNotExist:
            return Response({"error": "Tutor not found"}, status=status.HTTP_404_NOT_FOUND)

# User Management
class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by('-created_at')
        
        role = self.request.query_params.get('role')
        if role == 'tutor':
            queryset = queryset.filter(is_tutor=True)
        elif role == 'student':
            queryset = queryset.filter(is_tutor=False, is_staff=False)
        elif role == 'admin':
            queryset = queryset.filter(is_staff=True)
            
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(username__icontains=search) | queryset.filter(email__icontains=search)
            
        return queryset

class AdminUserActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        action = request.data.get('action')
        try:
            user = User.objects.get(pk=pk)
            if action == 'lock':
                user.is_active = False
            elif action == 'unlock':
                user.is_active = True
            elif action == 'delete':
                user.delete()
                return Response({"message": "User deleted successfully"})
            else:
                return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
            user.save()
            return Response({"message": f"User {action}ed successfully"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
