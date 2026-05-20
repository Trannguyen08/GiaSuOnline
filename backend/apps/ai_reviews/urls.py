from django.urls import path

from .views import (
    AdminAIReviewDetailView,
    AdminAIReviewListView,
    AdminAIReviewRerunView,
)

urlpatterns = [
    path("", AdminAIReviewListView.as_view(), name="admin-ai-reviews-list"),
    path(
        "<int:pk>/", AdminAIReviewDetailView.as_view(), name="admin-ai-reviews-detail"
    ),
    path(
        "<int:pk>/rerun/",
        AdminAIReviewRerunView.as_view(),
        name="admin-ai-reviews-rerun",
    ),
]
