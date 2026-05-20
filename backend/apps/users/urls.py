from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    TutorRegisterView,
    VerifyOTPView,
    ResendOTPView,
    LoginView,
    GoogleLoginView,
    LogoutView,
    MeView,
)

urlpatterns = [
    # Standard auth
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("register/tutor/", TutorRegisterView.as_view(), name="auth-register-tutor"),
    path("verify-otp/", VerifyOTPView.as_view(), name="auth-verify-otp"),
    path("resend-otp/", ResendOTPView.as_view(), name="auth-resend-otp"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    # Google OAuth2
    path("google/", GoogleLoginView.as_view(), name="auth-google"),
    # JWT refresh
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Current user
    path("me/", MeView.as_view(), name="auth-me"),
]
