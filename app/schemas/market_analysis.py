"""
Market Analysis Schemas - MARKET-002
Full 25-field request (7 wizard blocks) + 12-section report model.
Based on TZ v3.0 section A.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MarketAnalysisRequest(BaseModel):
    """25-field wizard request - 7 blocks."""

    # Block 1: OKED Activity Selection (fields 1-4)
    oked_section: str = Field(
        ..., description="OKED Level 1 - section (A-U)", min_length=1, max_length=2
    )
    oked_division: str = Field(
        ..., description="OKED Level 2 - division (01-99)", min_length=2, max_length=2
    )
    oked_class: Optional[str] = Field(
        None, description="OKED Level 3 - class"
    )
    activity_description: Optional[str] = Field(
        None, description="Activity description (max 500 chars)", max_length=500
    )

    # Block 2: Investment Parameters (fields 5-9)
    investment_amount: Decimal = Field(
        ..., gt=0, description="Investment amount (USD or UZS), 1000-1B"
    )
    investment_currency: Literal["USD", "UZS"] = Field(
        "USD", description="Investment currency"
    )
    investment_horizon_years: int = Field(
        5, ge=1, le=30, description="Investment horizon (years)"
    )
    investment_type: Literal["greenfield", "expansion", "ma", "franchise"] = Field(
        "greenfield", description="Investment type"
    )
    project_stage: Literal["idea", "business_plan", "launch", "operating"] = Field(
        "idea", description="Project stage"
    )
    funding_sources: List[
        Literal["own", "bank_loan", "leasing", "investor", "grant"]
    ] = Field(default=["own"], description="Funding sources")

    # Block 3: Financial Assumptions (fields 10-13)
    debt_ratio_pct: float = Field(
        30.0, ge=0, le=90, description="Debt ratio (%)"
    )
    expected_loan_rate_pct: float = Field(
        22.8, ge=5, le=40, description="Expected loan rate (%)"
    )
    expected_revenue_year1: Optional[Decimal] = Field(
        None, ge=0, description="Expected revenue Year 1"
    )
    expected_margin_pct: float = Field(
        15.0, ge=-50, le=100, description="Expected margin (%)"
    )

    # Block 4: Regional Context (fields 14-17)
    region: str = Field(
        ..., description="Region of Uzbekistan (from reference 14 regions)"
    )
    city_district: Optional[str] = Field(None, description="City / district")
    sez_code: Optional[str] = Field(
        None, description="SEZ code (from reference 49 SEZs)"
    )
    industrial_zone: Optional[str] = Field(None, description="Industrial zone")

    # Block 5: Market & Competition (fields 18-20)
    target_markets: List[
        Literal["domestic", "cis_export", "global_export"]
    ] = Field(default=["domestic"], description="Target markets")
    expected_market_share_pct: float = Field(
        5.0, ge=0.1, le=50, description="Expected market share (%)"
    )
    competitors_range: Literal["0-3", "4-10", "11-50", "50+"] = Field(
        "4-10", description="Number of competitors"
    )

    # Block 6: Legal & Tax (fields 21-23)
    legal_form: Literal["ip", "ooo", "ao", "farmer", "family"] = Field(
        "ooo", description="Legal form"
    )
    tax_regime: Literal["general", "simplified", "sez", "custom"] = Field(
        "general", description="Tax regime"
    )
    planned_employees: int = Field(
        10, ge=1, le=10000, description="Planned employees"
    )

    # Block 7: Risk Profile (fields 24-25)
    risk_profile: int = Field(
        5, ge=1, le=10, description="Risk profile (1=conservative, 10=aggressive)"
    )
    import_dependency_pct: float = Field(
        30.0, ge=0, le=100, description="Import dependency (%)"
    )


class MacroContext(BaseModel):
    """Auto-filled from APIs: CBU, Stat.uz, Trading Economics."""
    gdp_growth_pct: float = Field(..., description="GDP growth (%)")
    inflation_cpi_pct: float = Field(..., description="CPI (%)")
    policy_rate_pct: float = Field(..., description="CBU policy rate (%)")
    usd_uzs_rate: float = Field(..., description="USD/UZS rate")
    tsmi_index: Optional[float] = Field(None, description="TSMI index")
    rse_capitalization_bln_uzs: Optional[float] = None
    treasury_3y_pct: Optional[float] = Field(None, description="3Y UZS bond yield")
    treasury_10y_pct: Optional[float] = Field(None, description="10Y UZS bond yield")


class RegionalData(BaseModel):
    region_name: str
    grp_bln_uzs: Optional[float] = None
    grp_growth_pct: Optional[float] = None
    population_mln: Optional[float] = None
    avg_salary_uzs: Optional[float] = None


class SEZBenefits(BaseModel):
    sez_name: str
    sez_code: str
    tax_exemptions: List[str] = []
    customs_exemptions: List[str] = []
    infrastructure_benefits: List[str] = []
    duration_years: Optional[int] = None


class ReportSection(BaseModel):
    number: int = Field(..., ge=1, le=12)
    title: str
    content: str
    charts: Optional[List[dict]] = None


class MarketAnalysisReport(BaseModel):
    """12-section AI-generated report."""
    id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    request: MarketAnalysisRequest

    macro_context: MacroContext
    regional_data: RegionalData
    sez_benefits: Optional[SEZBenefits] = None

    executive_summary: str
    recommendation: Literal["invest", "hold", "avoid"]
    confidence_score: float = Field(..., ge=0, le=100)
    sections: List[ReportSection] = Field(..., min_length=12, max_length=12)

    created_at: Optional[datetime] = None
    status: Literal["generating", "ready", "error"] = "generating"
    generation_time_sec: Optional[float] = None
    ai_model_used: Optional[str] = None
    tokens_used: Optional[int] = None


class MarketAnalysisReportSummary(BaseModel):
    """Short version for history list."""
    id: UUID
    oked_section: str
    oked_division: str
    region: str
    recommendation: Literal["invest", "hold", "avoid"]
    confidence_score: float
    investment_amount: Decimal
    investment_currency: str
    created_at: datetime
    status: str
