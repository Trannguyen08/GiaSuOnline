from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.courses.models import CourseReview

from .models import ViolationCase
from .serializers import AdminCourseReviewSerializer, AdminViolationCaseSerializer
from .views import IsAdminUser


class AdminReviewListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminCourseReviewSerializer

    def get_queryset(self):
        queryset = CourseReview.objects.select_related(
            "course__subject", "student", "tutor__user"
        ).order_by("-created_at")
        min_rating = self.request.query_params.get("min_rating")
        max_rating = self.request.query_params.get("max_rating")
        if min_rating:
            queryset = queryset.filter(rating__gte=min_rating)
        if max_rating:
            queryset = queryset.filter(rating__lte=max_rating)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(comment__icontains=search)
                | Q(student__email__icontains=search)
                | Q(tutor__full_name__icontains=search)
                | Q(course__title__icontains=search)
            )
        return queryset


class AdminReviewActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        action = request.data.get("action")
        if action != "delete":
            return Response({"error": "Invalid review action."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            review = CourseReview.objects.select_related("tutor").get(pk=pk)
        except CourseReview.DoesNotExist:
            return Response({"error": "Review not found"}, status=status.HTTP_404_NOT_FOUND)
        tutor = review.tutor
        review.delete()
        stats = CourseReview.objects.filter(tutor=tutor).aggregate(avg=Sum("rating"), count=Count("id"))
        count = stats["count"] or 0
        tutor.total_reviews = count
        tutor.rating_avg = (stats["avg"] or 0) / count if count else 0
        tutor.save(update_fields=["rating_avg", "total_reviews"])
        return Response({"message": "Review deleted successfully"})


class AdminViolationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminViolationCaseSerializer

    def get_queryset(self):
        queryset = ViolationCase.objects.select_related(
            "reporter", "target_user", "booking", "course"
        )
        status_param = self.request.query_params.get("status")
        severity = self.request.query_params.get("severity")
        if status_param and status_param != "all":
            queryset = queryset.filter(status=status_param)
        if severity and severity != "all":
            queryset = queryset.filter(severity=severity)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(target_user__email__icontains=search)
                | Q(reporter__email__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminViolationActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            case = ViolationCase.objects.get(pk=pk)
        except ViolationCase.DoesNotExist:
            return Response({"error": "Violation case not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")
        if action not in ["open", "investigating", "resolved", "dismissed", "lock_user", "unlock_user"]:
            return Response({"error": "Invalid violation action."}, status=status.HTTP_400_BAD_REQUEST)
        if action in ["lock_user", "unlock_user"]:
            if not case.target_user:
                return Response({"error": "No target user to update."}, status=status.HTTP_400_BAD_REQUEST)
            case.target_user.is_active = action == "unlock_user"
            case.target_user.save(update_fields=["is_active"])
        else:
            case.status = action
            if action in ["resolved", "dismissed"]:
                case.resolved_by = request.user
                case.resolved_at = timezone.now()
                case.resolution_note = request.data.get("note", case.resolution_note)
            case.save()
        return Response(AdminViolationCaseSerializer(case).data)
