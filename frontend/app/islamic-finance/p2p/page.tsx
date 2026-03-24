"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, P2PProject as ApiP2P } from "@/components/islamic/api";

type ProjectType = "mudaraba" | "musharaka";
type ProjectStatus = "active" | "funded" | "closed";

interface P2PProject {
  id: number;
  title: string;
  type: ProjectType;
  sector: string;
  targetAmount: number;
  raisedAmount: number;
  investors: number;
  minInvestment: number;
  expectedReturn: string;
  duration: string;
  status: ProjectStatus;
  description: string;
  shariahApproved: boolean;
}

const PROJECTS: P2PProject[] = [
  { id: 1, title: "Расширение пекарни в Ташкенте", type: "mudaraba", sector: "Общепит", targetAmount: 150000000, raisedAmount: 112500000, investors: 34, minInvestment: 1000000, expectedReturn: "18-22%", duration: "12 мес.", status: "active", description: "Расширение сети пекарень в Ташкенте и Мирабаде по модели Мудараба. Доход делится 70/30.", shariahApproved: true },
  { id: 2, title: "Солнечная электростанция Фергана", type: "musharaka", sector: "Энергетика", targetAmount: 500000000, raisedAmount: 500000000, investors: 89, minInvestment: 2000000, expectedReturn: "14-17%", duration: "36 мес.", status: "funded", description: "Строительство солнечной электростанции на основе Мушарака. Совместное владение.", shariahApproved: true },
  { id: 3, title: "Органическая ферма «Навруз»", type: "mudaraba", sector: "Сельхозяйство", targetAmount: 80000000, raisedAmount: 24000000, investors: 12, minInvestment: 500000, expectedReturn: "20-25%", duration: "18 мес.", status: "active", description: "Развитие органического хозяйства по модели Мудараба. Инвестор — рабб аль-мал, ферма — мудариб.", shariahApproved: true },
  { id: 4, title: "ИТ-платформа для малого бизнеса", type: "musharaka", sector: "Технологии", targetAmount: 200000000, raisedAmount: 200000000, investors: 55, minInvestment: 1500000, expectedReturn: "25-30%", duration: "24 мес.", status: "closed", description: "Разработка ИТ-платформы по модели Мушарака (совместное предприятие).", shariahApproved: true },
];

const TYPE_LABELS: Record<ProjectType, string> = {
  mudaraba: "Мудараба",
  musharaka: "Мушарака",
};

const STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  active: { bg: C.successBg, text: C.success, label: "Активный" },
  funded: { bg: C.infoBg, text: C.primary, label: "Собрано" },
  closed: { bg: C.warningBg, text: C.warning, label: "Завершён" },
};

function formatUZS(n: number) {
  return (n / 1000000).toFixed(1) + " млн сум";
}

export default function P2PPage() {
  const [filter, setFilter] = useState<"all" | ProjectType | ProjectStatus>("all");
  const [selected, setSelected] = useState<P2PProject | null>(null);
    const [projects, setProjects] = useState<P2PProject[]>(PROJECTS);
  useEffect(() => {
    islamicApi.getP2PProjects(filter !== "all" ? filter : undefined)
      .then(data => { if (data.length > 0) setProjects(data.map((p: ApiP2P) => ({ id: p.id, title: p.title, type: p.type as ProjectType, sector: "", targetAmount: p.target_amount, raisedAmount: p.raised_amount, investors: 0, minInvestment: 0, expectedReturn: p.expected_return_pct + "%", duration: p.duration_months + " мес.", status: p.status as ProjectStatus, description: p.description, shariahApproved: p.shariah_status === "compliant" }))); })
      .catch(() => {});
  }, [filter]);

    const filtered = filter === "all" ? projects
    : projects.filter(p => p.type === filter || p.status === filter);

  return (
    <IslamicFinanceLayout
      title="P2P Исламские проекты"
      titleIcon="🤝"
      subtitle="Исламское P2P-финансирование по моделям Мудараба и Мушарака — без риба, с одобрением SSB"
    >
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Всего проектов", value: PROJECTS.length, icon: "📂" },
          { label: "Активных", value: PROJECTS.filter(p => p.status === "active").length, icon: "🟢" },
          { label: "Инвесторов", value: PROJECTS.reduce((s, p) => s + p.investors, 0), icon: "👥" },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {(["all", "mudaraba", "musharaka", "active", "funded", "closed"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer",
              border: `1px solid ${filter === f ? C.primary : C.border}`,
              background: filter === f ? C.primary : C.card,
              color: filter === f ? "#fff" : C.text }}>
            {f === "all" ? "Все" : f === "mudaraba" ? "Мудараба" : f === "musharaka" ? "Мушарака" : f === "active" ? "Активные" : f === "funded" ? "Собрано" : "Завершённые"}
          </button>
        ))}
      </div>

      {/* Project Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map(p => {
          const ss = STATUS_STYLES[p.status];
          const pct = Math.round((p.raisedAmount / p.targetAmount) * 100);
          return (
            <div key={p.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, cursor: "pointer" }}
              onClick={() => setSelected(selected?.id === p.id ? null : p)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>{p.title}</h3>
                    {p.shariahApproved && <span style={{ fontSize: 11, background: C.successBg, color: C.success, padding: "2px 6px", borderRadius: 4 }}>✅ SSB</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, background: C.infoBg, color: C.primary, padding: "2px 8px", borderRadius: 4 }}>{TYPE_LABELS[p.type]}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{p.sector}</span>
                  </div>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 6, background: ss.bg, color: ss.text, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>{ss.label}</span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <span>{formatUZS(p.raisedAmount)} из {formatUZS(p.targetAmount)}</span>
                  <span style={{ fontWeight: 600, color: C.primary }}>{pct}%</span>
                </div>
                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? C.success : C.primary, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "Доходность", value: p.expectedReturn },
                  { label: "Срок", value: p.duration },
                  { label: "Мин. вложение", value: formatUZS(p.minInvestment) },
                ].map(d => (
                  <div key={d.label} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.value}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{d.label}</div>
                  </div>
                ))}
              </div>

              {selected?.id === p.id && (
                <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 8, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                  <p style={{ margin: "0 0 8px" }}>{p.description}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted }}>👥 {p.investors} инвесторов</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </IslamicFinanceLayout>
  );
}
