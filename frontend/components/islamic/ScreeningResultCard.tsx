"use client";
import { ScreeningResult } from "./api";
import ShariahStatusBadge from "./ShariahStatusBadge";
import StandardRefBadge from "./StandardRefBadge";
import ShariahGauge from "./ShariahGauge";
import ShariahRadarChart from "./ShariahRadarChart";
import BenchmarkBar from "./BenchmarkBar";
import { C } from "./IslamicFinanceLayout";

interface Props { result: ScreeningResult; }

export default function ScreeningResultCard({ result }: Props) {
  const radarMetrics = [
    { label: "\u0425\u0430\u0440\u0430\u043c", value: Number(result.haram_revenue_pct) || 0, max: 10 },
    { label: "\u0414\u043e\u043b\u0433", value: Number(result.debt_ratio) || 0, max: 66 },
    { label: "% \u0434\u043e\u0445\u043e\u0434", value: Number(result.interest_income_pct) || 0, max: 10 },
    { label: "\u0421\u043a\u043e\u0440\u0438\u043d\u0433", value: Number(result.score) || 0, max: 5 },
    { label: "\u0427\u0438\u0441\u0442\u043e\u0442\u0430", value: Math.max(0, 5 - (Number(result.haram_revenue_pct) || 0)), max: 5 },
  ];

  const benchmarkItems = [
    { label: "\u0425\u0430\u0440\u0430\u043c-\u0432\u044b\u0440\u0443\u0447\u043a\u0430", value: Number(result.haram_revenue_pct) || 0, limit: 5 },
    { label: "\u0414\u043e\u043b\u0433\u043e\u0432\u0430\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0430", value: Number(result.debt_ratio) || 0, limit: 33 },
    { label: "\u041f\u0440\u043e\u0446\u0435\u043d\u0442\u043d\u044b\u0439 \u0434\u043e\u0445\u043e\u0434", value: Number(result.interest_income_pct) || 0, limit: 5 },
  ];

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
        <ShariahGauge score={Number(result.score)} size={160} />
      </div>

      {/* Visualizations row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
        {/* Radar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>\ud83d\udcca \u0420\u0430\u0434\u0430\u0440</div>
          <ShariahRadarChart metrics={radarMetrics} size={220} />
        </div>
        {/* Benchmark bars */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>\ud83d\udcca \u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438 vs \u043b\u0438\u043c\u0438\u0442\u044b</div>
          <BenchmarkBar items={benchmarkItems} />
        </div>
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
