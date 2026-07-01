from __future__ import annotations

import io
import json
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Dict, Iterable, List, Optional

from PIL import Image

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - optional native packages
    cv2 = None
    np = None

try:
    import pytesseract
except Exception:  # pragma: no cover - optional native packages
    pytesseract = None

from app.core.config import settings
from app.schemas.ai_review import AIReviewResult


REQUIRED_FIELDS = [
    "full_name",
    "birthday",
    "university",
    "qualification",
    "address",
    "subjects_text",
    "bio",
]


@dataclass
class ReviewInput:
    complete_profile: bool = False
    has_portrait: bool = False
    has_id_card: bool = False
    identity_number_valid: bool = False
    has_certificate: bool = False
    id_ocr_readable: bool = False
    certificate_ocr_readable: bool = False
    identity_matches_form: bool = False
    certificate_matches_name: bool = False
    portrait_authentic: bool = False
    face_match: bool = False
    description_ok: bool = False
    has_serious_flags: bool = False
    missing_fields: List[str] = field(default_factory=list)
    warning_flags: List[str] = field(default_factory=list)
    unreadable_files: int = 0


class OCRService:
    """OCR abstraction in the AI service; Tesseract fallback keeps it keyless."""

    def extract_text(self, content: bytes) -> str:
        if not content:
            return ""
        if settings.google_vision_enabled:
            try:
                from google.cloud import vision

                client = vision.ImageAnnotatorClient()
                response = client.text_detection(image=vision.Image(content=content))
                return response.full_text_annotation.text or ""
            except Exception:
                pass
        if pytesseract is None:
            return ""
        try:
            image = Image.open(io.BytesIO(content)).convert("RGB")
            return pytesseract.image_to_string(image, lang="vie+eng", timeout=5) or ""
        except Exception:
            return ""

    def extract_identity_info(self, content: bytes) -> Dict[str, str]:
        text = self.extract_text(content)
        return {
            "text": text,
            "full_name": self._extract_likely_name(text),
            "birthday": self._extract_date(text),
        }

    def _extract_likely_name(self, text: str) -> str:
        lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
        for line in lines:
            normalized = strip_accents(line.lower())
            if any(keyword in normalized for keyword in ["ho va ten", "full name", "name"]):
                parts = re.split(r"[:\-]", line, maxsplit=1)
                if len(parts) == 2:
                    return parts[1].strip()
        candidates = [line for line in lines if len(line.split()) >= 2 and not re.search(r"\d", line)]
        return candidates[0] if candidates else ""

    def _extract_date(self, text: str) -> str:
        match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text or "")
        return match.group(1) if match else ""


class FaceMatchingService:
    """Compares face crops with OpenCV histogram similarity when possible."""

    def compare_faces(self, id_card_image: bytes, portrait_image: bytes) -> Dict[str, object]:
        if settings.aws_rekognition_enabled:
            try:
                import boto3

                client = boto3.client("rekognition", region_name=settings.aws_region or None)
                response = client.compare_faces(
                    SourceImage={"Bytes": portrait_image},
                    TargetImage={"Bytes": id_card_image},
                    SimilarityThreshold=70,
                )
                similarity = max([item.get("Similarity", 0) for item in response.get("FaceMatches", [])] or [0])
                return {"score": similarity, "is_match": similarity >= 70, "provider": "aws", "raw": response}
            except Exception as exc:
                return {"score": None, "is_match": False, "provider": "aws", "error": str(exc)}
        if cv2 is None or np is None or not id_card_image or not portrait_image:
            return {"score": None, "is_match": False, "provider": "opencv-disabled"}
        try:
            id_face = self._largest_face(id_card_image)
            portrait_face = self._largest_face(portrait_image)
            if id_face is None or portrait_face is None:
                return {"score": None, "is_match": False, "provider": "opencv", "reason": "face_not_found"}
            score = self._histogram_similarity(id_face, portrait_face)
            return {"score": score, "is_match": score >= 70, "provider": "opencv"}
        except Exception as exc:
            return {"score": None, "is_match": False, "provider": "opencv", "error": str(exc)}

    def _largest_face(self, content: bytes):
        arr = np.frombuffer(content, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return None
        cascade_path = getattr(cv2.data, "haarcascades", "") + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        if detector.empty():
            return None
        faces = detector.detectMultiScale(image, scaleFactor=1.1, minNeighbors=4, minSize=(32, 32))
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
        return cv2.resize(image[y : y + h, x : x + w], (96, 96))

    def _histogram_similarity(self, left, right) -> float:
        left_hist = cv2.calcHist([left], [0], None, [64], [0, 256])
        right_hist = cv2.calcHist([right], [0], None, [64], [0, 256])
        cv2.normalize(left_hist, left_hist)
        cv2.normalize(right_hist, right_hist)
        correlation = cv2.compareHist(left_hist, right_hist, cv2.HISTCMP_CORREL)
        return max(0, min(100, round((correlation + 1) * 50, 2)))


class ImageAuthenticityService:
    """Lightweight file readability and over-processing heuristic."""

    def analyze(self, content: bytes) -> Dict[str, object]:
        if not content:
            return {"score": 0, "is_authentic": False, "issues": ["UNREADABLE_FILE"]}
        try:
            image = Image.open(io.BytesIO(content)).convert("RGB")
            image.verify()
            image = Image.open(io.BytesIO(content)).convert("RGB")
            score = 85
            issues: List[str] = []
            if cv2 is not None and np is not None:
                arr = np.array(image.convert("L"))
                edge_density = float(np.mean(cv2.Canny(arr, 100, 200) > 0))
                if edge_density > 0.22:
                    score -= 25
                    issues.append("LOW_IMAGE_AUTHENTICITY")
            return {"score": score, "is_authentic": score >= 60, "issues": issues}
        except Exception:
            return {"score": 20, "is_authentic": False, "issues": ["UNREADABLE_FILE"]}


class LLMReviewService:
    """Description analysis; OpenAI is optional and heuristic fallback is always available."""

    external_contact_pattern = re.compile(r"(\b\d{9,11}\b|zalo|telegram|facebook|fb\.com|http://|https://)", re.I)

    def analyze_description(self, text: str) -> Dict[str, object]:
        text = (text or "").strip()
        result: Dict[str, object] = {
            "is_long_enough": len(text) >= 80,
            "is_spam": self._looks_spammy(text),
            "has_external_contact": bool(self.external_contact_pattern.search(text)),
            "notes": [],
        }
        if not text:
            result["notes"].append("Chưa có mô tả bản thân.")
        elif len(text) < 80:
            result["notes"].append("Mô tả bản thân còn ngắn.")

        if settings.openai_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=settings.openai_api_key)
                prompt = (
                    "Review this Vietnamese tutor self-description. Return compact JSON "
                    "with keys is_spam, has_external_contact, notes. Text: "
                    f"{text[:2000]}"
                )
                response = client.chat.completions.create(
                    model=settings.openai_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                )
                parsed = json.loads((response.choices[0].message.content or "{}").strip("` \n"))
                result.update({key: parsed[key] for key in parsed.keys() & result.keys()})
            except Exception:
                pass
        return result

    def summarize_admin_suggestion(self, review_data: Dict[str, object]) -> str:
        score = int(review_data.get("pass_score", 0))
        flags = review_data.get("warning_flags", [])
        if score >= 80 and not flags:
            return "AI gợi ý: hồ sơ có độ tin cậy tốt. Admin vẫn cần kiểm tra thủ công trước khi duyệt."
        if "IDENTITY_MISMATCH" in flags or "FACE_MISMATCH" in flags:
            return "AI gợi ý: cần kiểm tra kỹ danh tính trước khi quyết định duyệt hoặc yêu cầu bổ sung."
        if score < 60:
            return "AI gợi ý: hồ sơ rủi ro cao, nên yêu cầu gia sư bổ sung hoặc upload lại tài liệu rõ hơn."
        return "AI gợi ý: hồ sơ có một số cảnh báo, admin nên xem chi tiết trước khi duyệt."

    def _looks_spammy(self, text: str) -> bool:
        lowered = text.lower()
        return lowered.count("http") > 0 or lowered.count("zalo") > 0 or len(re.findall(r"\d{9,11}", text)) > 0


class ScoringService:
    """Calculates review score and risk level from normalized review signals."""

    def calculate_score(self, input_data) -> Dict[str, object]:
        data = input_data if isinstance(input_data, ReviewInput) else ReviewInput(**input_data)
        score = 0
        good_points: List[str] = []
        bad_points: List[str] = []

        def add(condition, points, good, bad=None):
            nonlocal score
            if condition:
                score += points
                good_points.append(good)
            elif bad:
                bad_points.append(bad)

        add(data.complete_profile, 10, "Thông tin cá nhân tương đối đầy đủ.", "Thiếu một số thông tin cá nhân.")
        add(data.has_portrait, 10, "Có ảnh chân dung.", "Thiếu ảnh chân dung.")
        add(data.has_id_card and data.id_ocr_readable, 15, "CCCD có thể OCR được hoặc đã nhập số CCCD hợp lệ.", "Thiếu CCCD hoặc OCR CCCD không đọc được.")
        add(data.has_certificate and data.certificate_ocr_readable, 15, "Bằng cấp/chứng chỉ có thể OCR được.", "Thiếu bằng cấp/chứng chỉ hoặc OCR không đọc được.")
        add(data.identity_matches_form, 15, "Thông tin CCCD khớp form.", "Thông tin CCCD chưa khớp form.")
        add(data.certificate_matches_name, 10, "Bằng cấp/chứng chỉ khớp tên gia sư.", "Tên trên bằng cấp/chứng chỉ chưa khớp.")
        add(data.portrait_authentic, 10, "Ảnh chân dung có vẻ hợp lệ.", "Ảnh chân dung có dấu hiệu không hợp lệ.")
        add(data.face_match, 10, "Khuôn mặt CCCD khớp ảnh chân dung.", "Chưa xác nhận được khuôn mặt khớp.")
        add(data.description_ok, 10, "Mô tả bản thân đủ tốt.", "Mô tả bản thân ngắn hoặc có dấu hiệu spam.")
        add(not data.has_serious_flags, 5, "Không có warning flag nghiêm trọng.", "Có warning flag nghiêm trọng.")

        penalties = {
            "MISSING_ID_CARD": 25,
            "MISSING_PORTRAIT": 15,
            "MISSING_CERTIFICATE": 15,
            "OCR_FAILED": 10,
            "IDENTITY_MISMATCH": 30,
            "CERTIFICATE_NAME_MISMATCH": 25,
            "FACE_MISMATCH": 30,
            "LOW_IMAGE_AUTHENTICITY": 25,
            "SPAM_DESCRIPTION": 20,
            "EXTERNAL_CONTACT_OR_ADVERTISEMENT": 20,
            "UNREADABLE_FILE": 10,
        }
        for flag in set(data.warning_flags):
            score -= penalties.get(flag, 0)
        score -= max(0, data.unreadable_files) * 10

        return {"pass_score": max(0, min(100, score)), "good_points": good_points, "bad_points": bad_points}

    def calculate_risk_level(self, score: int) -> str:
        if score >= 80:
            return "LOW"
        if score >= 60:
            return "MEDIUM"
        return "HIGH"


class AIReviewService:
    """Runs the full tutor profile review inside ai_service."""

    def __init__(self):
        self.ocr = OCRService()
        self.face_matching = FaceMatchingService()
        self.authenticity = ImageAuthenticityService()
        self.llm = LLMReviewService()
        self.scoring = ScoringService()

    def review(self, profile: Dict[str, object], files: Dict[str, object]) -> AIReviewResult:
        warning_flags: List[str] = []
        raw_ocr: Dict[str, object] = {}
        raw_ai: Dict[str, object] = {}
        missing_fields = [field for field in REQUIRED_FIELDS if not profile.get(field)]
        unreadable_files = 0

        portrait = self._content(files.get("portrait"))
        id_front = self._content(files.get("id_front"))
        id_back = self._content(files.get("id_back"))
        certificates = [content for content in (self._content(file) for file in files.get("certificates", [])) if content]
        cccd_number = re.sub(r"\s+", "", str(profile.get("cccd_number", "") or ""))
        identity_number_valid = bool(re.fullmatch(r"\d{12}", cccd_number))

        has_portrait = bool(portrait)
        has_physical_id_card = bool(id_front and id_back)
        has_id_card = has_physical_id_card or identity_number_valid
        has_certificate = bool(certificates)
        if not has_portrait:
            warning_flags.append("MISSING_PORTRAIT")
        if not has_id_card:
            warning_flags.append("MISSING_ID_CARD")
        if not has_certificate:
            warning_flags.append("MISSING_CERTIFICATE")

        id_info = self.ocr.extract_identity_info(id_front) if has_physical_id_card else {"text": "", "full_name": "", "birthday": ""}
        id_back_text = self.ocr.extract_text(id_back) if has_physical_id_card else ""
        raw_ocr["identity_card_front"] = id_info
        raw_ocr["identity_card_back"] = {"text": id_back_text}
        raw_ai["identity_number"] = {"provided": bool(cccd_number), "is_valid": identity_number_valid}
        id_ocr_readable = bool((id_info.get("text") or "").strip()) or identity_number_valid
        if has_physical_id_card and not id_ocr_readable:
            warning_flags.append("OCR_FAILED")

        certificate_texts = []
        for index, content in enumerate(certificates):
            text = self.ocr.extract_text(content)
            certificate_texts.append(text)
            raw_ocr[f"certificate_{index + 1}"] = {"text": text}
        certificate_ocr_readable = any(text.strip() for text in certificate_texts)
        if has_certificate and not certificate_ocr_readable:
            warning_flags.append("OCR_FAILED")

        identity_matches = identity_number_valid or self._identity_matches_form(profile, id_info)
        if has_physical_id_card and id_ocr_readable and not identity_matches:
            warning_flags.append("IDENTITY_MISMATCH")

        certificate_matches = self._certificate_matches_name(str(profile.get("full_name", "")), certificate_texts)
        if has_certificate and certificate_ocr_readable and not certificate_matches:
            warning_flags.append("CERTIFICATE_NAME_MISMATCH")

        portrait_authenticity = self.authenticity.analyze(portrait) if has_portrait else {"is_authentic": False}
        raw_ai["portrait_authenticity"] = portrait_authenticity
        if has_portrait and not portrait_authenticity.get("is_authentic"):
            warning_flags.append("LOW_IMAGE_AUTHENTICITY")
            unreadable_files += 1 if "UNREADABLE_FILE" in portrait_authenticity.get("issues", []) else 0

        face_result = self.face_matching.compare_faces(id_front, portrait) if has_physical_id_card and has_portrait else {"is_match": False}
        raw_ai["face_matching"] = face_result
        face_match = bool(face_result.get("is_match"))
        if has_physical_id_card and has_portrait and face_result.get("score") is not None and not face_match:
            warning_flags.append("FACE_MISMATCH")

        description_result = self.llm.analyze_description(str(profile.get("bio", "")))
        raw_ai["description"] = description_result
        if description_result.get("is_spam"):
            warning_flags.append("SPAM_DESCRIPTION")
        if description_result.get("has_external_contact"):
            warning_flags.append("EXTERNAL_CONTACT_OR_ADVERTISEMENT")

        serious_flags = {
            "IDENTITY_MISMATCH",
            "CERTIFICATE_NAME_MISMATCH",
            "FACE_MISMATCH",
            "LOW_IMAGE_AUTHENTICITY",
            "SPAM_DESCRIPTION",
            "EXTERNAL_CONTACT_OR_ADVERTISEMENT",
        }
        review_input = ReviewInput(
            complete_profile=not missing_fields,
            has_portrait=has_portrait,
            has_id_card=has_id_card,
            identity_number_valid=identity_number_valid,
            has_certificate=has_certificate,
            id_ocr_readable=id_ocr_readable,
            certificate_ocr_readable=certificate_ocr_readable,
            identity_matches_form=identity_matches,
            certificate_matches_name=certificate_matches,
            portrait_authentic=bool(portrait_authenticity.get("is_authentic")),
            face_match=face_match,
            description_ok=bool(description_result.get("is_long_enough")) and not bool(description_result.get("is_spam")),
            has_serious_flags=bool(serious_flags & set(warning_flags)),
            missing_fields=missing_fields,
            warning_flags=warning_flags,
            unreadable_files=unreadable_files,
        )
        scoring = self.scoring.calculate_score(review_input)
        payload = {
            **scoring,
            "risk_level": self.scoring.calculate_risk_level(scoring["pass_score"]),
            "missing_fields": missing_fields,
            "warning_flags": sorted(set(warning_flags)),
            "raw_ocr_result": raw_ocr,
            "raw_ai_result": raw_ai,
        }
        payload["admin_suggestion"] = self.llm.summarize_admin_suggestion(payload)
        return AIReviewResult(**payload)

    def _identity_matches_form(self, profile: Dict[str, object], id_info: Dict[str, str]) -> bool:
        name = id_info.get("full_name") or id_info.get("text") or ""
        name_matches = normalized_similarity(str(profile.get("full_name", "")), name) >= 0.72
        birthday = str(profile.get("birthday") or "")
        id_birthday = id_info.get("birthday") or ""
        birthday_matches = not birthday or not id_birthday or birthday[-4:] in id_birthday
        return name_matches and birthday_matches

    def _certificate_matches_name(self, full_name: str, certificate_texts: Iterable[str]) -> bool:
        return any(normalized_similarity(full_name, text) >= 0.55 or full_name.lower() in text.lower() for text in certificate_texts)

    def _content(self, uploaded_file: Optional[object]) -> bytes:
        if not uploaded_file:
            return b""
        if isinstance(uploaded_file, bytes):
            return uploaded_file
        if hasattr(uploaded_file, "file"):
            return uploaded_file.file.read()
        return b""


def normalized_similarity(left: str, right: str) -> float:
    left = re.sub(r"\s+", " ", (left or "").strip().lower())
    right = re.sub(r"\s+", " ", (right or "").strip().lower())
    if not left or not right:
        return 0
    return SequenceMatcher(None, left, right).ratio()


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d")
