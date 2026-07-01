import io

from PIL import Image

from app.services.ai_precheck import ImagePrecheckService


def make_image(size=(800, 600), color=(180, 180, 180)):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_rejects_invalid_extension():
    service = ImagePrecheckService()
    result = service.precheck("file.txt", "text/plain", b"hello", "degree")

    assert result.score == 0
    assert result.can_submit is False
    assert result.is_valid is False
    assert result.issues


def test_scores_readable_image_without_crashing():
    service = ImagePrecheckService()
    result = service.precheck("portrait.png", "image/png", make_image(), "portrait")

    assert 0 <= result.score <= 100
    assert result.document_type == "portrait"
    assert isinstance(result.issues, list)
    assert isinstance(result.suggestions, list)


def test_small_image_cannot_submit_when_score_is_low():
    service = ImagePrecheckService()
    result = service.precheck("degree.png", "image/png", make_image(size=(100, 80)), "degree")

    assert result.score < 50
    assert result.can_submit is False


def test_rejects_document_uploaded_to_wrong_slot(monkeypatch):
    service = ImagePrecheckService()
    monkeypatch.setattr(service, "_ocr_text", lambda image: "CONG HOA XA HOI CHU NGHIA VIET NAM CAN CUOC CONG DAN 012345678901")

    result = service.precheck("cccd.png", "image/png", make_image(size=(900, 560)), "degree")

    assert result.is_valid is False
    assert any("bằng cấp" in issue for issue in result.issues)


def test_accepts_identity_front_keywords(monkeypatch):
    service = ImagePrecheckService()
    monkeypatch.setattr(service, "_ocr_text", lambda image: "CAN CUOC CONG DAN So 012345678901 Ngay sinh 01/01/2000")

    result = service.precheck("cccd.png", "image/png", make_image(size=(900, 560)), "identity_card_front")

    assert result.score >= 50
    assert not any("không giống" in issue for issue in result.issues)


def test_identity_card_with_readable_text_is_not_penalized_for_blur(monkeypatch):
    service = ImagePrecheckService()
    monkeypatch.setattr(service, "_ocr_text", lambda image: "CAN CUOC CONG DAN So 012345678901 Ngay sinh 01/01/2000")
    monkeypatch.setattr(service, "_blur_score", lambda gray: 10)

    result = service.precheck("cccd.png", "image/png", make_image(size=(900, 560)), "identity_card_front")

    assert not any("mờ" in issue for issue in result.issues)
    assert result.is_valid is True


def test_identity_card_tight_full_frame_is_not_marked_cropped(monkeypatch):
    service = ImagePrecheckService()
    monkeypatch.setattr(service, "_ocr_text", lambda image: "CAN CUOC CONG DAN So 012345678901 Ngay sinh 01/01/2000")

    result = service.precheck("cccd.png", "image/png", make_image(size=(900, 560), color=(240, 230, 210)), "identity_card_front")

    assert not any("cắt mất" in issue for issue in result.issues)
