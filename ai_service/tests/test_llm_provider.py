import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel

from app.core.llm_provider import LLMProvider, OpenAILLMProvider, get_llm_provider
from app.schemas.tutor_search import TutorSearchCriteria


class SampleModel(BaseModel):
    name: str = ""
    value: int = 0


class TestLLMProviderBase:
    def test_parse_structured_raises_not_implemented(self):
        provider = LLMProvider()
        with pytest.raises(NotImplementedError):
            provider.parse_structured(
                system_prompt="sys",
                user_prompt="user",
                response_model=SampleModel,
            )

    def test_base_class_is_instantiable(self):
        # Should not raise; NotImplementedError only on method call
        provider = LLMProvider()
        assert isinstance(provider, LLMProvider)


class TestOpenAILLMProvider:
    def test_client_is_none_when_api_key_empty(self):
        provider = OpenAILLMProvider(api_key="", model="gpt-4")
        assert provider.client is None

    def test_client_is_created_when_api_key_provided(self):
        with patch("app.core.llm_provider.OpenAI") as mock_openai:
            mock_openai.return_value = MagicMock()
            provider = OpenAILLMProvider(api_key="sk-test", model="gpt-4")
            mock_openai.assert_called_once_with(api_key="sk-test")
            assert provider.client is not None

    def test_stores_api_key_and_model(self):
        with patch("app.core.llm_provider.OpenAI"):
            provider = OpenAILLMProvider(api_key="sk-abc", model="gpt-3.5")
        assert provider.api_key == "sk-abc"
        assert provider.model == "gpt-3.5"

    def test_parse_structured_returns_none_when_no_client(self):
        provider = OpenAILLMProvider(api_key="", model="gpt-4")
        result = provider.parse_structured(
            system_prompt="sys",
            user_prompt="user",
            response_model=SampleModel,
        )
        assert result is None

    def test_parse_structured_calls_openai_beta_parse(self):
        mock_client = MagicMock()
        expected = SampleModel(name="test", value=42)
        mock_client.beta.chat.completions.parse.return_value.choices = [
            MagicMock(message=MagicMock(parsed=expected))
        ]
        with patch("app.core.llm_provider.OpenAI", return_value=mock_client):
            provider = OpenAILLMProvider(api_key="sk-test", model="gpt-4")
            result = provider.parse_structured(
                system_prompt="sys",
                user_prompt="user",
                response_model=SampleModel,
            )
        assert result == expected
        mock_client.beta.chat.completions.parse.assert_called_once_with(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "sys"},
                {"role": "user", "content": "user"},
            ],
            response_format=SampleModel,
        )

    def test_parse_structured_uses_correct_model_name(self):
        mock_client = MagicMock()
        mock_client.beta.chat.completions.parse.return_value.choices = [
            MagicMock(message=MagicMock(parsed=SampleModel()))
        ]
        with patch("app.core.llm_provider.OpenAI", return_value=mock_client):
            provider = OpenAILLMProvider(api_key="sk-test", model="gpt-custom")
            provider.parse_structured(
                system_prompt="s",
                user_prompt="u",
                response_model=SampleModel,
            )
        call_kwargs = mock_client.beta.chat.completions.parse.call_args
        assert call_kwargs.kwargs["model"] == "gpt-custom"

    def test_parse_structured_passes_response_format(self):
        mock_client = MagicMock()
        mock_client.beta.chat.completions.parse.return_value.choices = [
            MagicMock(message=MagicMock(parsed=SampleModel()))
        ]
        with patch("app.core.llm_provider.OpenAI", return_value=mock_client):
            provider = OpenAILLMProvider(api_key="sk-test", model="gpt-4")
            provider.parse_structured(
                system_prompt="s",
                user_prompt="u",
                response_model=SampleModel,
            )
        call_kwargs = mock_client.beta.chat.completions.parse.call_args
        assert call_kwargs.kwargs["response_format"] is SampleModel

    def test_parse_structured_returns_parsed_result(self):
        criteria = TutorSearchCriteria(subjects=["Toán"])
        mock_client = MagicMock()
        mock_client.beta.chat.completions.parse.return_value.choices = [
            MagicMock(message=MagicMock(parsed=criteria))
        ]
        with patch("app.core.llm_provider.OpenAI", return_value=mock_client):
            provider = OpenAILLMProvider(api_key="sk-key", model="gpt-4")
            result = provider.parse_structured(
                system_prompt="s",
                user_prompt="u",
                response_model=TutorSearchCriteria,
            )
        assert result is criteria


class TestGetLLMProvider:
    def test_returns_openai_provider_instance(self):
        with patch("app.core.llm_provider.OpenAI"):
            provider = get_llm_provider()
        assert isinstance(provider, OpenAILLMProvider)

    def test_uses_settings_api_key_and_model(self):
        with patch("app.core.llm_provider.settings") as mock_settings, \
             patch("app.core.llm_provider.OpenAI") as mock_openai:
            mock_settings.openai_api_key = "sk-from-settings"
            mock_settings.openai_model = "gpt-settings-model"
            mock_openai.return_value = MagicMock()
            provider = get_llm_provider()
        assert provider.api_key == "sk-from-settings"
        assert provider.model == "gpt-settings-model"

    def test_returns_provider_with_no_client_when_key_empty(self):
        with patch("app.core.llm_provider.settings") as mock_settings:
            mock_settings.openai_api_key = ""
            mock_settings.openai_model = "gpt-4"
            provider = get_llm_provider()
        assert provider.client is None