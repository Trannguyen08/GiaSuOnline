from django.urls import path
from .views import TutorSettingsView, SubjectListView

urlpatterns = [
    path('settings/', TutorSettingsView.as_view(), name='tutor-settings'),
    path('subjects/', SubjectListView.as_view(), name='subject-list'),
    path('public/', TutorPublicListView.as_view(), name='tutor-public-list'),
    path('public/<int:pk>/', TutorPublicDetailView.as_view(), name='tutor-public-detail'),
]
