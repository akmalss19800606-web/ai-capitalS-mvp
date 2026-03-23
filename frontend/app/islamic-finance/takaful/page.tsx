"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface TakafulPlan {
  id: number;
  name: string;
  type: "general" | "family" | "health" | "property";
  provider: string;
  monthly_contribution: number;
  coverage_amount: number;
  currency: string;
  shariah_compliant: boolean;
  surplus_sharing: number;
  description: string;
}

const MOCK_PLANS: TakafulPlan[] = [
  { id: 1, name: "\u0422\u0430\u043a\u0430\u0444\u0443\u043b \u0421\u0435\u043c\u0435\u0439\u043d\u044b\u0439", type: "family", provider: "TakafulUZ", monthly_contribution: 500000, coverage_amount: 100000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 70, description: "\u0421\u0435\u043c\u0435\u0439\u043d\u043e\u0435 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u043e \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u0443 \u043c\u0443\u0434\u0430\u0440\u0430\u0431\u0430" },
  { id: 2, name: "\u0422\u0430\u043a\u0430\u0444\u0443\u043b \u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435", type: "health", provider: "IslamInsure", monthly_contribution: 300000, coverage_amount: 50000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 60, description: "\u041c\u0435\u0434\u0438\u0446\u0438\u043d\u0441\u043a\u043e\u0435 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u0435 \u0431\u0435\u0437 \u0440\u0438\u0431\u0430 \u0438 \u0433\u0430\u0440\u0430\u0440" },
  { id: 3, name: "\u0422\u0430\u043a\u0430\u0444\u0443\u043b \u0418\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u043e", type: "property", provider: "TakafulUZ", monthly_contribution: 200000, coverage_amount: 200000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 65, description: "\u0417\u0430\u0449\u0438\u0442\u0430 \u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u0438 \u0438 \u0430\u043a\u0442\u0438\u0432\u043e\u0432" },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  general: { label: "\u041e\u0431\u0449\u0438\u0439", icon: "\ud83d\udee1\ufe0f" },
  family: { label: "\u0421\u0435\u043c\u0435\u0439\u043d\u044b\u0439", icon: "\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67" },
  health: { label: "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435", icon: "\ud83c\udfe5" },
  property: { label: "\u0418\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u043e", icon: "\ud83c\udfe0" },
};

export default function TakafulPage() {
  const [filter, setFilter] = useState<string>("all");
  const [calc, setCalc] = useState({ amount: "", months: "12" });
  const filtered = filter === "all" ? MOCK_PLANS : MOCK_PLANS.filter(p => p.type === filter);
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          \ud83d\udee1\ufe0f \u0422\u0430\u043a\u0430\u0444\u0443\u043b (\u0418\u0441\u043b\u0430\u043c\u0441\u043a\u043e\u0435 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0438\u0435)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          \u0412\u0437\u0430\u0438\u043c\u043d\u043e\u0435 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0430\u043d\u0438\u0435 \u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0435 \u043f\u0440\u0438\u043d\u0446\u0438\u043f\u043e\u0432 \u0442\u0430\u0431\u0430\u0440\u0440\u0443 \u0438 \u0442\u0430\u0430\u0432\u0443\u043d
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["all", "family", "health", "property", "general"].map(t => (
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

        <div style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: C.primary }}>\ud83e\uddee \u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440 \u0432\u0437\u043d\u043e\u0441\u043e\u0432</h4>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 11, color: C.muted }}>\u0421\u0443\u043c\u043c\u0430 \u043f\u043e\u043a\u0440\u044b\u0442\u0438\u044f (UZS)</label>
              <input value={calc.amount} onChange={e => setCalc(p => ({ ...p, amount: e.target.value }))} placeholder="50000000" style={{ display: "block", padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, width: 180 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.muted }}>\u0421\u0440\u043e\u043a (\u043c\u0435\u0441.)</label>
              <select value={calc.months} onChange={e => setCalc(p => ({ ...p, months: e.target.value }))} style={{ display: "block", padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}>
                {["6", "12", "24", "36"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
              {calc.amount ? `~ ${fmt(Math.round(Number(calc.amount) * 0.005 * Number(calc.months) / 12))} UZS/\u043c\u0435\u0441.` : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{typeLabels[p.type]?.icon} {p.name}</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{p.provider} \u2022 {p.description}</p>
                </div>
                {p.shariah_compliant && <span style={{ padding: "3px 10px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 600 }}>\u2705 Shariah</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "\u0412\u0437\u043d\u043e\u0441", value: `${fmt(p.monthly_contribution)} ${p.currency}/\u043c\u0435\u0441.` },
                  { label: "\u041f\u043e\u043a\u0440\u044b\u0442\u0438\u0435", value: `${fmt(p.coverage_amount)} ${p.currency}` },
                  { label: "\u041f\u0440\u043e\u0444\u0438\u0446\u0438\u0442", value: `${p.surplus_sharing}% \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0443` },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 8, padding: 8 }}>
                    <p style={{ margin: 0, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{item.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: C.text }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
