import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from decouple import config

from .models import OTP
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    OTPVerifySerializer,
    GoogleAuthSerializer,
    UserSerializer,
)
from .tasks import send_otp_email
from .services.tutor_registration import register_tutor

logger = logging.getLogger(__name__)
User = get_user_model()


def get_tokens_for_user(user):
    """Return JWT access + refresh tokens for a given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Register → sends OTP
# ─────────────────────────────────────────────────────────────────────────────
class RegisterView(APIView):
    """
    POST /api/auth/register/
    Body: { username, email, password, password_confirm, phone? }
    Creates an *inactive* account and sends a 6-digit OTP to the email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=serializer.validated_data['email']).exists():
            return Response(
                {'email': 'Email này đã được đăng ký.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user = serializer.save()
            user.is_active = False   # stays inactive until OTP verified
            user.save()

        # Fire OTP email via Celery (non-blocking)
        send_otp_email.delay(user.email)

        return Response(
            {
                'message': 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
                'email': user.email,
            },
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
# OTP Verify → activates account + returns tokens
# ─────────────────────────────────────────────────────────────────────────────
class VerifyOTPView(APIView):
    """
    POST /api/auth/verify-otp/
    Body: { email, code }
    Marks OTP as used, activates user, returns JWT.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        code  = serializer.validated_data['code']

        otp = (
            OTP.objects.filter(email=email, code=code, is_used=False)
            .order_by('-created_at')
            .first()
        )

        if not otp:
            return Response(
                {'error': 'Mã OTP không hợp lệ.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.expires_at < timezone.now():
            return Response(
                {'error': 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            otp.is_used = True
            otp.save()

            user = User.objects.filter(email=email).first()
            if not user:
                return Response({'error': 'Tài khoản không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

            user.is_active   = True
            user.is_verified = True
            user.save()

        tokens = get_tokens_for_user(user)
        return Response(
            {
                'message': 'Xác thực thành công.',
                'user': UserSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Resend OTP
# ─────────────────────────────────────────────────────────────────────────────
class ResendOTPView(APIView):
    """
    POST /api/auth/resend-otp/
    Body: { email }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

        if not User.objects.filter(email=email).exists():
            return Response({'error': 'Tài khoản không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        send_otp_email.delay(email)
        return Response({'message': 'Mã OTP mới đã được gửi.'}, status=status.HTTP_200_OK)


from .models import OTP

# ... (previous code)

# ─────────────────────────────────────────────────────────────────────────────
# Tutor Register → Uploads docs to S3
# ─────────────────────────────────────────────────────────────────────────────
class TutorRegisterView(APIView):
    """
    POST /api/auth/register/tutor/
    Body: multipart/form-data
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            profile = register_tutor(request.data, request.FILES)

            return Response({
                'message': 'Đăng ký hồ sơ gia sư thành công! Hồ sơ của bạn đang chờ quản trị viên phê duyệt.',
                'email': profile.user.email
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error during tutor registration: {str(e)}")
            return Response({'error': f'Có lỗi xảy ra: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# Login (email + password) → returns tokens
# ─────────────────────────────────────────────────────────────────────────────
class LoginView(APIView):
    """
    POST /api/auth/login/
    Body: { email, password }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email    = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = User.objects.filter(email=email).first()

        if not user or not user.check_password(password):
            return Response(
                {'error': 'Email hoặc mật khẩu không chính xác.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'error': 'Tài khoản chưa được kích hoạt.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # CHECK TUTOR APPROVAL
        if user.is_tutor:
            profile = getattr(user, 'tutor_profile', None)
            if not profile or profile.status != 'APPROVED':
                return Response(
                    {'error': 'Tài khoản gia sư của bạn đang chờ phê duyệt hoặc đã bị từ chối. Bạn không thể đăng nhập lúc này.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        tokens = get_tokens_for_user(user)
        return Response(
            {
                'message': 'Đăng nhập thành công.',
                'user': UserSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Google OAuth2 (id_token flow)
# ─────────────────────────────────────────────────────────────────────────────
class GoogleLoginView(APIView):
    """
    POST /api/auth/google/
    Body: { id_token: "<Google ID token from frontend>" }

    Flow:
      1. Frontend uses Google Sign-In JS SDK → receives id_token
      2. Sends that token here
      3. Backend verifies with Google, get/create user, return JWT
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['id_token']

        try:
            google_client_id = config('GOOGLE_CLIENT_ID')
            id_info = google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                google_client_id,
            )
        except ValueError as exc:
            logger.warning("Google id_token verification failed: %s", exc)
            return Response(
                {'error': 'Token Google không hợp lệ.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        google_id = id_info.get('sub')
        email     = id_info.get('email')
        name      = id_info.get('name', '')

        if not email:
            return Response({'error': 'Không lấy được email từ Google.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Try to find by google_id first, then by email
            user = User.objects.filter(google_id=google_id).first()
            if not user:
                user = User.objects.filter(email=email).first()

            if user:
                # Link google_id if not already linked
                if not user.google_id:
                    user.google_id = google_id
                    user.save(update_fields=['google_id'])
            else:
                # Create new user
                username = email.split('@')[0]
                # Ensure username is unique
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=None,          # no password for OAuth users
                    google_id=google_id,
                    is_active=True,
                    is_verified=True,
                )
                # Set display name from Google profile
                if name:
                    parts = name.split(' ', 1)
                    user.first_name = parts[0]
                    user.last_name  = parts[1] if len(parts) > 1 else ''
                    user.save(update_fields=['first_name', 'last_name'])

        tokens = get_tokens_for_user(user)
        return Response(
            {
                'message': 'Đăng nhập Google thành công.',
                'user': UserSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Logout (blacklist refresh token)
# ─────────────────────────────────────────────────────────────────────────────
class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { refresh: "<refresh_token>" }
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({'error': 'Token không hợp lệ hoặc đã hết hạn.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Đăng xuất thành công.'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Get / Update current user
# ─────────────────────────────────────────────────────────────────────────────
class MeView(APIView):
    """
    GET  /api/auth/me/   → return current user info
    PATCH /api/auth/me/  → update profile fields
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
