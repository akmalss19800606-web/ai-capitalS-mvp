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
  { id: 3, name: "Вакф Клиника", type: "healthcare", location: "Наманган", target_amount: 1200000000, raised_amount: 450000000, currency: "UZS", status: "active", beneficiaries: 3000, description: "Бесплатная клиника" },
];

const typeLabels: Record<string, { label: string; icon: string }> = {
  educational: { label: "Образование", icon: "🎓" },
  healthcare: { label: "Здравоохранение", icon: "🏥" },
  mosque: { label: "Мечеть", icon: "🕌" },
  social: { label: "Социальный", icon: "🤝" },
  infrastructure: { label: "Инфраструктура", icon: "🏗️" },
};

interface WaqfStats {
  total_projects: number;
  total_target: number;
  total_raised: number;
  active_projects: number;
  completed_projects: number;
  total_beneficiaries: number;
}

export default function WaqfPage() {
  const [filter, setFilter] = useState<string>("all");
  const [projects, setProjects] = useState<WaqfProject[]>(MOCK_WAQF);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WaqfStats | null>(null);

  useEffect(() => {
    islamicApi.getWaqfProjects(filter !== "all" ? filter : undefined)
      .then(data => {
        const mapped = data.map((p: ApiWaqf) => ({
          id: p.id, name: p.title, type: p.waqf_type as WaqfProject["type"],
          location: p.beneficiaries || "", target_amount: p.target_amount,
          raised_amount: p.raised_amount, currency: p.currency,
          status: p.status as WaqfProject["status"],
          beneficiaries: 0, description: p.description || "",
        }));
        if (mapped.length > 0) setProjects(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    islamicApi.getWaqfStats()
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const filtered = filter === "all" ? projects : projects.filter(p => p.type === filter);
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ color: C.primary }}>🕌 Вакф (Исламский эндаумент)</h2>
        <p style={{ color: C.muted }}>Благотворительные проекты вакфа для устойчивого развития общества</p>

                {/* Stats Section */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{stats.total_projects}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Всего проектов</div>
            </div>
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{fmt(stats.total_raised)} UZS</div>
              <div style={{ fontSize: 12, color: C.muted }}>Собрано средств</div>
            </div>
            <div style={{ background: "#fefce8", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#ca8a04" }}>{fmt(stats.total_beneficiaries)}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Благополучателей</div>
            </div>
          </div>
        )}

                {/* Filter Buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["all", "educational", "healthcare", "mosque", "social", "infrastructure"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer", background: filter === t ? C.primary : "#f3f4f6", color: filter === t ? "#fff" : C.text }}>
              {t === "all" ? "Все" : `${typeLabels[t].icon} ${typeLabels[t].label}`}
            </button>
          ))}
        </div>

                {/* Project Cards */}
        {filtered.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 4px" }}>{typeLabels[p.type]?.icon} {p.name}</h3>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: C.muted }}>{p.location} • {typeLabels[p.type]?.label}</p>
            {p.status === "completed" && (<span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>✅ Завершён</span>)}
            {p.status === "active" && (<span style={{ background: "#dbeafe", color: "#1e40af", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>🟢 Активный</span>)}
            <p style={{ margin: "8px 0", fontSize: 14 }}>{p.description}</p>
                        <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                <span>Собрано: {fmt(p.raised_amount)} {p.currency}</span>
                <span>Цель: {fmt(p.target_amount)} {p.currency}</span>
              </div>
              <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4 }}>
                <div style={{ height: 8, background: C.primary, borderRadius: 4, width: `${pct(p.raised_amount, p.target_amount)}%` }} />
              </div>
              <div style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>{pct(p.raised_amount, p.target_amount)}% собрано</div>
            </div>
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
