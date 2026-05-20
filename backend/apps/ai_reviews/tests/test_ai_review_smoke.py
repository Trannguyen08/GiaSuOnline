from apps.ai_reviews.models import AIReview


def test_ai_review_status_choices_include_pending():
    statuses = {value for value, _label in AIReview.Status.choices}

    assert AIReview.Status.PENDING in statuses
