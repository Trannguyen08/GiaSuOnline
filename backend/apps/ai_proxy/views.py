import logging

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


logger = logging.getLogger(__name__)

ALLOWED_DOCUMENT_TYPES = {
    "portrait",
    "identity_card_front",
    "identity_card_back",
    "degree",
    "certificate",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


class ImagePrecheckProxyView(APIView):
    """Forwards temporary image precheck uploads to the AI service."""

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get("image") or request.FILES.get("file")
        document_type = request.data.get("document_type")

        if not image:
            return Response({"error": "Không tìm thấy file ảnh."}, status=status.HTTP_400_BAD_REQUEST)
        if document_type not in ALLOWED_DOCUMENT_TYPES:
            return Response({"error": "document_type không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        if image.size > MAX_FILE_SIZE:
            return Response({"error": "Dung lượng ảnh vượt quá 5MB."}, status=status.HTTP_400_BAD_REQUEST)

        suffix = f".{image.name.rsplit('.', 1)[-1].lower()}" if "." in image.name else ""
        if suffix not in ALLOWED_EXTENSIONS:
            return Response(
                {"error": "Định dạng ảnh không hợp lệ. Chỉ hỗ trợ jpg, jpeg, png, webp."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        url = f"{settings.AI_SERVICE_URL.rstrip('/')}/ai/precheck-image/"
        try:
            response = requests.post(
                url,
                data={"document_type": document_type},
                files={"image": (image.name, image, image.content_type)},
                timeout=12,
            )
        except requests.RequestException as exc:
            logger.warning("AI image precheck failed: %s", exc)
            return Response(
                {
                    "is_valid": False,
                    "score": 50,
                    "can_submit": True,
                    "document_type": document_type,
                    "issues": ["Chưa thể kiểm tra tự động ảnh lúc này."],
                    "suggestions": ["Bạn vẫn có thể gửi hồ sơ nếu ảnh rõ nét, đủ sáng và đúng loại giấy tờ."],
                },
                status=status.HTTP_200_OK,
            )

        try:
            payload = response.json()
        except ValueError:
            logger.warning("AI image precheck returned non-JSON response: %s", response.text[:200])
            return Response({"error": "AI service trả về dữ liệu không hợp lệ."}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=response.status_code)
