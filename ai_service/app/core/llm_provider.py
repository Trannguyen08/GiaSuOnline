from typing import Optional, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.core.config import settings


T = TypeVar("T", bound=BaseModel)


class LLMProvider:
    def parse_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> Optional[T]:
        raise NotImplementedError


class OpenAILLMProvider(LLMProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model
        self.client = OpenAI(api_key=api_key) if api_key else None

    def parse_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
    ) -> Optional[T]:
        if not self.client:
            return None

        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format=response_model,
        )
        return completion.choices[0].message.parsed


def get_llm_provider() -> LLMProvider:
    return OpenAILLMProvider(api_key=settings.openai_api_key, model=settings.openai_model)

