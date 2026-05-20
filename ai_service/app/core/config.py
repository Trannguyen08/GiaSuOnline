import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "TutorMatch AI Service"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    google_vision_enabled: bool = os.getenv("GOOGLE_VISION_ENABLED", "False").lower() == "true"
    aws_rekognition_enabled: bool = os.getenv("AWS_REKOGNITION_ENABLED", "False").lower() == "true"
    aws_region: str = os.getenv("AWS_REGION", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    local_llm_url: str = os.getenv("LOCAL_LLM_URL", "")


settings = Settings()
