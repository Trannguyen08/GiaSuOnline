from app.services.ai_review import ReviewInput, ScoringService


def test_scoring_service_low_risk_for_strong_profile():
    service = ScoringService()
    result = service.calculate_score(
        ReviewInput(
            complete_profile=True,
            has_portrait=True,
            has_id_card=True,
            has_certificate=True,
            id_ocr_readable=True,
            certificate_ocr_readable=True,
            identity_matches_form=True,
            certificate_matches_name=True,
            portrait_authentic=True,
            face_match=True,
            description_ok=True,
            has_serious_flags=False,
        )
    )

    assert result["pass_score"] == 100
    assert service.calculate_risk_level(result["pass_score"]) == "LOW"


def test_scoring_service_high_risk_for_identity_flags():
    service = ScoringService()
    result = service.calculate_score(
        ReviewInput(
            complete_profile=True,
            has_portrait=True,
            has_id_card=True,
            has_certificate=True,
            id_ocr_readable=True,
            certificate_ocr_readable=True,
            identity_matches_form=False,
            certificate_matches_name=False,
            portrait_authentic=False,
            face_match=False,
            description_ok=False,
            has_serious_flags=True,
            warning_flags=["IDENTITY_MISMATCH", "FACE_MISMATCH", "LOW_IMAGE_AUTHENTICITY"],
        )
    )

    assert result["pass_score"] < 60
    assert service.calculate_risk_level(result["pass_score"]) == "HIGH"
