from django.urls import path
from .views import (
    TutorSettingsView,
    TutorDashboardView,
    TutorGuaranteeStatusView,
    TutorGuaranteeDepositView,
    TutorCommissionPaymentView,
    TutorPayoutRequestListCreateView,
    AdminTutorCommissionDeductView,
    SubjectListView,
    TutorPublicListView,
    TutorPublicDetailView,
    TutorPublicReviewListView,
    TutorQuickSearchView,
)

urlpatterns = [
    path("dashboard/", TutorDashboardView.as_view(), name="tutor-dashboard"),
    path("settings/", TutorSettingsView.as_view(), name="tutor-settings"),
    path(
        "guarantee/",
        TutorGuaranteeStatusView.as_view(),
        name="tutor-guarantee-status",
    ),
    path(
        "guarantee/deposit/",
        TutorGuaranteeDepositView.as_view(),
        name="tutor-guarantee-deposit",
    ),
    path(
        "guarantee/commission/pay/",
        TutorCommissionPaymentView.as_view(),
        name="tutor-commission-payment",
    ),
    path(
        "payout-requests/",
        TutorPayoutRequestListCreateView.as_view(),
        name="tutor-payout-requests",
    ),
    path(
        "admin/<int:pk>/commission/deduct/",
        AdminTutorCommissionDeductView.as_view(),
        name="admin-tutor-commission-deduct",
    ),
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
