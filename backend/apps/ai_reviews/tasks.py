from celery import shared_task

from .review_runner import AIReviewRunner


@shared_task(bind=True, max_retries=1)
def run_ai_review(self, review_id):
    return AIReviewRunner().run(review_id).id
