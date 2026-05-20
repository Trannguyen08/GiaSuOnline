import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import create_app
from app.core.llm_provider import LLMProvider
from app.schemas.tutor_search import TutorSearchCriteria


class StubLLMProvider(LLMProvider):
    """A controllable stub for LLMProvider used in tests."""

    def __init__(self, return_value=None, raise_exc=None):
        self._return_value = return_value
        self._raise_exc = raise_exc

    def parse_structured(self, *, system_prompt, user_prompt, response_model):
        if self._raise_exc is not None:
            raise self._raise_exc
        return self._return_value


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def null_llm_provider():
    """Provider that always returns None (triggers heuristic fallback)."""
    return StubLLMProvider(return_value=None)


@pytest.fixture
def error_llm_provider():
    """Provider that always raises an exception (triggers heuristic fallback)."""
    return StubLLMProvider(raise_exc=RuntimeError("API error"))


@pytest.fixture
def criteria_llm_provider():
    """Provider that returns a fixed TutorSearchCriteria."""
    criteria = TutorSearchCriteria(subjects=["Toán"], location="Hà Nội")
    return StubLLMProvider(return_value=criteria)