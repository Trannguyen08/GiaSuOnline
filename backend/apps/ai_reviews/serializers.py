from rest_framework import serializers

from .models import AIReview


class AIReviewSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()
    tutor_email = serializers.SerializerMethodField()

    class Meta:
        model = AIReview
        fields = [
            "id",
            "tutor",
            "tutor_name",
            "tutor_email",
            "status",
            "pass_score",
            "risk_level",
            "good_points",
            "bad_points",
            "missing_fields",
            "warning_flags",
            "admin_suggestion",
            "raw_ocr_result",
            "raw_ai_result",
            "error_message",
            "created_at",
            "updated_at",
            "reviewed_at",
        ]
        read_only_fields = fields

    def get_tutor_name(self, obj):
        return getattr(obj.tutor, "full_name", str(obj.tutor))

    def get_tutor_email(self, obj):
        user = getattr(obj.tutor, "user", None)
        return getattr(user, "email", "")
