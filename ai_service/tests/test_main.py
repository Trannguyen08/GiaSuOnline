import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app, app


class TestCreateApp:
    def test_create_app_returns_fastapi_instance(self):
        application = create_app()
        assert isinstance(application, FastAPI)

    def test_create_app_sets_title_from_settings(self):
        from app.core.config import settings
        application = create_app()
        assert application.title == settings.app_name

    def test_app_title_is_tutormatch_ai_service(self):
        application = create_app()
        assert "TutorMatch" in application.title

    def test_health_route_registered(self):
        application = create_app()
        routes = [route.path for route in application.routes]
        assert "/health" in routes

    def test_parse_tutor_search_route_registered(self):
        application = create_app()
        routes = [route.path for route in application.routes]
        assert "/parse-tutor-search" in routes

    def test_module_level_app_is_fastapi_instance(self):
        assert isinstance(app, FastAPI)

    def test_create_app_returns_new_instance_each_call(self):
        app1 = create_app()
        app2 = create_app()
        assert app1 is not app2

    def test_health_endpoint_reachable_via_created_app(self):
        application = create_app()
        with TestClient(application) as c:
            response = c.get("/health")
        assert response.status_code == 200

    def test_parse_tutor_search_endpoint_reachable_via_created_app(self):
        application = create_app()
        with TestClient(application) as c:
            response = c.post("/parse-tutor-search", json={"prompt": "toán"})
        # May return 200 (heuristic fallback when no LLM key) or 500 from openai
        # but must not 404 — route is registered
        assert response.status_code != 404

    def test_openapi_schema_includes_both_tags(self):
        application = create_app()
        with TestClient(application) as c:
            response = c.get("/openapi.json")
        schema = response.json()
        paths = schema.get("paths", {})
        assert "/health" in paths
        assert "/parse-tutor-search" in paths