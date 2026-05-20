from fastapi import FastAPI

from app.core.config import settings
from app.routers import ai_precheck, ai_review, health, tutor_search


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    app.include_router(health.router)
    app.include_router(ai_precheck.router)
    app.include_router(ai_review.router)
    app.include_router(tutor_search.router)
    return app


app = create_app()
