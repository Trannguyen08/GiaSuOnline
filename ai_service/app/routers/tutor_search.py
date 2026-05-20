from fastapi import APIRouter, Depends

from app.core.llm_provider import get_llm_provider
from app.schemas.tutor_search import TutorSearchParseRequest, TutorSearchParseResponse
from app.services.tutor_search_parser import TutorSearchParser


router = APIRouter(tags=["tutor-search"])


def get_tutor_search_parser() -> TutorSearchParser:
    return TutorSearchParser(llm_provider=get_llm_provider())


@router.post("/parse-tutor-search", response_model=TutorSearchParseResponse)
def parse_tutor_search(
    payload: TutorSearchParseRequest,
    parser: TutorSearchParser = Depends(get_tutor_search_parser),
):
    criteria, used_llm = parser.parse(payload.prompt)
    return TutorSearchParseResponse(criteria=criteria, used_llm=used_llm)

