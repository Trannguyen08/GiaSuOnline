from django.urls import path
from .views import (
    TutorSettingsView,
    SubjectListView,
    TutorPublicListView,
    TutorPublicDetailView,
    TutorPublicReviewListView,
    TutorQuickSearchView,
)

urlpatterns = [
    path("settings/", TutorSettingsView.as_view(), name="tutor-settings"),
    path("subjects/", SubjectListView.as_view(), name="subject-list"),
    path("public/", TutorPublicListView.as_view(), name="tutor-public-list"),
    path("quick-search/", TutorQuickSearchView.as_view(), name="tutor-quick-search"),
    path(
        "public/<int:pk>/", TutorPublicDetailView.as_view(), name="tutor-public-detail"
    ),
    path(
        "public/<int:pk>/reviews/",
        TutorPublicReviewListView.as_view(),
        name="tutor-public-reviews",
    ),
]
