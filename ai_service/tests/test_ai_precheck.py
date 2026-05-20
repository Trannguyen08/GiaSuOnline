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
