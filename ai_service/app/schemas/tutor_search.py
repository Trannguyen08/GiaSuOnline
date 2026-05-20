from typing import List, Optional

from pydantic import BaseModel, Field


class TimeRange(BaseModel):
    start: str = Field(default="", description="HH:MM")
    end: str = Field(default="", description="HH:MM")


class TutorSearchCriteria(BaseModel):
    subjects: List[str] = Field(default_factory=list)
    student_status: str = ""
    goals: str = ""
    teaching_levels: List[str] = Field(default_factory=list)
    location: str = ""
    university: str = ""
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    min_rating: Optional[float] = None
    weekdays: List[int] = Field(default_factory=list, description="0=Sunday, 1=Monday, ..., 6=Saturday")
    time_ranges: List[TimeRange] = Field(default_factory=list)
    teaching_mode: str = ""
    notes: str = ""


class TutorSearchParseRequest(BaseModel):
    prompt: str


class TutorSearchParseResponse(BaseModel):
    criteria: TutorSearchCriteria
    used_llm: bool

