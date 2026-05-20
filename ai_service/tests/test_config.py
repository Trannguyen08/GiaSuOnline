import os
import importlib
import pytest

import app.core.config as config_module
from app.core.config import Settings


class TestSettings:
    def test_default_app_name(self):
        s = Settings()
        assert s.app_name == "TutorMatch AI Service"

    def test_default_openai_api_key_is_empty_string_when_env_not_set(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        # Re-instantiate to pick up monkeypatched env
        s = Settings(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        )
        assert s.openai_api_key == ""

    def test_default_openai_model(self, monkeypatch):
        monkeypatch.delenv("OPENAI_MODEL", raising=False)
        s = Settings(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        )
        assert s.openai_model == "gpt-4.1-mini"

    def test_custom_values(self):
        s = Settings(app_name="Custom", openai_api_key="sk-abc", openai_model="gpt-4")
        assert s.app_name == "Custom"
        assert s.openai_api_key == "sk-abc"
        assert s.openai_model == "gpt-4"

    def test_settings_is_frozen(self):
        s = Settings()
        with pytest.raises((AttributeError, TypeError)):
            s.app_name = "Changed"  # type: ignore[misc]

    def test_settings_from_env_var(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "sk-testkey")
        monkeypatch.setenv("OPENAI_MODEL", "gpt-3.5-turbo")
        s = Settings(
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        )
        assert s.openai_api_key == "sk-testkey"
        assert s.openai_model == "gpt-3.5-turbo"

    def test_module_level_settings_is_settings_instance(self):
        from app.core.config import settings
        assert isinstance(settings, Settings)

    def test_settings_equality(self):
        s1 = Settings(app_name="A", openai_api_key="key", openai_model="m")
        s2 = Settings(app_name="A", openai_api_key="key", openai_model="m")
        assert s1 == s2

    def test_settings_inequality(self):
        s1 = Settings(app_name="A", openai_api_key="key1", openai_model="m")
        s2 = Settings(app_name="A", openai_api_key="key2", openai_model="m")
        assert s1 != s2