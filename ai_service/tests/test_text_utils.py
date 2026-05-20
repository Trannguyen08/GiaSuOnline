import pytest

from app.utils.text import normalize_text


class TestNormalizeText:
    def test_lowercase_ascii(self):
        assert normalize_text("Hello World") == "hello world"

    def test_removes_vietnamese_tone_marks(self):
        # "Toán" -> "toan"
        assert normalize_text("Toán") == "toan"

    def test_removes_acute_accent(self):
        assert normalize_text("café") == "cafe"

    def test_replaces_d_with_stroke(self):
        # Vietnamese đ (U+0111) should become "d"
        assert normalize_text("đây") == "day"

    def test_replaces_uppercase_d_with_stroke_after_lower(self):
        # Đà Nẵng -> da nang
        assert normalize_text("Đà Nẵng") == "da nang"

    def test_full_vietnamese_phrase(self):
        assert normalize_text("Tiếng Anh") == "tieng anh"

    def test_empty_string(self):
        assert normalize_text("") == ""

    def test_already_normalized_ascii(self):
        assert normalize_text("toan") == "toan"

    def test_numbers_and_spaces_unchanged(self):
        assert normalize_text("lop 12") == "lop 12"

    def test_mixed_accented_and_plain(self):
        # "Vật lý" -> "vat ly"
        assert normalize_text("Vật lý") == "vat ly"

    def test_hoa_hoc(self):
        # "Hóa học" -> "hoa hoc"
        assert normalize_text("Hóa học") == "hoa hoc"

    def test_uppercase_input_lowercased(self):
        assert normalize_text("TOAN") == "toan"

    def test_d_stroke_in_middle_of_word(self):
        # "người" -> "nguoi" (ư -> u, ờ -> o, i stays)
        assert normalize_text("người") == "nguoi"

    def test_preserves_non_letter_characters(self):
        result = normalize_text("300k/giờ")
        assert "300k" in result
        assert "/" in result

    def test_idempotent(self):
        # Normalizing an already-normalized string should not change it
        first = normalize_text("Ngữ văn")
        second = normalize_text(first)
        assert first == second

    def test_whitespace_preserved(self):
        assert normalize_text("  toan  ") == "  toan  "