from celery import shared_task
from django.db.models import Avg

from core.cache_utils import invalidate_cache_groups

from .feedback_moderation import mark_moderation_failed, moderate_feedback_instance
from .models import CourseReview, TutorStudentFeedback


@shared_task(bind=True, max_retries=1)
def moderate_course_review(self, review_id):
    review = CourseReview.objects.select_related("course__subject").get(pk=review_id)
    try:
        moderate_feedback_instance(review)
        if review.moderation_status == CourseReview.ModerationStatus.APPROVED:
            stats = CourseReview.objects.filter(
                tutor=review.tutor,
                moderation_status=CourseReview.ModerationStatus.APPROVED,
            ).aggregate(avg=Avg("rating"))
            review.tutor.rating_avg = stats["avg"] or 0
            review.tutor.total_reviews = CourseReview.objects.filter(
                tutor=review.tutor,
                moderation_status=CourseReview.ModerationStatus.APPROVED,
            ).count()
            review.tutor.save(update_fields=["rating_avg", "total_reviews"])
        invalidate_cache_groups("courses", "tutors", "reviews")
    except Exception as exc:
        mark_moderation_failed(review, str(exc))
        raise
    return review.id


@shared_task(bind=True, max_retries=1)
def moderate_tutor_student_feedback(self, feedback_id):
    feedback = TutorStudentFeedback.objects.select_related("course__subject").get(
        pk=feedback_id
    )
    try:
        moderate_feedback_instance(feedback)
        invalidate_cache_groups("courses", "bookings", "student_feedback")
    except Exception as exc:
        mark_moderation_failed(feedback, str(exc))
        raise
    return feedback.id
