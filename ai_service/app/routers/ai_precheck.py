from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.ai_precheck import DocumentType, ImagePrecheckResponse
from app.services.ai_precheck import ImagePrecheckService


router = APIRouter(prefix="/ai", tags=["ai-precheck"])
service = ImagePrecheckService()


@router.post("/precheck-image/", response_model=ImagePrecheckResponse)
async def precheck_image(
    image: UploadFile = File(...),
    document_type: DocumentType = Form(...),
):
    if not image:
        raise HTTPException(status_code=400, detail="Không tìm thấy file ảnh.")

    content = await image.read()
    return service.precheck(
        filename=image.filename or "",
        content_type=image.content_type,
        content=content,
        document_type=document_type,
    )
