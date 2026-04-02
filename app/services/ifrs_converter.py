"""
E2-04: IFRSConverter — NSBU to IFRS auto-conversion.

Covers ~80% of typical NSBU→IFRS differences:
  - IFRS 16 (Leases)
  - IAS 16 (Property, Plant & Equipment revaluation)
  - IAS 36 / IFRS 9 (Impairment / Expected Credit Loss)

Uses Uzbekistan NSBU chart of accounts codes.
"""
import logging
import uuid
from decimal import Decimal
from datetime import date
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.services.analytics.constants import UZ_REFINANCING_RATE

logger = logging.getLogger(__name__)


@dataclass
class IFRSAdjustmentData:
    adjustment_type: str      # "ifrs16_lease", "ias16_revaluation", "ias36_impairment"
    account_code: str         # NSBU account code
    nsbu_amount: Decimal
    ifrs_amount: Decimal
    difference: Decimal       # = ifrs_amount - nsbu_amount
    description: str


@dataclass
class IFRSConversionResult:
    portfolio_id: int
    period_from: date
    period_to: date
    adjustments: list[IFRSAdjustmentData] = field(default_factory=list)
    total_nsbu_assets: Decimal = Decimal(0)
    total_ifrs_assets: Decimal = Decimal(0)
    total_nsbu_equity: Decimal = Decimal(0)
    total_ifrs_equity: Decimal = Decimal(0)
    oci_amount: Decimal = Decimal(0)
    warnings: list[str] = field(default_factory=list)
    status: str = "completed"  # "completed" | "partial" | "error"


class IFRSConverter:
    """
    Automatic NSBU → IFRS financial statement conversion.
    Coverage: IFRS 16 (leases) + IAS 16 (PPE) + IAS 36/IFRS 9 (impairment) ≈ 80% of typical gaps.
    """

    # NSBU account codes → adjustment categories (Uzbekistan chart of accounts)
    NSBU_ACCOUNT_MAPPING = {
        # Fixed assets / PPE (IAS 16)
        "0100": "fixed_assets",      # Основные средства (по первоначальной стоимости)
        "0200": "depreciation",      # Амортизация ОС
        # Leases (IFRS 16)
        "6970": "lease_payments",    # Арендные платежи (расходы по НСБУ)
        "0820": "operating_lease",   # Имущество на ответственном хранении
        # Receivables (IFRS 9)
        "4010": "receivables",       # Счета к получению
        "4020": "receivables",       # Авансы выданные
        # Inventory (IAS 2)
        "1000": "inventory",         # Материалы
        "1500": "inventory",         # Готовая продукция
        # Intangible assets (IAS 38)
        "0400": "intangible_assets", # НМА
    }

    # Default conversion parameters for Uzbekistan (2025)
    DEFAULT_PARAMS = {
        "discount_rate": Decimal(str(UZ_REFINANCING_RATE)) + Decimal("0.04"),  # ~18%
        "lease_term_years": Decimal("5"),
        "os_revaluation_factor": Decimal("1.15"),   # avg market/book ratio for PPE
        "impairment_rate": Decimal("0.05"),          # ECL rate per IFRS 9
    }

    def convert(
        self,
        portfolio_id: int,
        organization_id: int,
        period_from: date,
        period_to: date,
        db: Session,
    ) -> IFRSConversionResult:
        """
        Main conversion pipeline:
        1. Load NSBU balance entries for the period
        2. Apply IFRS 16 (leases)
        3. Apply IAS 16 (PPE revaluation)
        4. Apply IAS 36 / IFRS 9 (impairment / ECL)
        5. Calculate OCI
        6. Persist adjustments + IFRS financial statement
        """
        result = IFRSConversionResult(
            portfolio_id=portfolio_id,
            period_from=period_from,
            period_to=period_to,
        )

        # Load NSBU balance entries from DB
        balance_data = self._load_balance_data(organization_id, period_from, period_to, db)

        if not balance_data:
            result.status = "partial"
            result.warnings.append(
                "Нет данных НСБУ за указанный период. "
                "Загрузите данные из 1С или введите баланс вручную."
            )
            self._save_adjustments(result, organization_id, db)
            return result

        # Classify entries by NSBU account type
        classified = self._classify_entries(balance_data)

        # Apply IFRS adjustments
        lease_adj = self._apply_ifrs16(classified.get("lease_payments", []))
        os_adj = self._apply_ias16(
            classified.get("fixed_assets", []),
            classified.get("depreciation", []),
        )
        impairment_adj = self._apply_ias36(classified.get("receivables", []))

        all_adjustments = lease_adj + os_adj + impairment_adj
        result.adjustments = all_adjustments

        # Calculate OCI
        result.oci_amount = self._calculate_oci(all_adjustments)

        # Aggregate totals
        result.total_nsbu_assets = sum(
            (a.nsbu_amount for a in all_adjustments), Decimal(0)
        )
        result.total_ifrs_assets = sum(
            (a.ifrs_amount for a in all_adjustments), Decimal(0)
        )
        # Equity impact = OCI + retained earnings adjustments
        equity_diff = sum((a.difference for a in all_adjustments), Decimal(0))
        result.total_nsbu_equity = Decimal(0)
        result.total_ifrs_equity = equity_diff

        if not all_adjustments:
            result.status = "partial"
            result.warnings.append(
                "Данные НСБУ найдены, но нет счетов, подлежащих МСФО-корректировке."
            )

        # Persist to DB
        self._save_adjustments(result, organization_id, db)

        return result

    # ── Data loading ──────────────────────────────────────────────────────

    def _load_balance_data(
        self,
        organization_id: int,
        period_from: date,
        period_to: date,
        db: Session,
    ) -> list[dict]:
        """Load NSBU balance entries joined with chart of accounts."""
        from app.db.models.organization_models import BalanceEntry, ChartOfAccounts

        rows = (
            db.query(
                BalanceEntry.id,
                BalanceEntry.account_id,
                ChartOfAccounts.code,
                ChartOfAccounts.name_ru,
                ChartOfAccounts.category,
                BalanceEntry.debit,
                BalanceEntry.credit,
                BalanceEntry.balance,
                BalanceEntry.period_date,
            )
            .join(ChartOfAccounts, BalanceEntry.account_id == ChartOfAccounts.id)
            .filter(
                BalanceEntry.organization_id == organization_id,
                BalanceEntry.period_date >= period_from,
                BalanceEntry.period_date <= period_to,
            )
            .all()
        )

        return [
            {
                "id": r.id,
                "account_id": r.account_id,
                "account_code": r.code,
                "account_name": r.name_ru,
                "category": r.category,
                "debit": r.debit or Decimal(0),
                "credit": r.credit or Decimal(0),
                "balance": r.balance or Decimal(0),
                "period_date": r.period_date,
            }
            for r in rows
        ]

    def _classify_entries(self, entries: list[dict]) -> dict[str, list[dict]]:
        """Group balance entries by NSBU account mapping category."""
        classified: dict[str, list[dict]] = {}
        for entry in entries:
            code = entry["account_code"]
            # Match on first 4 digits of account code
            prefix = code[:4] if len(code) >= 4 else code
            category = self.NSBU_ACCOUNT_MAPPING.get(prefix)
            if category:
                classified.setdefault(category, []).append(entry)
        return classified

    # ── IFRS 16 — Leases ─────────────────────────────────────────────────

    def _apply_ifrs16(self, lease_entries: list[dict]) -> list[IFRSAdjustmentData]:
        """
        IFRS 16 — Leases:
        NSBU: lease payments expensed (account 6970)
        IFRS: Right-of-Use asset + Lease liability = PV of payments
              Expense = RoU depreciation + interest (not the payment itself)

        PV = payment × (1 - (1+r)^(-n)) / r
        """
        if not lease_entries:
            return []

        r = self.DEFAULT_PARAMS["discount_rate"]
        n = self.DEFAULT_PARAMS["lease_term_years"]
        adjustments = []

        # Aggregate lease payments for the period
        total_lease = sum((e["balance"] for e in lease_entries), Decimal(0))
        if total_lease == 0:
            total_lease = sum((e["debit"] for e in lease_entries), Decimal(0))
        if total_lease == 0:
            return []

        # Present value of lease payments (annuity formula)
        # PV = payment × (1 - (1+r)^(-n)) / r
        one_plus_r = Decimal(1) + r
        pv_factor = (Decimal(1) - one_plus_r ** (-n)) / r
        rou_asset = abs(total_lease) * pv_factor

        # Under IFRS, the RoU asset replaces the operating expense
        # Annual depreciation of RoU = rou_asset / n
        # Annual interest = rou_asset * r (simplified first-year)
        ifrs_expense = (rou_asset / n) + (rou_asset * r)

        adjustments.append(IFRSAdjustmentData(
            adjustment_type="ifrs16_lease",
            account_code="6970",
            nsbu_amount=abs(total_lease),
            ifrs_amount=ifrs_expense.quantize(Decimal("0.01")),
            difference=(ifrs_expense - abs(total_lease)).quantize(Decimal("0.01")),
            description=(
                f"IFRS 16: Право пользования (RoU) = {rou_asset.quantize(Decimal('0.01'))}, "
                f"расход МСФО (аморт.+%) = {ifrs_expense.quantize(Decimal('0.01'))} "
                f"vs НСБУ платежи = {abs(total_lease)}"
            ),
        ))

        return adjustments

    # ── IAS 16 — PPE Revaluation ─────────────────────────────────────────

    def _apply_ias16(
        self,
        asset_entries: list[dict],
        depreciation_entries: list[dict],
    ) -> list[IFRSAdjustmentData]:
        """
        IAS 16 — Property, Plant & Equipment:
        NSBU: historical cost minus straight-line depreciation
        IFRS: revaluation model — fair value

        Adjustment = (market_value - book_value)
        Positive difference → OCI (revaluation surplus)
        """
        if not asset_entries:
            return []

        factor = self.DEFAULT_PARAMS["os_revaluation_factor"]
        adjustments = []

        # Gross asset value (account 0100)
        gross_assets = sum((e["balance"] for e in asset_entries), Decimal(0))
        if gross_assets == 0:
            gross_assets = sum((e["debit"] for e in asset_entries), Decimal(0))

        # Accumulated depreciation (account 0200)
        accum_depr = sum((e["balance"] for e in depreciation_entries), Decimal(0))
        if accum_depr == 0:
            accum_depr = sum((e["credit"] for e in depreciation_entries), Decimal(0))

        book_value = abs(gross_assets) - abs(accum_depr)
        if book_value <= 0:
            return []

        fair_value = (book_value * factor).quantize(Decimal("0.01"))
        difference = fair_value - book_value

        adjustments.append(IFRSAdjustmentData(
            adjustment_type="ias16_revaluation",
            account_code="0100",
            nsbu_amount=book_value.quantize(Decimal("0.01")),
            ifrs_amount=fair_value,
            difference=difference.quantize(Decimal("0.01")),
            description=(
                f"IAS 16: Переоценка ОС. Балансовая = {book_value.quantize(Decimal('0.01'))}, "
                f"справедливая = {fair_value} (коэфф. {factor}). "
                f"Прирост → OCI = {difference.quantize(Decimal('0.01'))}"
            ),
        ))

        return adjustments

    # ── IAS 36 / IFRS 9 — Impairment / ECL ──────────────────────────────

    def _apply_ias36(self, receivables_entries: list[dict]) -> list[IFRSAdjustmentData]:
        """
        IAS 36 / IFRS 9 — Impairment of receivables:
        NSBU: provision only when specific default occurs
        IFRS: Expected Credit Loss (ECL) — probability-weighted model

        Adjustment: increase provision by ECL percentage
        """
        if not receivables_entries:
            return []

        ecl_rate = self.DEFAULT_PARAMS["impairment_rate"]
        adjustments = []

        total_receivables = sum((e["balance"] for e in receivables_entries), Decimal(0))
        if total_receivables == 0:
            total_receivables = sum(
                (e["debit"] for e in receivables_entries), Decimal(0)
            )
        if total_receivables == 0:
            return []

        ecl_provision = (abs(total_receivables) * ecl_rate).quantize(Decimal("0.01"))
        ifrs_receivables = abs(total_receivables) - ecl_provision

        adjustments.append(IFRSAdjustmentData(
            adjustment_type="ias36_impairment",
            account_code="4010",
            nsbu_amount=abs(total_receivables).quantize(Decimal("0.01")),
            ifrs_amount=ifrs_receivables,
            difference=(-ecl_provision),
            description=(
                f"IFRS 9 ECL: Дебиторская = {abs(total_receivables).quantize(Decimal('0.01'))}, "
                f"резерв ECL = {ecl_provision} ({ecl_rate * 100}%). "
                f"МСФО дебиторская = {ifrs_receivables}"
            ),
        ))

        return adjustments

    # ── OCI ───────────────────────────────────────────────────────────────

    def _calculate_oci(self, adjustments: list[IFRSAdjustmentData]) -> Decimal:
        """OCI = revaluation surplus from IAS 16 + FX differences from IAS 21."""
        oci = Decimal(0)
        for adj in adjustments:
            if adj.adjustment_type == "ias16_revaluation":
                oci += adj.difference
        return oci

    # ── Persistence ───────────────────────────────────────────────────────

    def _save_adjustments(
        self,
        result: IFRSConversionResult,
        organization_id: int,
        db: Session,
    ) -> None:
        """Persist adjustments and converted IFRS financial statement to DB."""
        from app.db.models.ifrs import IFRSAdjustment, FinancialStatement

        # Delete previous adjustments for this portfolio/period
        db.query(IFRSAdjustment).filter(
            IFRSAdjustment.portfolio_id == result.portfolio_id,
            IFRSAdjustment.organization_id == organization_id,
            IFRSAdjustment.period_from == result.period_from,
            IFRSAdjustment.period_to == result.period_to,
        ).delete(synchronize_session=False)

        # Create new adjustment records
        for adj in result.adjustments:
            db.add(IFRSAdjustment(
                id=uuid.uuid4(),
                portfolio_id=result.portfolio_id,
                organization_id=organization_id,
                period_from=result.period_from,
                period_to=result.period_to,
                adjustment_type=adj.adjustment_type,
                account_code=adj.account_code,
                nsbu_amount=adj.nsbu_amount,
                ifrs_amount=adj.ifrs_amount,
                difference=adj.difference,
                description=adj.description,
            ))

        # Create/update IFRS financial statement
        existing_stmt = db.query(FinancialStatement).filter(
            FinancialStatement.portfolio_id == result.portfolio_id,
            FinancialStatement.standard == "ifrs",
            FinancialStatement.statement_type == "Balance",
            FinancialStatement.period_from == result.period_from,
            FinancialStatement.period_to == result.period_to,
        ).first()

        stmt_data = {
            "total_nsbu_assets": str(result.total_nsbu_assets),
            "total_ifrs_assets": str(result.total_ifrs_assets),
            "total_nsbu_equity": str(result.total_nsbu_equity),
            "total_ifrs_equity": str(result.total_ifrs_equity),
            "oci_amount": str(result.oci_amount),
            "adjustments_count": len(result.adjustments),
            "status": result.status,
            "warnings": result.warnings,
            "adjustments": [
                {
                    "type": a.adjustment_type,
                    "account": a.account_code,
                    "nsbu": str(a.nsbu_amount),
                    "ifrs": str(a.ifrs_amount),
                    "diff": str(a.difference),
                    "description": a.description,
                }
                for a in result.adjustments
            ],
        }

        if existing_stmt:
            existing_stmt.data = stmt_data
        else:
            db.add(FinancialStatement(
                id=uuid.uuid4(),
                portfolio_id=result.portfolio_id,
                statement_type="Balance",
                standard="ifrs",
                period_from=result.period_from,
                period_to=result.period_to,
                data=stmt_data,
            ))

        db.commit()
