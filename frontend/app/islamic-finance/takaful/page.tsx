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
  family: { label: "Семейный", icon: "👨\u200d👩\u200d👧" },
  health: { label: "Здоровье", icon: "🏥" },
  property: { label: "Имущество", icon: "🏠" },
};

export default function TakafulPage() {
  const [filter, setFilter] = useState<string>("all");
  const [plans, setPlans] = useState<TakafulPlan[]>(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
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

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          🛡️ Такафул (Исламское страхование)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          Планы взаимного страхования, основанные на принципах табарру (пожертвование) и таавун (взаимопомощь)
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["all", "general", "family", "health", "property"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer",
              background: filter === t ? C.primary : "#f3f4f6", color: filter === t ? "#fff" : C.text,
            }}>
              {t === "all" ? "Все" : `${typeLabels[t].icon} ${typeLabels[t].label}`}
            </button>
          ))}
        </div>

        {filtered.map(p => (
          <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  {typeLabels[p.type]?.icon} {p.name}
                </h3>
                <p style={{ fontSize: 13, color: C.muted }}>{p.provider} \u2022 {typeLabels[p.type]?.label}</p>
              </div>
              {p.shariah_compliant && (
                <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#166534" }}>
                  ✅ Халяль
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>{p.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
              <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Взнос/мес</div><div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(p.monthly_contribution)} {p.currency}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Покрытие</div><div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(p.coverage_amount)} {p.currency}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Распред. излишков</div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.surplus_sharing}%</div></div>
            </div>
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
