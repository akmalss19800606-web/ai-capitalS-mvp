"use client";
import { ScreeningResult } from "./api";
import ShariahStatusBadge from "./ShariahStatusBadge";
import StandardRefBadge from "./StandardRefBadge";
import ShariahGauge from "./ShariahGauge";
import { C } from "./IslamicFinanceLayout";

interface Props { result: ScreeningResult; }

const SCORE_COLOR = (s: number) =>
  Number(s) >= 4 ? "#2563eb" : Number(s) >= 2.5 ? "#d97706" : "#dc2626";

export default function ScreeningResultCard({ result }: Props) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{result.company_name}</h3>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <ShariahStatusBadge status={result.status} score={result.score} />
            <StandardRefBadge code="SS No. 62" org="AAOIFI" />
          </div>
        </div>
        {/* Gauge */}
        <ShariahGauge score={Number(result.score)} size={160} />
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "\u0425\u0430\u0440\u0430\u043c-\u0432\u044b\u0440\u0443\u0447\u043a\u0430", value: result.haram_revenue_pct, limit: 5, unit: "%" },
          { label: "\u0414\u043e\u043b\u0433\u043e\u0432\u0430\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0430", value: result.debt_ratio, limit: 33, unit: "%" },
          { label: "\u041f\u0440\u043e\u0446\u0435\u043d\u0442\u043d\u044b\u0439 \u0434\u043e\u0445\u043e\u0434", value: result.interest_income_pct, limit: 5, unit: "%" },
        ].map((m) => {
          const val = Number(m.value) || 0;
          const over = val > m.limit;
          return (
            <div key={m.label} style={{ padding: 12, background: over ? C.errorBg : C.successBg, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: over ? C.error : C.success }}>
                {val.toFixed(1)}{m.unit}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>\u043b\u0438\u043c\u0438\u0442: {m.limit}{m.unit}</div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div style={{ padding: 12, background: C.infoBg, borderRadius: 8, border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>\ud83d\udca1 \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438:</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.text }}>
            {result.recommendations.map((r: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
