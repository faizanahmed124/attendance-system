from typing import List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    type: str          # "employee", "department", "company", "designation", "attendance"
    id: int
    title: str
    subtitle: Optional[str] = None
    url: str            # frontend route to open this record


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
