from django.urls import include, path
from .booking_views import (
    AdminBookingActionView,
    AdminBookingListView,
    AdminPaymentOverviewView,
    AdminTeachingSlotListView,
)
from .quality_views import (
    AdminReviewActionView,
    AdminReviewListView,
    AdminViolationActionView,
    AdminViolationListCreateView,
)
from .system_views import (
    AdminNotificationOverviewView,
    AdminReportView,
    AdminSystemSettingListView,
    AdminSystemSettingUpdateView,
)
from .views import (
    AdminCourseActionView,
    AdminCourseListView,
    AdminDashboardStatsView,
    AdminFinanceOverviewView,
    AdminFinanceTutorActionView,
    AdminTutorListView,
    AdminTutorActionView,
    AdminUserListView,
    AdminUserActionView,
)

urlpatterns = [
    path("stats/", AdminDashboardStatsView.as_view(), name="admin-stats"),
    path("courses/", AdminCourseListView.as_view(), name="admin-courses-list"),
    path(
        "courses/<int:pk>/action/",
        AdminCourseActionView.as_view(),
        name="admin-course-action",
    ),
    path("finance/", AdminFinanceOverviewView.as_view(), name="admin-finance"),
    path(
        "finance/tutors/<int:pk>/action/",
        AdminFinanceTutorActionView.as_view(),
        name="admin-finance-tutor-action",
    ),
    path("bookings/", AdminBookingListView.as_view(), name="admin-bookings-list"),
    path(
        "bookings/<int:pk>/action/",
        AdminBookingActionView.as_view(),
        name="admin-booking-action",
    ),
    path("payments/", AdminPaymentOverviewView.as_view(), name="admin-payments"),
    path("slots/", AdminTeachingSlotListView.as_view(), name="admin-slots-list"),
    path("reviews/", AdminReviewListView.as_view(), name="admin-reviews-list"),
    path(
        "reviews/<int:pk>/action/",
        AdminReviewActionView.as_view(),
        name="admin-review-action",
    ),
    path("violations/", AdminViolationListCreateView.as_view(), name="admin-violations-list"),
    path(
        "violations/<int:pk>/action/",
        AdminViolationActionView.as_view(),
        name="admin-violation-action",
    ),
    path("reports/", AdminReportView.as_view(), name="admin-reports"),
    path("settings/", AdminSystemSettingListView.as_view(), name="admin-settings"),
    path(
        "settings/<slug:key>/",
        AdminSystemSettingUpdateView.as_view(),
        name="admin-setting-update",
    ),
    path("notifications/", AdminNotificationOverviewView.as_view(), name="admin-notifications"),
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
