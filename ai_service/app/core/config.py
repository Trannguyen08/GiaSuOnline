import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "TutorMatch AI Service"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")


settings = Settings()

