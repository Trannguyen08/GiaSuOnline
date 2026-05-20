import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.ai_review import AIReviewResult
from app.services.ai_review import AIReviewService


router = APIRouter(prefix="/ai", tags=["ai-review"])
service = AIReviewService()


@router.post("/review-tutor-profile/", response_model=AIReviewResult)
async def review_tutor_profile(
    profile: str = Form(...),
    portrait: UploadFile | None = File(None),
    id_front: UploadFile | None = File(None),
    id_back: UploadFile | None = File(None),
    certificates: list[UploadFile] | None = File(None),
):
    try:
        profile_data = json.loads(profile)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="profile must be valid JSON")

    files = {
        "portrait": await portrait.read() if portrait else b"",
        "id_front": await id_front.read() if id_front else b"",
        "id_back": await id_back.read() if id_back else b"",
        "certificates": [await file.read() for file in certificates or []],
    }
    return service.review(profile_data, files)
