"use client";
import { C } from "./IslamicFinanceLayout";

export interface ComplianceSummary {
  total: number;
  halal: number;
  haram: number;
  doubtful: number;
  period?: string;
}

interface Props {
  data: ComplianceSummary;
  title?: string;
}

export default function ComplianceSummaryCard({ data, title = "Сводка соответствия" }: Props) {
  const halalPct = data.total > 0 ? Math.round((data.halal / data.total) * 100) : 0;
  const haramPct = data.total > 0 ? Math.round((data.haram / data.total) * 100) : 0;
  const doubtPct = data.total > 0 ? Math.round((data.doubtful / data.total) * 100) : 0;

  const segments = [
    { label: "Халяль", pct: halalPct, color: C.success, bg: C.successBg, count: data.halal },
    { label: "Сомнит.", pct: doubtPct, color: C.warning, bg: C.warningBg, count: data.doubtful },
    { label: "Харам", pct: haramPct, color: C.error, bg: C.errorBg, count: data.haram },
  ];

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>✅ {title}</h4>
        {data.period && <span style={{ fontSize: 11, color: C.muted }}>{data.period}</span>}
      </div>

      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 16, background: C.bg }}>
        {segments.map((s, i) => s.pct > 0 ? (
          <div key={i} style={{ width: `${s.pct}%`, height: "100%", background: s.color, transition: "width 0.3s" }} />
        ) : null)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 10, padding: 12, textAlign: "center", border: `1px solid ${s.color}` }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{s.label} ({s.pct}%)</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, textAlign: "center" }}>
        <span style={{ fontSize: 12, color: C.muted }}>Всего проверок: <strong style={{ color: C.text }}>{data.total}</strong></span>
      </div>
    </div>
  );
}
