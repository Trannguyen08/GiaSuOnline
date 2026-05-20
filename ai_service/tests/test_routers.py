import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import create_app
from app.routers.tutor_search import get_tutor_search_parser
from app.services.tutor_search_parser import TutorSearchParser
from app.schemas.tutor_search import TutorSearchCriteria
from app.core.llm_provider import LLMProvider


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_app():
    return create_app()


@pytest.fixture
def client(test_app):
    return TestClient(test_app)


def make_stub_parser(criteria=None, used_llm=False):
    """Return a TutorSearchParser stub with a fixed parse() result."""
    provider = MagicMock(spec=LLMProvider)
    provider.parse_structured.return_value = None
    parser = TutorSearchParser(llm_provider=provider)
    # Override parse() directly
    parser.parse = MagicMock(return_value=(criteria or TutorSearchCriteria(), used_llm))
    return parser


# ---------------------------------------------------------------------------
# Health router
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_get_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_get_health_returns_ok_true(self, client):
        response = client.get("/health")
        assert response.json() == {"ok": True}

    def test_get_health_content_type_json(self, client):
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]

    def test_health_endpoint_does_not_require_auth(self, client):
        # No auth headers — should still succeed
        response = client.get("/health")
        assert response.status_code == 200

    def test_post_to_health_returns_405(self, client):
        response = client.post("/health")
        assert response.status_code == 405


# ---------------------------------------------------------------------------
# Tutor search router
# ---------------------------------------------------------------------------

class TestParseTutorSearchEndpoint:
    def test_post_returns_200_with_valid_payload(self, test_app):
        stub = make_stub_parser(criteria=TutorSearchCriteria(), used_llm=False)
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "cần gia sư toán"})
        test_app.dependency_overrides.clear()
        assert response.status_code == 200

    def test_post_returns_criteria_and_used_llm(self, test_app):
        criteria = TutorSearchCriteria(subjects=["Toán"], location="Hà Nội")
        stub = make_stub_parser(criteria=criteria, used_llm=True)
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "test"})
        test_app.dependency_overrides.clear()
        body = response.json()
        assert body["used_llm"] is True
        assert "Toán" in body["criteria"]["subjects"]
        assert body["criteria"]["location"] == "Hà Nội"

    def test_post_with_heuristic_fallback(self, test_app):
        criteria = TutorSearchCriteria(subjects=["Toán"])
        stub = make_stub_parser(criteria=criteria, used_llm=False)
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "toán"})
        test_app.dependency_overrides.clear()
        body = response.json()
        assert body["used_llm"] is False

    def test_post_missing_prompt_returns_422(self, client):
        response = client.post("/parse-tutor-search", json={})
        assert response.status_code == 422

    def test_post_with_empty_prompt_succeeds(self, test_app):
        stub = make_stub_parser()
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": ""})
        test_app.dependency_overrides.clear()
        assert response.status_code == 200

    def test_post_response_contains_criteria_fields(self, test_app):
        stub = make_stub_parser()
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "test"})
        test_app.dependency_overrides.clear()
        body = response.json()
        assert "criteria" in body
        assert "used_llm" in body
        criteria = body["criteria"]
        assert "subjects" in criteria
        assert "teaching_levels" in criteria
        assert "weekdays" in criteria
        assert "time_ranges" in criteria

    def test_get_method_not_allowed(self, client):
        response = client.get("/parse-tutor-search")
        assert response.status_code == 405

    def test_parser_parse_called_with_prompt(self, test_app):
        criteria = TutorSearchCriteria()
        stub = make_stub_parser(criteria=criteria, used_llm=False)
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            c.post("/parse-tutor-search", json={"prompt": "unique prompt text"})
        test_app.dependency_overrides.clear()
        stub.parse.assert_called_once_with("unique prompt text")

    def test_response_criteria_has_correct_types(self, test_app):
        stub = make_stub_parser()
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "test"})
        test_app.dependency_overrides.clear()
        body = response.json()
        c = body["criteria"]
        assert isinstance(c["subjects"], list)
        assert isinstance(c["weekdays"], list)
        assert isinstance(c["time_ranges"], list)

    def test_content_type_is_json(self, test_app):
        stub = make_stub_parser()
        test_app.dependency_overrides[get_tutor_search_parser] = lambda: stub
        with TestClient(test_app) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "test"})
        test_app.dependency_overrides.clear()
        assert "application/json" in response.headers["content-type"]

    def test_non_json_body_returns_422(self, client):
        response = client.post(
            "/parse-tutor-search",
            content="not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# get_tutor_search_parser dependency
# ---------------------------------------------------------------------------

class TestGetTutorSearchParserDependency:
    def test_returns_tutor_search_parser_instance(self):
        with patch("app.routers.tutor_search.get_llm_provider") as mock_get:
            mock_get.return_value = MagicMock(spec=LLMProvider)
            from app.routers.tutor_search import get_tutor_search_parser
            parser = get_tutor_search_parser()
        assert isinstance(parser, TutorSearchParser)

    def test_uses_llm_provider_from_factory(self):
        mock_provider = MagicMock(spec=LLMProvider)
        with patch("app.routers.tutor_search.get_llm_provider", return_value=mock_provider):
            from app.routers.tutor_search import get_tutor_search_parser
            parser = get_tutor_search_parser()
        assert parser.llm_provider is mock_provider