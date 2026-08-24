from typing import Optional, List, Any

from pydantic import BaseModel


class ReportFilterDef(BaseModel):
    name: str
    label: str
    type: str  # date, employee, department, select, text
    required: bool = False
    options: Optional[List[str]] = None  # only for type="select"


class ReportColumnDef(BaseModel):
    key: str
    label: str


class ReportMeta(BaseModel):
    key: str
    title: str
    category: str
    description: str
    filters: List[ReportFilterDef]
    columns: List[ReportColumnDef]


class ReportRunResult(BaseModel):
    columns: List[ReportColumnDef]
    rows: List[dict]
    total_rows: int
