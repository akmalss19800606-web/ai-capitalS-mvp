"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface WaqfProject {
  id: number;
  name: string;
  type: "educational" | "healthcare" | "mosque" | "social" | "infrastructure";
  location: string;
  target_amount: number;
  raised_amount: number;
  currency: string;
  status: "active" | "completed" | "planned";
  beneficiaries: number;
  description: string;
}

const MOCK_WAQF: WaqfProject[] = [
  { id: 1, name: "\u0412\u0430\u043a\u0444 \u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435", type: "educational", location: "\u0422\u0430\u0448\u043a\u0435\u043d\u0442", target_amount: 5000000000, raised_amount: 3200000000, currency: "UZS", status: "active", beneficiaries: 500, description: "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e \u0438\u0441\u043b\u0430\u043c\u0441\u043a\u043e\u0439 \u0448\u043a\u043e\u043b\u044b" },
  { id: 2, name: "\u0412\u0430\u043a\u0444 \u041c\u0435\u0447\u0435\u0442\u044c \u0421\u0430\u043c\u0430\u0440\u043a\u0430\u043d\u0434", type: "mosque", location: "\u0421\u0430\u043c\u0430\u0440\u043a\u0430\u043d\u0434", target_amount: 8000000000, raised_amount: 8000000000, currency: "UZS", status: "completed", beneficiaries: 2000, description: "\u0420\u0435\u0441\u0442\u0430\u0432\u0440\u0430\u0446\u0438\u044f \u0438\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u043e\u0439 \u043c\u0435\u0447\u0435\u0442\u0438" },
  { id: 3, name: "\u0412\u0430\u043a\u0444 \u041a\u043b\u0438\u043d\u0438\u043a\u0430", type: "healthcare", location: "\u0411\u0443\u0445\u0430\u0440\u0430", target_amount: 3000000000, raised_amount: 900000000, currency: "UZS", status: "active", beneficiaries: 1000, description: "\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u0430\u044f \u043a\u043b\u0438\u043d\u0438\u043a\u0430 \u0434\u043b\u044f \u043d\u0443\u0436\u0434\u0430\u044e\u0449\u0438\u0445\u0441\u044f" },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  educational: { label: "\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435", icon: "\ud83c\udf93" },
  healthcare: { label: "\u0417\u0434\u0440\u0430\u0432\u043e\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435", icon: "\ud83c\udfe5" },
  mosque: { label: "\u041c\u0435\u0447\u0435\u0442\u044c", icon: "\ud83d\udd4c" },
  social: { label: "\u0421\u043e\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0439", icon: "\ud83e\udd1d" },
  infrastructure: { label: "\u0418\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430", icon: "\ud83c\udfd7\ufe0f" },
};

export default function WaqfPage() {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? MOCK_WAQF : MOCK_WAQF.filter(w => w.type === filter);
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const totalRaised = MOCK_WAQF.reduce((s, w) => s + w.raised_amount, 0);
  const totalBenef = MOCK_WAQF.reduce((s, w) => s + w.beneficiaries, 0);

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          \ud83d\udd4c \u0412\u0430\u043a\u0444 (\u0411\u043b\u0430\u0433\u043e\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>
          \u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0432\u0430\u043a\u0444-\u043f\u0440\u043e\u0435\u043a\u0442\u043e\u0432 \u0434\u043b\u044f \u0443\u0447\u0430\u0441\u0442\u0438\u044f \u0438 \u043f\u043e\u0436\u0435\u0440\u0442\u0432\u043e\u0432\u0430\u043d\u0438\u044f
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "\u0412\u0441\u0435\u0433\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u0432", value: String(MOCK_WAQF.length), icon: "\ud83d\udcca" },
            { label: "\u0421\u043e\u0431\u0440\u0430\u043d\u043e", value: `${fmt(totalRaised)} UZS`, icon: "\ud83d\udcb0" },
            { label: "\u0411\u043b\u0430\u0433\u043e\u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u0438", value: fmt(totalBenef), icon: "\ud83d\udc65" },
          ].map((kpi, i) => (
            <div key={i} style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 20 }}>{kpi.icon}</p>
              <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: C.text }}>{kpi.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["all", "educational", "healthcare", "mosque", "social", "infrastructure"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === t ? C.primary : C.border}`,
              background: filter === t ? C.primary : C.card,
              color: filter === t ? "#fff" : C.text
            }}>
              {t === "all" ? "\u0412\u0441\u0435" : `${typeLabels[t]?.icon || ""} ${typeLabels[t]?.label || t}`}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(w => {
            const pct = Math.round((w.raised_amount / w.target_amount) * 100);
            const stMap: Record<string, { bg: string; color: string; label: string }> = {
              active: { bg: "#dcfce7", color: "#166534", label: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439" },
              completed: { bg: "#e0e7ff", color: "#3730a3", label: "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043d" },
              planned: { bg: "#fef9c3", color: "#854d0e", label: "\u041f\u043b\u0430\u043d\u0438\u0440\u0443\u0435\u0442\u0441\u044f" },
            };
            const st = stMap[w.status] || stMap.active;
            return (
              <div key={w.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{typeLabels[w.type]?.icon} {w.name}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{w.location} \u2022 {w.description}</p>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 8, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                </div>
                <div style={{ background: C.bg, borderRadius: 8, height: 8, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: C.primary, borderRadius: 8 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                  <span>{fmt(w.raised_amount)} / {fmt(w.target_amount)} {w.currency}</span>
                  <span style={{ fontWeight: 700, color: C.text }}>{pct}%</span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: C.muted }}>\ud83d\udc65 {fmt(w.beneficiaries)} \u0431\u043b\u0430\u0433\u043e\u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u0435\u0439</p>
              </div>
            );
          })}
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
