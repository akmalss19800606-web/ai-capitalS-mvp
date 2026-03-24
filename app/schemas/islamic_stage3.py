"""
Islamic Finance Stage 3 - Pydantic Schemas
PoSC, SSB Review, Auditors, P2P Islamic Projects
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, validator


# -- PoSC Rule --

class PoSCRuleBase(BaseModel):
    rule_code: str = Field(..., max_length=50)
    rule_name_ru: str = Field(..., max_length=300)
    category: str = Field(..., description="riba|gharar|maysir|haram_sector|contract_structure|asset_type|ownership")
    severity: str = Field(..., description="critical|major|minor")
    standard_ref: Optional[str] = None
    standard_org: Optional[str] = None
    check_type: str = Field(..., description="boolean|threshold|presence")
    threshold_value: Optional[Decimal] = None
    description_ru: Optional[str] = None
    is_active: bool = True

    @validator("category")
    def validate_category(cls, v):
        allowed = {"riba", "gharar", "maysir", "haram_sector", "contract_structure", "asset_type", "ownership"}
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v

    @validator("severity")
    def validate_severity(cls, v):
        if v not in ("critical", "major", "minor"):
            raise ValueError("severity must be critical, major or minor")
        return v

    @validator("check_type")
    def validate_check_type(cls, v):
        if v not in ("boolean", "threshold", "presence"):
            raise ValueError("check_type must be boolean, threshold or presence")
        return v


class PoSCRuleCreate(PoSCRuleBase):
    pass


class PoSCRuleUpdate(BaseModel):
    rule_name_ru: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    standard_ref: Optional[str] = None
    standard_org: Optional[str] = None
    check_type: Optional[str] = None
    threshold_value: Optional[Decimal] = None
    description_ru: Optional[str] = None
    is_active: Optional[bool] = None


class PoSCRuleOut(PoSCRuleBase):
    id: UUID

    class Config:
        from_attributes = True


# -- PoSC Case --

class PoSCCaseBase(BaseModel):
    object_type: str = Field(..., description="transaction|company|product|p2p_project|contract")
    object_ref_id: Optional[UUID] = None
    object_name: Optional[str] = Field(None, max_length=300)
    input_data: dict

    @validator("object_type")
    def validate_object_type(cls, v):
        allowed = {"transaction", "company", "product", "p2p_project", "contract"}
        if v not in allowed:
            raise ValueError(f"object_type must be one of {allowed}")
        return v


class PoSCCaseCreate(PoSCCaseBase):
    pass


class PoSCFindingOut(BaseModel):
    id: UUID
    rule_id: UUID
    result: str
    actual_value: Optional[Decimal] = None
    threshold_value: Optional[Decimal] = None
    note_ru: Optional[str] = None
    rule: Optional[PoSCRuleOut] = None

    class Config:
        from_attributes = True


class PoSCCaseOut(PoSCCaseBase):
    id: UUID
    user_id: int
    case_date: datetime
    score: Optional[Decimal] = None
    risk_level: Optional[str] = None
    status: str
    hash_ref: Optional[str] = None
    created_at: datetime
    findings: List[PoSCFindingOut] = []

    class Config:
        from_attributes = True


class PoSCCaseList(BaseModel):
    id: UUID
    object_type: str
    object_name: Optional[str] = None
    score: Optional[Decimal] = None
    risk_level: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# -- SSB Review Queue --

class SSBReviewBase(BaseModel):
    posc_case_id: UUID


class SSBReviewCreate(SSBReviewBase):
    pass


class SSBReviewDecision(BaseModel):
    status: str = Field(..., description="approved|rejected|requires_modification")
    decision_note: Optional[str] = None
    standard_refs: Optional[str] = None

    @validator("status")
    def validate_status(cls, v):
        allowed = {"approved", "rejected", "requires_modification"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class SSBReviewOut(BaseModel):
    id: UUID
    posc_case_id: UUID
    requested_by: int
    requested_at: datetime
    assigned_to: Optional[int] = None
    status: str
    decision_note: Optional[str] = None
    decided_at: Optional[datetime] = None
    standard_refs: Optional[str] = None

    class Config:
        from_attributes = True


# -- Islamic Auditor Registry --

class AuditorBase(BaseModel):
    full_name: str = Field(..., max_length=300)
    organization: Optional[str] = Field(None, max_length=300)
    qualification: str = Field(..., description="CSAA|CISA|IFQB|other")
    issuing_body: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    contact_email: Optional[str] = Field(None, max_length=200)
    is_active: bool = True

    @validator("qualification")
    def validate_qualification(cls, v):
        if v not in ("CSAA", "CISA", "IFQB", "other"):
            raise ValueError("qualification must be CSAA, CISA, IFQB or other")
        return v


class AuditorCreate(AuditorBase):
    pass


class AuditorUpdate(BaseModel):
    full_name: Optional[str] = None
    organization: Optional[str] = None
    qualification: Optional[str] = None
    issuing_body: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None


class AuditorOut(AuditorBase):
    id: UUID
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# -- P2P Islamic Project --

class P2PProjectBase(BaseModel):
    title_ru: str = Field(..., max_length=300)
    description_ru: Optional[str] = None
    structure_type: str = Field(..., description="mudaraba|musharaka|murabaha|ijara|salam|istisna")
    sector: Optional[str] = Field(None, max_length=100)
    requested_amount_uzs: Decimal = Field(..., gt=0)
    tenor_months: Optional[int] = None
    expected_return_text: Optional[str] = Field(None, max_length=200)
    is_esg: bool = False
    legal_disclaimer: Optional[str] = None

    @validator("structure_type")
    def validate_structure(cls, v):
        allowed = {"mudaraba", "musharaka", "murabaha", "ijara", "salam", "istisna"}
        if v not in allowed:
            raise ValueError(f"structure_type must be one of {allowed}")
        return v


class P2PProjectCreate(P2PProjectBase):
    pass


class P2PProjectUpdate(BaseModel):
    title_ru: Optional[str] = None
    description_ru: Optional[str] = None
    structure_type: Optional[str] = None
    sector: Optional[str] = None
    requested_amount_uzs: Optional[Decimal] = None
    tenor_months: Optional[int] = None
    expected_return_text: Optional[str] = None
    status: Optional[str] = None
    is_esg: Optional[bool] = None
    legal_disclaimer: Optional[str] = None


class P2PProjectOut(P2PProjectBase):
    id: UUID
    created_by: int
    posc_case_id: Optional[UUID] = None
    posc_score: Optional[Decimal] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class P2PProjectList(BaseModel):
    id: UUID
    title_ru: str
    structure_type: str
    requested_amount_uzs: Decimal
    posc_score: Optional[Decimal] = None
    status: str
    is_esg: bool
    created_at: datetime

    class Config:
        from_attributes = True
