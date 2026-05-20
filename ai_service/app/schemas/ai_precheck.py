from typing import List, Literal

from pydantic import BaseModel, Field


DocumentType = Literal[
    "portrait",
    "identity_card_front",
    "identity_card_back",
    "degree",
    "certificate",
]


class ImagePrecheckResponse(BaseModel):
    is_valid: bool
    score: int = Field(ge=0, le=100)
    can_submit: bool
    document_type: DocumentType
    issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
