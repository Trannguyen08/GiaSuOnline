from django.contrib import admin

from .models import AIReview


@admin.register(AIReview)
class AIReviewAdmin(admin.ModelAdmin):
    list_display = (
        "tutor",
        "pass_score",
        "risk_level",
        "status",
        "created_at",
        "reviewed_at",
    )
    list_filter = ("status", "risk_level")
    search_fields = (
        "tutor__full_name",
        "tutor__user__email",
        "tutor__user__phone",
    )
    readonly_fields = (
        "tutor",
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
    )

    fieldsets = (
        (
            "Summary",
            {
                "fields": (
                    "tutor",
                    "status",
                    "pass_score",
                    "risk_level",
                    "admin_suggestion",
                )
            },
        ),
        (
            "Findings",
            {
                "fields": (
                    "good_points",
                    "bad_points",
                    "missing_fields",
                    "warning_flags",
                    "error_message",
                )
            },
        ),
        (
            "Raw Data",
            {"fields": ("raw_ocr_result", "raw_ai_result"), "classes": ("collapse",)},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at", "reviewed_at")}),
    )
