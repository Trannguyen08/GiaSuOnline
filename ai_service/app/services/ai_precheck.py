from __future__ import annotations

import io
import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable

from PIL import Image, ImageStat, UnidentifiedImageError

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - depends on optional native packages
    cv2 = None
    np = None

try:
    import pytesseract
except Exception:  # pragma: no cover - depends on optional native packages
    pytesseract = None

from app.schemas.ai_precheck import DocumentType, ImagePrecheckResponse


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MIN_WIDTH = 640
MIN_HEIGHT = 480
DOC_TYPES_WITH_TEXT = {"identity_card_front", "identity_card_back", "degree", "certificate"}
LENIENT_DOCUMENT_TYPES = {"certificate"}
DOC_TYPE_RULES = {
    "identity_card_front": {
        "keywords": ["can cuoc", "cong dan", "cccd", "identity card", "id card", "ngay sinh", "date of birth"],
        "issue": "Ảnh trong khung CCCD mặt trước không giống giấy căn cước công dân.",
    },
    "identity_card_back": {
        "keywords": ["dac diem", "nhan dang", "ngay cap", "noi cap", "cuc canh sat", "can cuoc", "identity card"],
        "issue": "Ảnh trong khung CCCD mặt sau không giống mặt sau CCCD.",
    },
    "degree": {
        "keywords": ["bang", "tot nghiep", "cu nhan", "thac si", "dai hoc", "degree", "diploma", "university"],
        "issue": "Ảnh trong khung bằng cấp không giống bằng cấp hoặc bảng điểm.",
    },
    "certificate": {
        "keywords": ["chung nhan", "chung chi", "certificate", "award", "giai", "thuong", "ielts", "toeic", "toefl"],
        "issue": "Ảnh trong khung thành tích không giống chứng nhận, giải thưởng hoặc thành tích.",
    },
}


@dataclass
class ImageMetrics:
    width: int
    height: int
    blur_score: float | None
    brightness: float
    text: str = ""
    face_count: int | None = None


class ImagePrecheckService:
    """Scores temporary uploaded images without persisting them."""

    def validate_upload(self, filename: str, content_type: str | None, content: bytes) -> list[str]:
        issues: list[str] = []
        suffix = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
        if not content:
            issues.append("Không tìm thấy file ảnh.")
        if suffix not in ALLOWED_EXTENSIONS:
            issues.append("Định dạng ảnh không hợp lệ. Chỉ hỗ trợ jpg, jpeg, png, webp.")
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            issues.append("MIME type của file không phải ảnh được hỗ trợ.")
        if len(content) > MAX_FILE_SIZE:
            issues.append("Dung lượng ảnh vượt quá 5MB.")
        return issues

    def precheck(self, filename: str, content_type: str | None, content: bytes, document_type: DocumentType) -> ImagePrecheckResponse:
        issues = self.validate_upload(filename, content_type, content)
        suggestions: list[str] = []
        if issues:
            return self._response(document_type, 0, issues, self._suggestions(document_type, issues))

        try:
            image = Image.open(io.BytesIO(content))
            image.verify()
            image = Image.open(io.BytesIO(content)).convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError):
            issues.append("File ảnh không đọc được hoặc đã bị hỏng.")
            return self._response(document_type, 0, issues, self._suggestions(document_type, issues))

        metrics = self._analyze_image(image, document_type)
        score = 20
        has_readable_text = self._has_basic_text(metrics.text)
        is_identity_card = document_type.startswith("identity_card")

        if document_type in LENIENT_DOCUMENT_TYPES:
            if metrics.width < 360 or metrics.height < 240:
                score -= 5
                issues.append("Ảnh hơi nhỏ, nhưng vẫn có thể gửi nếu nội dung nhìn được.")
            else:
                score += 8
        elif metrics.width >= MIN_WIDTH and metrics.height >= MIN_HEIGHT:
            score += 15
        else:
            score -= 15
            issues.append("Kích thước ảnh quá nhỏ.")

        if metrics.blur_score is None:
            suggestions.append("Không thể kiểm tra độ mờ bằng OpenCV, hệ thống chỉ đánh giá các tiêu chí còn lại.")
        elif has_readable_text and is_identity_card:
            score += 20
        elif metrics.blur_score >= (55 if document_type in LENIENT_DOCUMENT_TYPES else 90):
            score += 20
        else:
            score -= 12 if document_type in LENIENT_DOCUMENT_TYPES else 30
            issues.append(self._label(document_type, "hơi mờ", "Ảnh hơi mờ"))

        brightness_min, brightness_max = (35, 230) if document_type in LENIENT_DOCUMENT_TYPES else (55, 205)
        if brightness_min <= metrics.brightness <= brightness_max:
            score += 15
        else:
            score -= 8 if document_type in LENIENT_DOCUMENT_TYPES else 20
            issues.append("Ảnh quá tối hoặc quá sáng.")

        if self._looks_not_cropped(image, document_type):
            score += 10
        else:
            issues.append("Ảnh có thể bị cắt mất phần quan trọng.")

        if document_type == "portrait":
            if metrics.face_count is None:
                suggestions.append("Không thể kiểm tra khuôn mặt bằng OpenCV, vui lòng đảm bảo ảnh thấy rõ mặt.")
            elif metrics.face_count > 0:
                score += 20
            else:
                score -= 30
                issues.append("Không phát hiện khuôn mặt trong ảnh chân dung.")
                if has_readable_text:
                    score -= 20
                    issues.append("Ảnh có vẻ là giấy tờ, không phải ảnh chân dung.")
        else:
            if has_readable_text:
                score += 20
            else:
                score -= 25
                issues.append("Không đọc rõ chữ cơ bản trên giấy tờ.")

            if self._matches_expected_document_type(document_type, metrics.text, image):
                score += 15
            else:
                score -= 15 if document_type in LENIENT_DOCUMENT_TYPES else 35
                issues.append(DOC_TYPE_RULES[document_type]["issue"])

        score = max(0, min(100, score))
        suggestions.extend(self._suggestions(document_type, issues))
        return self._response(document_type, score, issues, suggestions)

    def _analyze_image(self, image: Image.Image, document_type: str) -> ImageMetrics:
        gray = image.convert("L")
        blur_score = self._blur_score(gray)
        brightness = ImageStat.Stat(gray).mean[0]
        text = self._ocr_text(image) if document_type in DOC_TYPES_WITH_TEXT or document_type == "portrait" else ""
        face_count = self._detect_faces(gray) if document_type == "portrait" else None
        return ImageMetrics(image.width, image.height, blur_score, brightness, text, face_count)

    def _blur_score(self, gray: Image.Image) -> float | None:
        if cv2 is None or np is None:
            return None
        arr = np.array(gray)
        return float(cv2.Laplacian(arr, cv2.CV_64F).var())

    def _ocr_text(self, image: Image.Image) -> str:
        if pytesseract is None:
            return ""
        try:
            return pytesseract.image_to_string(image, lang="vie+eng", timeout=3)
        except Exception:
            return ""

    def _detect_faces(self, gray: Image.Image) -> int | None:
        if cv2 is None or np is None:
            return None
        cascade_path = getattr(cv2.data, "haarcascades", "") + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        if detector.empty():
            return None
        faces = detector.detectMultiScale(np.array(gray), scaleFactor=1.1, minNeighbors=4, minSize=(48, 48))
        return len(faces)

    def _looks_not_cropped(self, image: Image.Image, document_type: str = "") -> bool:
        if document_type.startswith("identity_card"):
            return self._identity_card_has_safe_margin(image)
        gray = image.convert("L")
        w, h = gray.size
        border = max(6, min(w, h) // 40)
        stat = ImageStat.Stat(gray.crop((border, border, w - border, h - border)))
        edge_regions = [
            gray.crop((0, 0, w, border)),
            gray.crop((0, h - border, w, h)),
            gray.crop((0, 0, border, h)),
            gray.crop((w - border, 0, w, h)),
        ]
        edge_delta = max(abs(ImageStat.Stat(region).mean[0] - stat.mean[0]) for region in edge_regions)
        return edge_delta < 75

    def _identity_card_has_safe_margin(self, image: Image.Image) -> bool:
        gray = image.convert("L")
        w, h = gray.size
        border = max(4, min(w, h) // 60)
        regions = [
            gray.crop((0, 0, w, border)),
            gray.crop((0, h - border, w, h)),
            gray.crop((0, 0, border, h)),
            gray.crop((w - border, 0, w, h)),
        ]
        edge_means = [ImageStat.Stat(region).mean[0] for region in regions]
        # Full-frame CCCD photos often place the card close to the image edge.
        # Only flag crop risk when multiple borders are very dark/bright, which
        # usually indicates content is cut off rather than simply tightly framed.
        extreme_edges = sum(mean < 18 or mean > 238 for mean in edge_means)
        return extreme_edges < 2

    def _has_basic_text(self, text: str) -> bool:
        compact = re.sub(r"\s+", "", text or "")
        return len(compact) >= 8

    def _matches_expected_document_type(self, document_type: str, text: str, image: Image.Image) -> bool:
        normalized = strip_accents(text)
        if document_type.startswith("identity_card"):
            ratio = image.width / max(image.height, 1)
            has_identity_number = bool(re.search(r"\b\d{9}(\d{3})?\b", normalized))
            has_keyword = self._has_any_keyword(normalized, DOC_TYPE_RULES[document_type]["keywords"])
            return (has_identity_number or has_keyword) and 1.25 <= ratio <= 2.05
        return self._has_any_keyword(normalized, DOC_TYPE_RULES[document_type]["keywords"])

    def _has_any_keyword(self, text: str, keywords: Iterable[str]) -> bool:
        return any(keyword in text for keyword in keywords)

    def _label(self, document_type: str, doc_text: str, generic_text: str) -> str:
        if document_type.startswith("identity_card"):
            return f"Ảnh CCCD {doc_text}."
        if document_type == "degree":
            return f"Ảnh bằng cấp {doc_text}."
        if document_type == "certificate":
            return f"Ảnh chứng chỉ {doc_text}."
        return generic_text

    def _suggestions(self, document_type: str, issues: Iterable[str]) -> list[str]:
        suggestions = []
        issue_text = " ".join(issues)
        if "mờ" in issue_text or "đọc rõ chữ" in issue_text:
            suggestions.append("Vui lòng chụp lại trong môi trường đủ sáng và giữ máy chắc tay.")
        if "tối" in issue_text or "sáng" in issue_text:
            suggestions.append("Tránh ánh sáng ngược, bóng đổ mạnh hoặc đèn flash quá gắt.")
        if "Kích thước" in issue_text:
            suggestions.append("Upload ảnh có độ phân giải tối thiểu 640x480.")
        if document_type == "portrait":
            suggestions.append("Chụp chính diện, rõ mặt, không đeo khẩu trang hoặc che khuôn mặt.")
        else:
            suggestions.append("Đặt giấy tờ trên nền phẳng và chụp đủ 4 góc.")
        return list(dict.fromkeys(suggestions))

    def _response(self, document_type: DocumentType, score: int, issues: list[str], suggestions: list[str]) -> ImagePrecheckResponse:
        is_valid = score >= 75
        return ImagePrecheckResponse(
            is_valid=is_valid,
            score=score,
            can_submit=score >= 50,
            document_type=document_type,
            issues=issues,
            suggestions=suggestions,
        )


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", (value or "").lower())
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d")
