"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, TakafulPlan as ApiTakaful } from "@/components/islamic/api";

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
  { id: 1, name: "Такафул Семейный", type: "family", provider: "TakafulUZ", monthly_contribution: 200000, coverage_amount: 50000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 70, description: "Семейное страхование по принципам шариата" },
  { id: 2, name: "Такафул Здоровье", type: "health", provider: "IslamInsure", monthly_contribution: 150000, coverage_amount: 30000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 60, description: "Медицинское страхование халяль" },
  { id: 3, name: "Такафул Имущество", type: "property", provider: "ТакафулБанк", monthly_contribution: 300000, coverage_amount: 100000000, currency: "UZS", shariah_compliant: true, surplus_sharing: 65, description: "Страхование недвижимости" },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  general: { label: "Общий", icon: "🛡️" },
  family: { label: "Семейный", icon: "👨‍👩‍👧" },
  health: { label: "Здоровье", icon: "🏥" },
  property: { label: "Имущество", icon: "🏠" },
};

export default function TakafulPage() {
  const [filter, setFilter] = useState<string>("all");
  const [plans, setPlans] = useState<TakafulPlan[]>(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
  // Calculator state
  const [calcAmount, setCalcAmount] = useState("");
  const [calcType, setCalcType] = useState("general");
  const [calcMonths, setCalcMonths] = useState("12");
  const [calcResult, setCalcResult] = useState<{ monthly_contribution: number; total_contribution: number; surplus_sharing_pct: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    islamicApi.getTakafulPlans(filter !== "all" ? filter : undefined)
      .then(data => {
        const mapped = data.map((p: ApiTakaful) => ({
          id: p.id, name: p.name, type: p.takaful_type as TakafulPlan["type"],
          provider: p.provider, monthly_contribution: p.monthly_contribution,
          coverage_amount: p.coverage_amount, currency: p.currency,
          shariah_compliant: p.shariah_status === "compliant",
          surplus_sharing: 65, description: p.description || "",
        }));
        if (mapped.length > 0) setPlans(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = filter === "all" ? plans : plans.filter(p => p.type === filter);
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const handleCalc = () => {
    const amount = parseFloat(calcAmount);
    if (!amount || amount <= 0) return;
    setCalcLoading(true);
    islamicApi.calculateTakaful({ coverage_amount: amount, takaful_type: calcType, term_months: parseInt(calcMonths) })
      .then(res => setCalcResult({ monthly_contribution: res.monthly_contribution, total_contribution: res.total_contribution, surplus_sharing_pct: res.surplus_sharing_pct }))
      .catch(() => {
        const months = parseInt(calcMonths);
        const rates: Record<string, number> = { general: 0.003, family: 0.004, health: 0.005, property: 0.006 };
        const rate = rates[calcType] || 0.004;
        const monthly = Math.round(amount * rate);
        setCalcResult({ monthly_contribution: monthly, total_contribution: monthly * months, surplus_sharing_pct: 65 });
      })
      .finally(() => setCalcLoading(false));
  };

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ color: C.primary }}>🛡️ Такафул (Исламское страхование)</h2>
        <p style={{ color: C.muted }}>Планы взаимного страхования, основанные на принципах табарру и таавун</p>

        {/* Calculator Section */}
        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 20, marginBottom: 24, border: "1px solid #bbf7d0" }}>
          <h3 style={{ margin: "0 0 12px", color: C.primary }}>🧮 Калькулятор такафул-взноса</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block" }}>Сумма покрытия (UZS)</label>
              <input value={calcAmount} onChange={e => setCalcAmount(e.target.value)} type="number" placeholder="50000000" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", width: 180 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block" }}>Тип</label>
              <select value={calcType} onChange={e => setCalcType(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db" }}>
                {Object.entries(typeLabels).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block" }}>Срок (мес)</label>
              <input value={calcMonths} onChange={e => setCalcMonths(e.target.value)} type="number" min="1" max="360" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", width: 80 }} />
            </div>
            <button onClick={handleCalc} disabled={calcLoading} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              {calcLoading ? "..." : "Рассчитать"}
            </button>
          </div>
          {calcResult && (
            <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 12, flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted }}>Ежемесячный взнос</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{fmt(calcResult.monthly_contribution)} UZS</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: 12, flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted }}>Общая сумма взносов</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{fmt(calcResult.total_contribution)} UZS</div>
              </div>
              <div style={{ background: "#fff", borderRadius: 8, padding: 12, flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted }}>Распределение излишков</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{calcResult.surplus_sharing_pct}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["all", "general", "family", "health", "property"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer", background: filter === t ? C.primary : "#f3f4f6", color: filter === t ? "#fff" : C.text }}>
              {t === "all" ? "Все" : `${typeLabels[t].icon} ${typeLabels[t].label}`}
            </button>
          ))}
        </div>

        {/* Plan Cards */}
        {filtered.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 4px" }}>{typeLabels[p.type]?.icon} {p.name}</h3>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: C.muted }}>{p.provider} • {typeLabels[p.type]?.label}</p>
            {p.shariah_compliant && (<span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>✅ Халяль</span>)}
            <p style={{ margin: "8px 0", fontSize: 14 }}>{p.description}</p>
            <div style={{ display: "flex", gap: 24 }}>
              <div><div style={{ fontSize: 11, color: C.muted }}>Взнос/мес</div><div style={{ fontWeight: 600 }}>{fmt(p.monthly_contribution)} {p.currency}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Покрытие</div><div style={{ fontWeight: 600 }}>{fmt(p.coverage_amount)} {p.currency}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Распред. излишков</div><div style={{ fontWeight: 600 }}>{p.surplus_sharing}%</div></div>
            </div>
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
