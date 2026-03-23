"use client";
import { ScreeningResult } from "./api";
import ShariahStatusBadge from "./ShariahStatusBadge";
import StandardRefBadge from "./StandardRefBadge";
import { C } from "./IslamicFinanceLayout";

interface Props { result: ScreeningResult; }

const SCORE_COLOR = (s: number) =>
  Number(s) >= 4 ? "#2563eb" : Number(s) >= 2.5 ? "#d97706" : "#dc2626";

export default function ScreeningResultCard({ result }: Props) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{result.company_name}</h3>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <ShariahStatusBadge status={result.status} score={result.score} />
            <StandardRefBadge code="SS No. 62" org="AAOIFI" />
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: SCORE_COLOR(result.score) }}>
          {Number(result.score).toFixed(1)}
        </div>
      </div>

      {/* Показатели */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Харам-выручка", value: result.haram_revenue_pct, limit: 5, unit: "%" },
          { label: "Долговая нагрузка", value: result.debt_ratio, limit: 33, unit: "%" },
          { label: "Процентный доход", value: result.interest_income_pct, limit: 5, unit: "%" },
        ].map(item => {
          const exceeded = item.value !== undefined && item.value !== null && item.value > item.limit;
          return (
            <div key={item.label} style={{
              borderRadius: 8, padding: 12,
              border: `1px solid ${exceeded ? "#fca5a5" : C.border}`,
              background: exceeded ? "#fef2f2" : C.bg,
            }}>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{item.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: exceeded ? "#dc2626" : C.text }}>
                {item.value !== undefined && item.value !== null ? `${item.value}%` : "—"}
              </p>
              <p style={{ fontSize: 11, color: C.muted }}>лимит: {item.limit}%</p>
            </div>
          );
        })}
      </div>

      {/* Нарушения */}
      {result.violations && Object.keys(result.violations).length > 0 && (
        <div style={{ borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", padding: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", marginBottom: 8 }}>Нарушения:</p>
          {Object.entries(result.violations).map(([k, v]) => (
            <p key={k} style={{ fontSize: 12, color: "#dc2626" }}>
              ⚠️ {v.label}: {v.value}% (лимит {v.threshold}%)
            </p>
          ))}
        </div>
      )}

      {/* Рекомендация */}
      <p style={{ fontSize: 13, color: C.muted, background: C.bg, borderRadius: 8, padding: 12 }}>
        {result.recommendation}
      </p>
      <p style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
        Дата анализа: {result.analysis_date}
      </p>
    </div>
  );
}
