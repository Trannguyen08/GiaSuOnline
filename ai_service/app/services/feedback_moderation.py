import re

from pydantic import BaseModel, Field

from app.core.llm_provider import get_llm_provider
from app.schemas.feedback_moderation import (
    FeedbackModerationRequest,
    FeedbackModerationResult,
)


class LLMFeedbackDecision(BaseModel):
    approved: bool
    score: int = Field(ge=0, le=100)
    flags: list[str] = Field(default_factory=list)
    reason: str = ""
    summary: str = ""


class FeedbackModerationService:
    severe_terms = [
        "địt",
        "dm",
        "đm",
        "cặc",
        "lồn",
        "ngu",
        "óc chó",
        "fuck",
        "shit",
    ]
    spam_pattern = re.compile(r"(https?://|zalo|telegram|fb\.com|facebook|098\d{7}|09\d{8})", re.I)

    def moderate(self, payload: FeedbackModerationRequest) -> FeedbackModerationResult:
        heuristic = self._heuristic(payload)
        llm_result = self._llm(payload)
        if llm_result:
            flags = sorted(set(heuristic.flags + llm_result.flags))
            approved = llm_result.approved and not self._has_hard_block(flags)
            score = min(llm_result.score, heuristic.score)
            return FeedbackModerationResult(
                approved=approved,
                score=score,
                flags=flags,
                reason=llm_result.reason or heuristic.reason,
                summary=llm_result.summary,
                raw_ai_result=llm_result.model_dump(),
            )
        return heuristic

    def _heuristic(self, payload: FeedbackModerationRequest) -> FeedbackModerationResult:
        text = (payload.comment or "").strip()
        lowered = text.lower()
        flags = []
        if len(text) < 15:
            flags.append("too_short")
        words = lowered.split()
        if len(words) >= 5 and len(set(words)) <= 2:
            flags.append("repetitive")
        if any(term in lowered for term in self.severe_terms):
            flags.append("severe_profanity")
        if self.spam_pattern.search(text):
            flags.append("spam_or_contact")
        work_terms = [
            "học",
            "hoc",
            "dạy",
            "day",
            "buổi",
            "buoi",
            "bài",
            "bai",
            "tiến bộ",
            "tien bo",
            "đúng giờ",
            "dung gio",
            "thái độ",
            "thai do",
            "chuẩn bị",
            "chuan bi",
            "trao đổi",
            "trao doi",
            "gia su",
            "khoa hoc",
            "course",
            "lesson",
        ]
        if not any(term in lowered for term in work_terms):
            flags.append("off_topic")

        approved = not self._has_hard_block(flags) and len(flags) == 0
        return FeedbackModerationResult(
            approved=approved,
            score=90 if approved else 35,
            flags=flags,
            reason="Heuristic moderation completed.",
            summary="",
        )

    def _llm(self, payload: FeedbackModerationRequest) -> LLMFeedbackDecision | None:
        provider = get_llm_provider()
        system_prompt = (
            "You moderate Vietnamese tutoring-platform feedback after a completed course. "
            "Approve only feedback that is specific to learning/teaching behavior, useful, "
            "and free of spam, severe profanity, insults, harassment, contact ads, or off-topic content. "
            "Be stricter for insults and unrelated comments."
        )
        user_prompt = (
            f"Direction: {payload.direction}\n"
            f"Rating: {payload.rating}\n"
            f"Course: {payload.course_title}\n"
            f"Subject: {payload.subject}\n"
            f"Feedback: {payload.comment[:3000]}"
        )
        try:
            return provider.parse_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=LLMFeedbackDecision,
            )
        except Exception:
            return None

    def _has_hard_block(self, flags: list[str]) -> bool:
        return any(flag in flags for flag in ["severe_profanity", "spam_or_contact"])
