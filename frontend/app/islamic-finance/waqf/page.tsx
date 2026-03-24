"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, WaqfProject as ApiWaqf } from "@/components/islamic/api";

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
  { id: 1, name: "Вакф Образование", type: "educational", location: "Ташкент", target_amount: 500000000, raised_amount: 320000000, currency: "UZS", status: "active", beneficiaries: 1200, description: "Строительство исламской школы" },
  { id: 2, name: "Вакф Мечеть", type: "mosque", location: "Самарканд", target_amount: 800000000, raised_amount: 800000000, currency: "UZS", status: "completed", beneficiaries: 5000, description: "Реставрация мечети" },
  { id: 3, name: "Вакф Клиника", type: "healthcare", location: "Наманган", target_amount: 1200000000, raised_amount: 450000000, currency: "UZS", status: "active", beneficiaries: 3000, description: "Бесплатная клиника для нуждающихся" },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  educational: { label: "Образование", icon: "🎓" },
  healthcare: { label: "Здравоохранение", icon: "🏥" },
  mosque: { label: "Мечеть", icon: "🕌" },
  social: { label: "Социальный", icon: "🤝" },
  infrastructure: { label: "Инфраструктура", icon: "🏗️" },
};

export default function WaqfPage() {
  const [filter, setFilter] = useState<string>("all");
  const [projects, setProjects] = useState<WaqfProject[]>(MOCK_WAQF);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    islamicApi.getWaqfProjects(filter !== "all" ? filter : undefined)
      .then(data => {
        const mapped = data.map((w: ApiWaqf) => ({
          id: w.id, name: w.title, type: w.waqf_type as WaqfProject["type"],
          location: "", target_amount: w.target_amount, raised_amount: w.raised_amount,
          currency: w.currency, status: w.status as WaqfProject["status"],
          beneficiaries: 0, description: w.description,
        }));
        if (mapped.length > 0) setProjects(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);
  const filtered = filter === "all" ? projects : projects.filter(p => p.type === filter);
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  const statusStyle = (s: string) => ({
    active: { bg: "#dcfce7", color: "#166534", label: "Активный" },
    completed: { bg: "#e0e7ff", color: "#3730a3", label: "Завершен" },
    planned: { bg: "#fef3c7", color: "#92400e", label: "Планируется" },
  }[s] || { bg: "#f3f4f6", color: "#374151", label: s });

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          🕌 Вакф (Благотворительные эндаументы)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          Проекты вакфа — неотчуждаемое пожертвование в пользу общества
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["all", "educational", "healthcare", "mosque", "social", "infrastructure"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer",
              background: filter === t ? C.primary : "#f3f4f6", color: filter === t ? "#fff" : C.text,
            }}>
              {t === "all" ? "Все" : `${typeLabels[t].icon} ${typeLabels[t].label}`}
            </button>
          ))}
        </div>

        {filtered.map(p => {
          const st = statusStyle(p.status);
          const pct = p.target_amount > 0 ? Math.round(p.raised_amount / p.target_amount * 100) : 0;
          return (
            <div key={p.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {typeLabels[p.type]?.icon} {p.name}
                  </h3>
                  <p style={{ fontSize: 13, color: C.muted }}>{p.location} \u2022 {typeLabels[p.type]?.label}</p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <p style={{ fontSize: 13, color: C.text, marginBottom: 12 }}>{p.description}</p>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>Собрано: {fmt(p.raised_amount)} {p.currency}</span>
                  <span>{pct}%</span>
                </div>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4 }}>
                  <div style={{ height: 8, background: C.primary, borderRadius: 4, width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Цель: {fmt(p.target_amount)} {p.currency}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Благополучатели</div><div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(p.beneficiaries)} чел.</div></div>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Прогресс</div><div style={{ fontSize: 14, fontWeight: 600 }}>{pct}%</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </IslamicFinanceLayout>
  );
}
