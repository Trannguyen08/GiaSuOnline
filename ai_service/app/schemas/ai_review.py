from typing import Any, Dict, List

from pydantic import BaseModel, Field


class AIReviewResult(BaseModel):
    pass_score: int = Field(ge=0, le=100)
    risk_level: str
    good_points: List[str] = Field(default_factory=list)
    bad_points: List[str] = Field(default_factory=list)
    missing_fields: List[str] = Field(default_factory=list)
    warning_flags: List[str] = Field(default_factory=list)
    admin_suggestion: str = ""
    raw_ocr_result: Dict[str, Any] = Field(default_factory=dict)
    raw_ai_result: Dict[str, Any] = Field(default_factory=dict)
