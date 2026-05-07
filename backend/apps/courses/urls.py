from django.urls import path
from .views import (
    StudentCourseListView, StudentCourseDetailView, StudentSessionCompleteView,
    TutorCourseListView, TutorCourseDetailView,
    TutorSessionUpdateView, TutorSessionMaterialUploadView,
)

urlpatterns = [
    # Student endpoints
    path('student/', StudentCourseListView.as_view(), name='student-courses'),
    path('student/<int:pk>/', StudentCourseDetailView.as_view(), name='student-course-detail'),
    path('sessions/<int:session_id>/complete/', StudentSessionCompleteView.as_view(), name='session-complete'),

    # Tutor endpoints
    path('tutor/', TutorCourseListView.as_view(), name='tutor-courses'),
    path('tutor/<int:pk>/', TutorCourseDetailView.as_view(), name='tutor-course-detail'),
    path('tutor/sessions/<int:session_id>/update/', TutorSessionUpdateView.as_view(), name='tutor-session-update'),
    path('tutor/sessions/<int:session_id>/materials/', TutorSessionMaterialUploadView.as_view(), name='tutor-session-materials'),
]
