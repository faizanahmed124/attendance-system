from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import get_current_user
from app.modules.search import service
from app.modules.search.schema import SearchResponse

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = service.global_search(db, q, current_user.role)
    return SearchResponse(query=q, results=results)
