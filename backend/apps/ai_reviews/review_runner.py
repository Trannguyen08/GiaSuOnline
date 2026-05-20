import json

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import AIReview


class AIReviewRunner:
    """Delegates tutor profile analysis to the root ai_service and persists the result."""

    def run(self, review_id):
        review = AIReview.objects.select_related("tutor", "tutor__user").get(
            pk=review_id
        )
        review.status = AIReview.Status.PROCESSING
        review.error_message = ""
        review.save(update_fields=["status", "error_message", "updated_at"])

        try:
            result = self._call_ai_service(review.tutor)
            review.pass_score = result.get("pass_score", 0)
            review.risk_level = result.get("risk_level", AIReview.RiskLevel.HIGH)
            review.good_points = result.get("good_points", [])
            review.bad_points = result.get("bad_points", [])
            review.missing_fields = result.get("missing_fields", [])
            review.warning_flags = result.get("warning_flags", [])
            review.admin_suggestion = result.get("admin_suggestion", "")
            review.raw_ocr_result = result.get("raw_ocr_result", {})
            review.raw_ai_result = result.get("raw_ai_result", {})
            review.status = AIReview.Status.COMPLETED
            review.reviewed_at = timezone.now()
            review.error_message = ""
            review.save()
        except Exception as exc:
            review.status = AIReview.Status.FAILED
            review.error_message = str(exc)
            review.reviewed_at = timezone.now()
            review.save(
                update_fields=["status", "error_message", "reviewed_at", "updated_at"]
            )
            raise

        return review

    def _call_ai_service(self, tutor):
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}/ai/review-tutor-profile/"
        files = self._file_parts(tutor)
        try:
            response = requests.post(
                url,
                data={
                    "profile": json.dumps(
                        self._profile_payload(tutor), ensure_ascii=False
                    )
                },
                files=files,
                timeout=90,
            )
            response.raise_for_status()
            return response.json()
        finally:
            for _, file_tuple in files:
                handle = file_tuple[1]
                try:
                    handle.close()
                except Exception:
                    pass

    def _profile_payload(self, tutor):
        return {
            "id": tutor.id,
            "full_name": tutor.full_name,
            "birthday": tutor.birthday.isoformat() if tutor.birthday else "",
            "university": tutor.university,
            "qualification": tutor.qualification,
            "bio": getattr(tutor, "bio", ""),
            "address": tutor.address,
            "subjects_text": tutor.subjects_text,
            "experience_years": tutor.experience_years,
            "teaching_levels": tutor.teaching_levels,
            "teaching_region": tutor.teaching_region,
            "email": getattr(tutor.user, "email", ""),
            "phone": getattr(tutor.user, "phone", ""),
        }

    def _file_parts(self, tutor):
        parts = []
        self._append_file(parts, "portrait", getattr(tutor.user, "avatar", None))
        self._append_file(parts, "id_front", tutor.id_front)
        self._append_file(parts, "id_back", tutor.id_back)

        degree_images = (
            list(tutor.degree_images.all()) if hasattr(tutor, "degree_images") else []
        )
        if degree_images:
            for item in degree_images:
                self._append_file(parts, "certificates", item.image)
        else:
            self._append_file(parts, "certificates", tutor.degree_image)

        for item in tutor.achievements.all() if hasattr(tutor, "achievements") else []:
            self._append_file(parts, "certificates", item.image)

        return parts

    def _append_file(self, parts, field_name, file_field):
        if not file_field:
            return
        try:
            handle = file_field.open("rb")
        except Exception:
            return
        parts.append(
            (
                field_name,
                (
                    file_field.name.rsplit("/", 1)[-1],
                    handle,
                    "application/octet-stream",
                ),
            )
        )


def create_pending_review_for_tutor(tutor):
    with transaction.atomic():
        review = AIReview.objects.create(tutor=tutor, status=AIReview.Status.PENDING)
    from .tasks import run_ai_review

    run_ai_review.delay(review.id)
    return review
