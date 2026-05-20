from django.urls import path

from .views import ImagePrecheckProxyView

urlpatterns = [
    path("precheck-image/", ImagePrecheckProxyView.as_view(), name="ai-precheck-image"),
]
