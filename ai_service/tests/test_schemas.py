import pytest
from pydantic import ValidationError

from app.schemas.tutor_search import (
    TimeRange,
    TutorSearchCriteria,
    TutorSearchParseRequest,
    TutorSearchParseResponse,
)


class TestTimeRange:
    def test_defaults_are_empty_strings(self):
        tr = TimeRange()
        assert tr.start == ""
        assert tr.end == ""

    def test_accepts_valid_time_strings(self):
        tr = TimeRange(start="08:00", end="10:30")
        assert tr.start == "08:00"
        assert tr.end == "10:30"

    def test_accepts_any_string_value(self):
        # The schema only specifies str, no format validation
        tr = TimeRange(start="not-a-time", end="also-not-a-time")
        assert tr.start == "not-a-time"

    def test_model_serialization(self):
        tr = TimeRange(start="09:00", end="11:00")
        data = tr.model_dump()
        assert data == {"start": "09:00", "end": "11:00"}


class TestTutorSearchCriteria:
    def test_all_defaults(self):
        c = TutorSearchCriteria()
        assert c.subjects == []
        assert c.student_status == ""
        assert c.goals == ""
        assert c.teaching_levels == []
        assert c.location == ""
        assert c.university == ""
        assert c.min_price is None
        assert c.max_price is None
        assert c.min_rating is None
        assert c.weekdays == []
        assert c.time_ranges == []
        assert c.teaching_mode == ""
        assert c.notes == ""

    def test_subjects_list(self):
        c = TutorSearchCriteria(subjects=["Toán", "Vật lý"])
        assert c.subjects == ["Toán", "Vật lý"]

    def test_weekdays_list_of_ints(self):
        c = TutorSearchCriteria(weekdays=[1, 3, 5])
        assert c.weekdays == [1, 3, 5]

    def test_price_fields(self):
        c = TutorSearchCriteria(min_price=100000, max_price=500000)
        assert c.min_price == 100000
        assert c.max_price == 500000

    def test_min_rating_float(self):
        c = TutorSearchCriteria(min_rating=4.5)
        assert c.min_rating == 4.5

    def test_time_ranges_list(self):
        c = TutorSearchCriteria(
            time_ranges=[TimeRange(start="08:00", end="10:00")]
        )
        assert len(c.time_ranges) == 1
        assert c.time_ranges[0].start == "08:00"

    def test_full_construction(self):
        c = TutorSearchCriteria(
            subjects=["Toán"],
            student_status="THPT",
            goals="Thi đại học",
            teaching_levels=["THPT"],
            location="Hà Nội",
            university="ĐHBK",
            min_price=200000,
            max_price=400000,
            min_rating=4.0,
            weekdays=[2, 4, 6],
            time_ranges=[TimeRange(start="18:00", end="20:00")],
            teaching_mode="online",
            notes="Cần gia sư kinh nghiệm",
        )
        assert c.location == "Hà Nội"
        assert c.teaching_mode == "online"
        assert c.max_price == 400000

    def test_serialization_includes_all_fields(self):
        c = TutorSearchCriteria(subjects=["Toán"], location="Đà Nẵng")
        data = c.model_dump()
        assert "subjects" in data
        assert "location" in data
        assert data["subjects"] == ["Toán"]
        assert data["location"] == "Đà Nẵng"

    def test_none_prices_serialized_correctly(self):
        c = TutorSearchCriteria()
        data = c.model_dump()
        assert data["min_price"] is None
        assert data["max_price"] is None

    def test_empty_subjects_list_accepted(self):
        c = TutorSearchCriteria(subjects=[])
        assert c.subjects == []


class TestTutorSearchParseRequest:
    def test_requires_prompt(self):
        with pytest.raises(ValidationError):
            TutorSearchParseRequest()  # type: ignore[call-arg]

    def test_accepts_prompt_string(self):
        req = TutorSearchParseRequest(prompt="Cần gia sư Toán")
        assert req.prompt == "Cần gia sư Toán"

    def test_empty_string_prompt(self):
        req = TutorSearchParseRequest(prompt="")
        assert req.prompt == ""

    def test_serialization(self):
        req = TutorSearchParseRequest(prompt="test")
        data = req.model_dump()
        assert data == {"prompt": "test"}


class TestTutorSearchParseResponse:
    def test_requires_criteria_and_used_llm(self):
        with pytest.raises(ValidationError):
            TutorSearchParseResponse()  # type: ignore[call-arg]

    def test_valid_construction_with_llm(self):
        criteria = TutorSearchCriteria(subjects=["Toán"])
        resp = TutorSearchParseResponse(criteria=criteria, used_llm=True)
        assert resp.used_llm is True
        assert resp.criteria.subjects == ["Toán"]

    def test_valid_construction_without_llm(self):
        resp = TutorSearchParseResponse(
            criteria=TutorSearchCriteria(), used_llm=False
        )
        assert resp.used_llm is False

    def test_criteria_is_tutor_search_criteria_type(self):
        resp = TutorSearchParseResponse(
            criteria=TutorSearchCriteria(location="Hà Nội"),
            used_llm=True,
        )
        assert isinstance(resp.criteria, TutorSearchCriteria)

    def test_serialization(self):
        resp = TutorSearchParseResponse(
            criteria=TutorSearchCriteria(subjects=["Hóa"]),
            used_llm=False,
        )
        data = resp.model_dump()
        assert data["used_llm"] is False
        assert data["criteria"]["subjects"] == ["Hóa"]