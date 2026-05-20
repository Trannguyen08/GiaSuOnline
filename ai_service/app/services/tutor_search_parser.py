import re

from app.core.llm_provider import LLMProvider
from app.schemas.tutor_search import TimeRange, TutorSearchCriteria
from app.utils.text import normalize_text


SYSTEM_PROMPT = """
You extract tutor search criteria from Vietnamese user text.
Return only structured data. Keep fields empty when the user did not mention them.
Weekday numbers: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.
Normalize school levels to one of: Tiểu học, THCS, THPT, Đại học, Người đi làm.
Use HH:MM 24-hour format for times.
For price, infer VND per hour. For example 300k means 300000.
"""


class TutorSearchParser:
    def __init__(self, llm_provider: LLMProvider) -> None:
        self.llm_provider = llm_provider

    def parse(self, prompt: str) -> tuple[TutorSearchCriteria, bool]:
        try:
            parsed = self.llm_provider.parse_structured(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=prompt,
                response_model=TutorSearchCriteria,
            )
            if parsed:
                return parsed, True
        except Exception:
            pass

        return self.heuristic_parse(prompt), False

    def heuristic_parse(self, prompt: str) -> TutorSearchCriteria:
        text = prompt.lower()
        normalized = normalize_text(prompt)

        return TutorSearchCriteria(
            subjects=self._extract_subjects(normalized),
            student_status=prompt,
            teaching_levels=self._extract_levels(normalized),
            weekdays=self._extract_weekdays(normalized),
            time_ranges=self._extract_time_ranges(normalized),
            max_price=self._extract_max_price(normalized),
            min_rating=4 if "tốt" in text or "uy tín" in text else None,
            location=self._find_region(normalized),
        )

    def _extract_subjects(self, normalized: str) -> list[str]:
        subjects = []
        subject_map = {
            "toan": "Toán",
            "vat ly": "Vật lý",
            "ly": "Vật lý",
            "hoa": "Hóa",
            "ngu van": "Ngữ văn",
            "van": "Ngữ văn",
            "tieng anh": "Tiếng Anh",
            "anh van": "Tiếng Anh",
            "ielts": "IELTS",
            "toeic": "TOEIC",
            "lap trinh": "Lập trình",
            "python": "Python",
        }
        for needle, label in subject_map.items():
            if re.search(rf"(^|\W){re.escape(needle)}(\W|$)", normalized) and label not in subjects:
                subjects.append(label)
        return subjects

    def _extract_levels(self, normalized: str) -> list[str]:
        levels = []
        level_map = {
            "tieu hoc": "Tiểu học",
            "thcs": "THCS",
            "cap 2": "THCS",
            "lop 6": "THCS",
            "lop 7": "THCS",
            "lop 8": "THCS",
            "lop 9": "THCS",
            "thpt": "THPT",
            "cap 3": "THPT",
            "lop 10": "THPT",
            "lop 11": "THPT",
            "lop 12": "THPT",
            "dai hoc": "Đại học",
            "nguoi di lam": "Người đi làm",
        }
        for needle, label in level_map.items():
            if needle in normalized and label not in levels:
                levels.append(label)
        return levels

    def _extract_weekdays(self, normalized: str) -> list[int]:
        weekdays = []
        day_map = {
            "chu nhat": 0,
            "cn": 0,
            "thu 2": 1,
            "thu hai": 1,
            "thu 3": 2,
            "thu ba": 2,
            "thu 4": 3,
            "thu tu": 3,
            "thu 5": 4,
            "thu nam": 4,
            "thu 6": 5,
            "thu sau": 5,
            "thu 7": 6,
            "thu bay": 6,
        }
        for needle, day in day_map.items():
            if needle in normalized and day not in weekdays:
                weekdays.append(day)
        return weekdays

    def _extract_time_ranges(self, normalized: str) -> list[TimeRange]:
        time_ranges = []
        matches = re.findall(
            r"(\d{1,2})(?:h|:)(\d{0,2})?\s*(?:-|den|toi|tới)\s*(\d{1,2})(?:h|:)(\d{0,2})?",
            normalized,
        )
        for start_h, start_m, end_h, end_m in matches:
            time_ranges.append(
                TimeRange(
                    start=f"{int(start_h):02d}:{int(start_m or 0):02d}",
                    end=f"{int(end_h):02d}:{int(end_m or 0):02d}",
                )
            )
        return time_ranges

    def _extract_max_price(self, normalized: str) -> int | None:
        price_match = re.search(r"(?:duoi|toi da|khoang|<=?)\s*(\d+)\s*k", normalized)
        if price_match:
            return int(price_match.group(1)) * 1000
        return None

    def _find_region(self, normalized: str) -> str:
        region_map = {
            "ha noi": "Hà Nội",
            "tp ho chi minh": "TP Hồ Chí Minh",
            "ho chi minh": "TP Hồ Chí Minh",
            "sai gon": "TP Hồ Chí Minh",
            "da nang": "Đà Nẵng",
            "hai phong": "Hải Phòng",
            "can tho": "Cần Thơ",
        }
        for needle, region in region_map.items():
            if needle in normalized:
                return region
        return ""

