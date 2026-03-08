"""
Pydantic-схемы для модуля импорта/экспорта.
Фаза 4, Сессия 1.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ───────────────── Import Job ─────────────────────────────────

class ImportJobCreate(BaseModel):
    target_entity: str = "decisions"  # decisions | portfolios | contacts


class ImportFieldMappingItem(BaseModel):
    source_field: str
    target_field: str
    transform_rule: Optional[str] = None  # none | uppercase | lowercase | date_parse | number_parse
    default_value: Optional[str] = None
    is_required: bool = False


class ImportMappingSave(BaseModel):
    mappings: List[ImportFieldMappingItem]


class ImportFieldMappingResponse(BaseModel):
    id: int
    source_field: str
    target_field: str
    transform_rule: Optional[str]
    default_value: Optional[str]
    is_required: bool

    class Config:
        from_attributes = True


class ImportJobResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_format: str
    file_size_bytes: Optional[int]
    target_entity: str
    status: str
    total_rows: Optional[int]
    imported_rows: int
    skipped_rows: int
    error_rows: int
    errors_detail: Optional[List[Dict[str, Any]]]
    preview_data: Optional[List[Dict[str, Any]]]
    raw_headers: Optional[List[str]]
    field_mappings: List[ImportFieldMappingResponse] = []
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ImportJobListItem(BaseModel):
    id: int
    filename: str
    file_format: str
    target_entity: str
    status: str
    total_rows: Optional[int]
    imported_rows: int
    error_rows: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ───────────────── Export Job ─────────────────────────────────

class ExportJobCreate(BaseModel):
    export_format: str = "csv"  # csv | json | xlsx
    target_entity: str = "decisions"  # decisions | portfolios | tasks
    filters: Optional[Dict[str, Any]] = None


class ExportJobResponse(BaseModel):
    id: int
    user_id: int
    export_format: str
    target_entity: str
    filters: Optional[Dict[str, Any]]
    status: str
    total_rows: Optional[int]
    result_data: Optional[Any]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ───────────────── Target fields (для маппинга) ──────────────

class TargetFieldInfo(BaseModel):
    field: str
    label: str
    field_type: str  # string | number | date | boolean
    required: bool = False
