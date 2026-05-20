from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/tutors/", include("apps.tutors.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/ai/", include("apps.ai_proxy.urls")),
    path("api/admin/", include("apps.admin_portal.urls")),
    path("api/courses/", include("apps.courses.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
