from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admin_portal.views import IsAdminUser

from .models import AIReview
from .serializers import AIReviewSerializer
from .tasks import run_ai_review


class AdminAIReviewListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AIReviewSerializer

    def get_queryset(self):
        queryset = AIReview.objects.select_related("tutor", "tutor__user").order_by(
            "-created_at"
        )
        status_param = self.request.query_params.get("status")
        risk_level = self.request.query_params.get("risk_level")
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level.upper())
        return queryset


class AdminAIReviewDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AIReviewSerializer
    queryset = AIReview.objects.select_related("tutor", "tutor__user")


class AdminAIReviewRerunView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            review = AIReview.objects.get(pk=pk)
        except AIReview.DoesNotExist:
            return Response(
                {"error": "AI review not found"}, status=status.HTTP_404_NOT_FOUND
            )

        review.status = AIReview.Status.PENDING
        review.error_message = ""
        review.save(update_fields=["status", "error_message", "updated_at"])
        run_ai_review.delay(review.id)
        return Response(
            AIReviewSerializer(review).data, status=status.HTTP_202_ACCEPTED
        )
