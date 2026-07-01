import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from django.conf import settings
from django.utils import timezone

from .models import CourseReview, TutorStudentFeedback


APPROVE_THRESHOLD = 70


def moderate_feedback_instance(instance):
    payload = {
        "id": instance.id,
        "direction": "student_to_tutor"
        if isinstance(instance, CourseReview)
        else "tutor_to_student",
        "rating": instance.rating,
        "comment": instance.comment,
        "course_title": instance.course.title,
        "subject": instance.course.subject.name if instance.course.subject else "",
    }
    result = _call_ai_service(payload)
    approved = bool(result.get("approved")) and int(result.get("score") or 0) >= APPROVE_THRESHOLD
    instance.moderation_status = (
        instance.ModerationStatus.APPROVED
        if approved
        else instance.ModerationStatus.REJECTED
    )
    instance.moderation_score = max(0, min(100, int(result.get("score") or 0)))
    instance.moderation_flags = result.get("flags") or []
    instance.moderation_reason = result.get("reason") or ""
    instance.moderation_raw = result
    instance.moderated_at = timezone.now()
    instance.save(
        update_fields=[
            "moderation_status",
            "moderation_score",
            "moderation_flags",
            "moderation_reason",
            "moderation_raw",
            "moderated_at",
        ]
    )
    return instance


def mark_moderation_failed(instance, message):
    instance.moderation_status = instance.ModerationStatus.FAILED
    instance.moderation_reason = message
    instance.moderated_at = timezone.now()
    instance.save(
        update_fields=["moderation_status", "moderation_reason", "moderated_at"]
    )


def _call_ai_service(payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urlrequest.Request(
        f"{settings.AI_SERVICE_URL.rstrip('/')}/ai/moderate-feedback/",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        fallback = _fallback_moderation(payload.get("comment", ""))
        fallback["provider_error"] = str(exc)
        return fallback


def _fallback_moderation(comment):
    text = (comment or "").strip()
    lowered = text.lower()
    flags = []
    if len(text) < 15:
        flags.append("too_short")
    if len(set(lowered.split())) <= 2 and len(lowered.split()) > 4:
        flags.append("repetitive")
    severe_terms = ["địt", "dm", "đm", "cặc", "lồn", "ngu", "óc chó"]
    if any(term in lowered for term in severe_terms):
        flags.append("severe_profanity")
    spam_terms = ["http://", "https://", "zalo", "telegram", "fb.com"]
    if any(term in lowered for term in spam_terms):
        flags.append("spam_contact")
    approved = not flags
    return {
        "approved": approved,
        "score": 85 if approved else 30,
        "flags": flags,
        "reason": "Heuristic moderation fallback.",
        "summary": "",
    }
