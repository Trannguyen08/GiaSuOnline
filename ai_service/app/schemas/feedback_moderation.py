from typing import Any, Dict, List

from pydantic import BaseModel, Field


class FeedbackModerationRequest(BaseModel):
    id: int | None = None
    direction: str = Field(default="student_to_tutor")
    rating: int = Field(ge=1, le=5)
    comment: str
    course_title: str = ""
    subject: str = ""


class FeedbackModerationResult(BaseModel):
    approved: bool
    score: int = Field(ge=0, le=100)
    flags: List[str] = Field(default_factory=list)
    reason: str = ""
    summary: str = ""
    raw_ai_result: Dict[str, Any] = Field(default_factory=dict)
