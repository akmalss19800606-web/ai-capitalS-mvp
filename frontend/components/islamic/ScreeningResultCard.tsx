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
    { label: "Харам", value: Number(result.haram_revenue_pct) || 0, max: 10 },
    { label: "Долг", value: Number(result.debt_ratio) || 0, max: 66 },
    { label: "% доход", value: Number(result.interest_income_pct) || 0, max: 10 },
    { label: "Скоринг", value: Number(result.score) || 0, max: 5 },
    { label: "Чистота", value: Math.max(0, 5 - (Number(result.haram_revenue_pct) || 0)), max: 5 },
  ];

  const benchmarkItems = [
    { label: "Харам-выручка", value: Number(result.haram_revenue_pct) || 0, limit: 5 },
    { label: "Долговая нагрузка", value: Number(result.debt_ratio) || 0, limit: 33 },
    { label: "Процентный доход", value: Number(result.interest_income_pct) || 0, limit: 5 },
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
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Радар</div>
          <ShariahRadarChart metrics={radarMetrics} size={220} />
        </div>
        {/* Benchmark bars */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Показатели vs лимиты</div>
          <BenchmarkBar items={benchmarkItems} />
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div style={{ padding: 12, background: C.infoBg, borderRadius: 8, border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Рекомендации:</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.text }}>
            {result.recommendations.map((r: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
