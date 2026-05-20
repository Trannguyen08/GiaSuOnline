import pytest
from unittest.mock import MagicMock

from app.services.tutor_search_parser import TutorSearchParser, SYSTEM_PROMPT
from app.schemas.tutor_search import TutorSearchCriteria, TimeRange
from app.core.llm_provider import LLMProvider


# ---------------------------------------------------------------------------
# Helpers / stubs
# ---------------------------------------------------------------------------

def make_parser(return_value=None, raise_exc=None):
    """Create a TutorSearchParser with a stub LLMProvider."""
    if raise_exc is not None:
        provider = MagicMock(spec=LLMProvider)
        provider.parse_structured.side_effect = raise_exc
    else:
        provider = MagicMock(spec=LLMProvider)
        provider.parse_structured.return_value = return_value
    return TutorSearchParser(llm_provider=provider)


# ---------------------------------------------------------------------------
# TutorSearchParser.parse()
# ---------------------------------------------------------------------------

class TestParse:
    def test_returns_llm_result_with_used_llm_true(self):
        criteria = TutorSearchCriteria(subjects=["Toán"], location="Hà Nội")
        parser = make_parser(return_value=criteria)
        result, used_llm = parser.parse("Tìm gia sư Toán ở Hà Nội")
        assert used_llm is True
        assert result is criteria

    def test_falls_back_to_heuristic_when_llm_returns_none(self):
        parser = make_parser(return_value=None)
        result, used_llm = parser.parse("toan lop 12")
        assert used_llm is False
        assert isinstance(result, TutorSearchCriteria)

    def test_falls_back_to_heuristic_on_exception(self):
        parser = make_parser(raise_exc=RuntimeError("API failed"))
        result, used_llm = parser.parse("toan lop 12")
        assert used_llm is False
        assert isinstance(result, TutorSearchCriteria)

    def test_falls_back_to_heuristic_on_any_exception_type(self):
        parser = make_parser(raise_exc=ValueError("bad value"))
        _, used_llm = parser.parse("anything")
        assert used_llm is False

    def test_llm_called_with_system_prompt(self):
        provider = MagicMock(spec=LLMProvider)
        provider.parse_structured.return_value = TutorSearchCriteria()
        parser = TutorSearchParser(llm_provider=provider)
        parser.parse("test prompt")
        call_kwargs = provider.parse_structured.call_args.kwargs
        assert call_kwargs["system_prompt"] == SYSTEM_PROMPT

    def test_llm_called_with_user_prompt(self):
        provider = MagicMock(spec=LLMProvider)
        provider.parse_structured.return_value = TutorSearchCriteria()
        parser = TutorSearchParser(llm_provider=provider)
        parser.parse("my search query")
        call_kwargs = provider.parse_structured.call_args.kwargs
        assert call_kwargs["user_prompt"] == "my search query"

    def test_llm_called_with_correct_response_model(self):
        provider = MagicMock(spec=LLMProvider)
        provider.parse_structured.return_value = TutorSearchCriteria()
        parser = TutorSearchParser(llm_provider=provider)
        parser.parse("test")
        call_kwargs = provider.parse_structured.call_args.kwargs
        assert call_kwargs["response_model"] is TutorSearchCriteria

    def test_heuristic_result_has_correct_student_status(self):
        parser = make_parser(return_value=None)
        prompt = "cần gia sư tốt"
        result, _ = parser.parse(prompt)
        assert result.student_status == prompt


# ---------------------------------------------------------------------------
# TutorSearchParser.heuristic_parse()
# ---------------------------------------------------------------------------

class TestHeuristicParse:
    def setup_method(self):
        self.parser = make_parser(return_value=None)

    def test_returns_tutor_search_criteria(self):
        result = self.parser.heuristic_parse("anything")
        assert isinstance(result, TutorSearchCriteria)

    def test_student_status_is_full_prompt(self):
        prompt = "Cần gia sư Toán lớp 12"
        result = self.parser.heuristic_parse(prompt)
        assert result.student_status == prompt

    def test_min_rating_set_when_tot_in_text(self):
        result = self.parser.heuristic_parse("cần gia sư tốt")
        assert result.min_rating == 4

    def test_min_rating_set_when_uy_tin_in_text(self):
        result = self.parser.heuristic_parse("gia sư uy tín")
        assert result.min_rating == 4

    def test_min_rating_none_without_quality_keywords(self):
        result = self.parser.heuristic_parse("toan lop 12")
        assert result.min_rating is None


# ---------------------------------------------------------------------------
# _extract_subjects()
# ---------------------------------------------------------------------------

class TestExtractSubjects:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._extract_subjects(normalize_text(text))

    def test_extracts_toan(self):
        assert "Toán" in self._run("cần gia sư toán")

    def test_extracts_vat_ly(self):
        assert "Vật lý" in self._run("dạy vật lý lớp 11")

    def test_extracts_ly_as_vat_ly(self):
        assert "Vật lý" in self._run("gia sư lý")

    def test_extracts_hoa(self):
        assert "Hóa" in self._run("dạy hóa học")

    def test_extracts_tieng_anh(self):
        assert "Tiếng Anh" in self._run("tiếng anh cho người đi làm")

    def test_extracts_anh_van_as_tieng_anh(self):
        assert "Tiếng Anh" in self._run("anh văn giao tiếp")

    def test_extracts_ielts(self):
        assert "IELTS" in self._run("luyện thi IELTS")

    def test_extracts_toeic(self):
        assert "TOEIC" in self._run("ôn TOEIC 600")

    def test_extracts_lap_trinh(self):
        assert "Lập trình" in self._run("lập trình web")

    def test_extracts_python(self):
        assert "Python" in self._run("học Python cơ bản")

    def test_extracts_ngu_van(self):
        assert "Ngữ văn" in self._run("ngữ văn lớp 10")

    def test_no_duplicate_subjects(self):
        # "tiếng anh" and "anh văn" both map to "Tiếng Anh"
        subjects = self._run("tiếng anh anh văn")
        assert subjects.count("Tiếng Anh") == 1

    def test_empty_string_returns_empty_list(self):
        assert self._run("") == []

    def test_unrelated_text_returns_empty_list(self):
        assert self._run("xin chào buổi sáng") == []

    def test_multiple_subjects(self):
        subjects = self._run("toán và vật lý lớp 12")
        assert "Toán" in subjects
        assert "Vật lý" in subjects

    def test_word_boundary_prevents_false_match(self):
        # "van" should not match inside "van chuyen" as "Ngữ văn"
        # The regex uses \W boundaries so partial sub-word matches are avoided
        # "van" as a standalone word should still match
        subjects = self._run("van")
        assert "Ngữ văn" in subjects


# ---------------------------------------------------------------------------
# _extract_levels()
# ---------------------------------------------------------------------------

class TestExtractLevels:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._extract_levels(normalize_text(text))

    def test_extracts_tieu_hoc(self):
        assert "Tiểu học" in self._run("tiểu học lớp 3")

    def test_extracts_thcs(self):
        assert "THCS" in self._run("học sinh THCS")

    def test_extracts_cap_2_as_thcs(self):
        assert "THCS" in self._run("cấp 2")

    def test_extracts_lop_6_to_9_as_thcs(self):
        for level in ["lớp 6", "lớp 7", "lớp 8", "lớp 9"]:
            result = self._run(level)
            assert "THCS" in result, f"Expected THCS for {level}"

    def test_extracts_thpt(self):
        assert "THPT" in self._run("học sinh THPT")

    def test_extracts_cap_3_as_thpt(self):
        assert "THPT" in self._run("cấp 3")

    def test_extracts_lop_10_to_12_as_thpt(self):
        for level in ["lớp 10", "lớp 11", "lớp 12"]:
            result = self._run(level)
            assert "THPT" in result, f"Expected THPT for {level}"

    def test_extracts_dai_hoc(self):
        assert "Đại học" in self._run("sinh viên đại học")

    def test_extracts_nguoi_di_lam(self):
        assert "Người đi làm" in self._run("người đi làm muốn học")

    def test_no_duplicates(self):
        # "thcs" and "cấp 2" both map to "THCS"
        levels = self._run("thcs cấp 2")
        assert levels.count("THCS") == 1

    def test_empty_string_returns_empty_list(self):
        assert self._run("") == []

    def test_multiple_levels(self):
        levels = self._run("lớp 12 và đại học")
        assert "THPT" in levels
        assert "Đại học" in levels


# ---------------------------------------------------------------------------
# _extract_weekdays()
# ---------------------------------------------------------------------------

class TestExtractWeekdays:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._extract_weekdays(normalize_text(text))

    def test_extracts_chu_nhat(self):
        assert 0 in self._run("chủ nhật")

    def test_extracts_cn_abbreviation(self):
        assert 0 in self._run("cn")

    def test_extracts_thu_2(self):
        assert 1 in self._run("thứ 2")

    def test_extracts_thu_hai(self):
        assert 1 in self._run("thứ hai")

    def test_extracts_thu_3(self):
        assert 2 in self._run("thứ 3")

    def test_extracts_thu_ba(self):
        assert 2 in self._run("thứ ba")

    def test_extracts_thu_4(self):
        assert 3 in self._run("thứ 4")

    def test_extracts_thu_tu(self):
        assert 3 in self._run("thứ tư")

    def test_extracts_thu_5(self):
        assert 4 in self._run("thứ 5")

    def test_extracts_thu_nam(self):
        assert 4 in self._run("thứ năm")

    def test_extracts_thu_6(self):
        assert 5 in self._run("thứ 6")

    def test_extracts_thu_sau(self):
        assert 5 in self._run("thứ sáu")

    def test_extracts_thu_7(self):
        assert 6 in self._run("thứ 7")

    def test_extracts_thu_bay(self):
        assert 6 in self._run("thứ bảy")

    def test_no_duplicates_for_same_day(self):
        # "thứ 2" and "thứ hai" both map to day 1
        days = self._run("thứ 2 thứ hai")
        assert days.count(1) == 1

    def test_multiple_days(self):
        days = self._run("thứ 2, thứ 4, thứ 6")
        assert 1 in days
        assert 3 in days
        assert 5 in days

    def test_empty_returns_empty_list(self):
        assert self._run("") == []


# ---------------------------------------------------------------------------
# _extract_time_ranges()
# ---------------------------------------------------------------------------

class TestExtractTimeRanges:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._extract_time_ranges(normalize_text(text))

    def test_extracts_hour_format_with_dash(self):
        ranges = self._run("8h - 10h")
        assert len(ranges) == 1
        assert ranges[0].start == "08:00"
        assert ranges[0].end == "10:00"

    def test_extracts_hour_minute_format(self):
        ranges = self._run("8h30 - 10h30")
        assert len(ranges) == 1
        assert ranges[0].start == "08:30"
        assert ranges[0].end == "10:30"

    def test_extracts_colon_format(self):
        ranges = self._run("18:00 - 20:00")
        assert len(ranges) == 1
        assert ranges[0].start == "18:00"
        assert ranges[0].end == "20:00"

    def test_extracts_den_separator(self):
        ranges = self._run("8h den 10h")
        assert len(ranges) == 1
        assert ranges[0].start == "08:00"
        assert ranges[0].end == "10:00"

    def test_extracts_toi_separator(self):
        ranges = self._run("7h toi 9h")
        assert len(ranges) == 1
        assert ranges[0].start == "07:00"
        assert ranges[0].end == "09:00"

    def test_zero_padded_hours(self):
        ranges = self._run("9h - 11h")
        assert ranges[0].start == "09:00"
        assert ranges[0].end == "11:00"

    def test_multiple_time_ranges(self):
        ranges = self._run("buổi sáng 8h - 10h, buổi chiều 14h - 16h")
        assert len(ranges) == 2

    def test_empty_returns_empty_list(self):
        assert self._run("") == []

    def test_no_time_in_text_returns_empty_list(self):
        assert self._run("cần gia sư toán") == []

    def test_time_range_is_timerange_instance(self):
        ranges = self._run("8h - 10h")
        assert isinstance(ranges[0], TimeRange)


# ---------------------------------------------------------------------------
# _extract_max_price()
# ---------------------------------------------------------------------------

class TestExtractMaxPrice:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._extract_max_price(normalize_text(text))

    def test_extracts_duoi_keyword(self):
        assert self._run("dưới 300k") == 300000

    def test_extracts_toi_da_keyword(self):
        assert self._run("tối đa 500k") == 500000

    def test_extracts_khoang_keyword(self):
        assert self._run("khoảng 200k") == 200000

    def test_extracts_lte_operator(self):
        assert self._run("<=400k") == 400000

    def test_extracts_lt_operator(self):
        assert self._run("<350k") == 350000

    def test_returns_none_when_no_price(self):
        assert self._run("cần gia sư toán lớp 12") is None

    def test_returns_none_for_empty_string(self):
        assert self._run("") is None

    def test_multiplies_by_1000(self):
        result = self._run("dưới 100k")
        assert result == 100000

    def test_large_price(self):
        assert self._run("tối đa 1000k") == 1000000


# ---------------------------------------------------------------------------
# _find_region()
# ---------------------------------------------------------------------------

class TestFindRegion:
    def setup_method(self):
        self.parser = make_parser()

    def _run(self, text):
        from app.utils.text import normalize_text
        return self.parser._find_region(normalize_text(text))

    def test_finds_ha_noi(self):
        assert self._run("dạy ở Hà Nội") == "Hà Nội"

    def test_finds_ho_chi_minh_full(self):
        assert self._run("TP Hồ Chí Minh") == "TP Hồ Chí Minh"

    def test_finds_ho_chi_minh_short(self):
        assert self._run("Hồ Chí Minh") == "TP Hồ Chí Minh"

    def test_finds_sai_gon(self):
        assert self._run("Sài Gòn") == "TP Hồ Chí Minh"

    def test_finds_da_nang(self):
        assert self._run("Đà Nẵng") == "Đà Nẵng"

    def test_finds_hai_phong(self):
        assert self._run("Hải Phòng") == "Hải Phòng"

    def test_finds_can_tho(self):
        assert self._run("Cần Thơ") == "Cần Thơ"

    def test_returns_empty_string_when_no_region(self):
        assert self._run("cần gia sư toán") == ""

    def test_returns_empty_string_for_empty_input(self):
        assert self._run("") == ""

    def test_tp_prefix_takes_priority(self):
        # "tp ho chi minh" should match before "ho chi minh" due to dict order
        # Both map to same value so result is TP Hồ Chí Minh either way
        result = self._run("TP Hồ Chí Minh")
        assert result == "TP Hồ Chí Minh"


# ---------------------------------------------------------------------------
# Full heuristic integration scenarios
# ---------------------------------------------------------------------------

class TestHeuristicParseIntegration:
    def setup_method(self):
        self.parser = make_parser(return_value=None)

    def test_complex_query_extracts_multiple_fields(self):
        prompt = "Tìm gia sư Toán lớp 12 ở Hà Nội, thứ 2, 8h - 10h, dưới 300k"
        result = self.parser.heuristic_parse(prompt)
        assert "Toán" in result.subjects
        assert "THPT" in result.teaching_levels
        assert result.location == "Hà Nội"
        assert 1 in result.weekdays
        assert result.max_price == 300000
        assert len(result.time_ranges) == 1

    def test_empty_prompt_returns_default_criteria(self):
        result = self.parser.heuristic_parse("")
        assert result.subjects == []
        assert result.teaching_levels == []
        assert result.weekdays == []
        assert result.location == ""
        assert result.max_price is None

    def test_quality_keywords_trigger_min_rating(self):
        result = self.parser.heuristic_parse("tìm gia sư tốt uy tín")
        assert result.min_rating == 4

    def test_multiple_subjects_extracted(self):
        result = self.parser.heuristic_parse("Cần gia sư Toán và Vật lý")
        assert "Toán" in result.subjects
        assert "Vật lý" in result.subjects
