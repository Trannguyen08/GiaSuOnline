from django.urls import include, path
from .views import (
    AdminDashboardStatsView,
    AdminTutorListView,
    AdminTutorActionView,
    AdminUserListView,
    AdminUserActionView,
)

urlpatterns = [
    path("stats/", AdminDashboardStatsView.as_view(), name="admin-stats"),
    path("tutors/", AdminTutorListView.as_view(), name="admin-tutors-list"),
    path(
        "tutors/<int:pk>/action/",
        AdminTutorActionView.as_view(),
        name="admin-tutor-action",
    ),
    path("ai-reviews/", include("apps.ai_reviews.urls")),
    path("users/", AdminUserListView.as_view(), name="admin-users-list"),
    path(
        "users/<int:pk>/action/",
        AdminUserActionView.as_view(),
        name="admin-user-action",
    ),
]
