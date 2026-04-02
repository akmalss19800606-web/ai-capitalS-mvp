"""
Pydantic-схемы: Стресс-тестирование и Ретроспективный анализ.
Фаза 2, Сессия 2.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# STRESS TESTING
# ═══════════════════════════════════════════════════════════════

class ShockParameter(BaseModel):
    factor: str
    shock_pct: float
    description: str = ""


class StressTestRequest(BaseModel):
    portfolio_id: Optional[int] = None
    scenario: str = Field(
        default="financial_crisis",
        description="Один из: financial_crisis, pandemic, rate_hike, currency_shock, stagflation, custom"
    )
    custom_shocks: Optional[List[ShockParameter]] = None
    severity: float = Field(default=1.0, ge=0.1, le=3.0, description="Множитель тяжести шока")


class AssetImpact(BaseModel):
    asset: str
    original_value: float
    stressed_value: float
    loss_pct: float


class ConcentrationRisk(BaseModel):
    dimension: str
    category: str
    weight_pct: float
    loss_pct: float


class StressTestResponse(BaseModel):
    id: int
    portfolio_id: int
    scenario_name: str
    scenario_description: Optional[str] = None
    shock_parameters: List[ShockParameter]
    asset_impacts: List[AssetImpact]
    portfolio_value_before: float
    portfolio_value_after: float
    total_loss_pct: float
    max_single_asset_loss_pct: float
    recovery_time_months: Optional[float] = None
    concentration_risks: Optional[List[ConcentrationRisk]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# RETROSPECTIVE ANALYSIS
# ═══════════════════════════════════════════════════════════════

class VarianceFactor(BaseModel):
    factor: str
    contribution_pct: float
    description: str = ""


class BenchmarkResult(BaseModel):
    benchmark_name: str
    benchmark_return: float
    alpha: float
    tracking_error: float


class CognitiveBias(BaseModel):
    bias_type: str
    severity: str  # "low" | "medium" | "high"
    description: str


class LessonLearned(BaseModel):
    category: str
    insight: str
    recommendation: str


class RetrospectiveRequest(BaseModel):
    analysis_type: str = Field(default="decision", description="decision | portfolio")
    decision_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    forecast_return: float = Field(description="Прогнозируемая доходность (%)")
    actual_return: float = Field(description="Фактическая доходность (%)")


class RetrospectiveResponse(BaseModel):
    id: int
    decision_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    analysis_type: str

    forecast_return: float
    actual_return: float
    variance: float
    variance_pct: float

    mae: Optional[float] = None
    mape: Optional[float] = None
    rmse: Optional[float] = None
    accuracy_score: Optional[float] = None

    variance_factors: Optional[List[VarianceFactor]] = None
    benchmarks: Optional[List[BenchmarkResult]] = None
    cognitive_biases: Optional[List[CognitiveBias]] = None
    lessons: Optional[List[LessonLearned]] = None

    created_at: datetime

    class Config:
        from_attributes = True
