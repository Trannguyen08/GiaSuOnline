from rest_framework import serializers

from apps.admin_portal.models import SystemSetting, ViolationCase


class PolicySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ["key", "label", "value", "value_type", "description"]


class ViolationCaseListSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    booking_label = serializers.SerializerMethodField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = ViolationCase
        fields = [
            "id",
            "title",
            "description",
            "reporter",
            "reporter_name",
            "target_user",
            "target_user_name",
            "booking",
            "booking_label",
            "course",
            "course_title",
            "severity",
            "status",
            "resolution_note",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def _user_label(self, user):
        if not user:
            return ""
        return user.get_full_name() or user.username or user.email

    def get_reporter_name(self, obj):
        return self._user_label(obj.reporter)

    def get_target_user_name(self, obj):
        return self._user_label(obj.target_user)

    def get_booking_label(self, obj):
        if not obj.booking:
            return ""
        return f"Booking #{obj.booking_id} - {obj.booking.start_time:%d/%m/%Y %H:%M}"


class ViolationCaseCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    severity = serializers.ChoiceField(
        choices=["low", "medium", "high", "critical"], default="medium"
    )
    booking = serializers.IntegerField(required=False, allow_null=True)
    course = serializers.IntegerField(required=False, allow_null=True)
    target_user = serializers.IntegerField(required=False, allow_null=True)
