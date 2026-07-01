from fastapi import APIRouter

from app.schemas.feedback_moderation import (
    FeedbackModerationRequest,
    FeedbackModerationResult,
)
from app.services.feedback_moderation import FeedbackModerationService


router = APIRouter(prefix="/ai", tags=["feedback-moderation"])
service = FeedbackModerationService()


@router.post("/moderate-feedback/", response_model=FeedbackModerationResult)
async def moderate_feedback(payload: FeedbackModerationRequest):
    return service.moderate(payload)
