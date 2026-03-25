"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const REPORTS = [
  { id: 1, title: "Kvartalniy otchet po shariatskomu komplaensu", date: "2025-03-31", status: "ready", type: "compliance", icon: "✅" },
  { id: 2, title: "Otchet po zakyatu za Q1 2025", date: "2025-03-31", status: "ready", type: "zakat", icon: "💰" },
  { id: 3, title: "Analiz sukuk-portfelya", date: "2025-03-15", status: "ready", type: "sukuk", icon: "📈" },
  { id: 4, title: "PoSC-verifikatsiya produktov", date: "2025-02-28", status: "pending", type: "posc", icon: "🔒" },
  { id: 5, title: "Otchet SSB po fatvam", date: "2025-02-15", status: "ready", type: "ssb", icon: "📚" },
  { id: 6, title: "Takafol - otchet po strakhovym sluchayam", date: "2025-01-31", status: "ready", type: "takaful", icon: "🛡️" },
];

export default function ReportsPage() {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...new Set(REPORTS.map((r) => r.type))];
  const filtered = filter === "all" ? REPORTS : REPORTS.filter((r) => r.type === filter);

  return (
    <IslamicFinanceLayout title="Otchety" titleIcon="📊">
      <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: C.text }}>📊 Otchety po islamskim finansam</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === t ? C.primary : C.border}`, background: filter === t ? C.primary : C.card, color: filter === t ? "#fff" : C.text, fontSize: 13, cursor: "pointer" }}>
            {t === "all" ? "Vse" : t}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>{r.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.date} | {r.type}</div>
              </div>
            </div>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: r.status === "ready" ? C.successBg : C.warningBg, color: r.status === "ready" ? C.success : C.warning }}>
              {r.status === "ready" ? "Gotov" : "V obrabotke"}
            </span>
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
