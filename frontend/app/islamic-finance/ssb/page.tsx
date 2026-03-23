"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface SSBMember {
  id: number;
  name: string;
  nameAr: string;
  role: string;
  specialization: string;
  experience: string;
}

interface Fatwa {
  id: number;
  number: string;
  title: string;
  date: string;
  category: string;
  status: "active" | "revised" | "superseded";
  summary: string;
  issuedBy: string;
}

const SSB_MEMBERS: SSBMember[] = [
  { id: 1, name: "Шейх Абдуллах аль-Мани", nameAr: "الشيخ عبدالله المانع", role: "Председатель SSB", specialization: "Фикх аль-муамалят", experience: "25+ лет" },
  { id: 2, name: "Д-р Мухаммад аль-Хаким", nameAr: "د. محمد الحكيم", role: "Член SSB", specialization: "Исламские финансы", experience: "18 лет" },
  { id: 3, name: "Д-р Айша аль-Рашид", nameAr: "د. عائشة الراشد", role: "Член SSB", specialization: "Шариатский аудит", experience: "15 лет" },
  { id: 4, name: "Шейх Усман аль-Фаруки", nameAr: "الشيخ عثمان الفاروقي", role: "Консультант", specialization: "Сукук и такафул", experience: "20 лет" },
];

const FATWAS: Fatwa[] = [
  { id: 1, number: "FTW-2024-001", title: "О допустимости мурабаха с отложенным платежом", date: "2024-03-15", category: "Продукты", status: "active", summary: "Мурабаха с отложенным платежом допустима при соблюдении условий AAOIFI SS 8.", issuedBy: "Шейх Абдуллах аль-Мани" },
  { id: 2, number: "FTW-2024-002", title: "Пороговые значения для скрининга акций", date: "2024-05-20", category: "Скрининг", status: "active", summary: "Утверждены пороги: харам-выручка < 5%, долг/активы < 33%, процентный доход < 5%.", issuedBy: "Д-р Мухаммад аль-Хаким" },
  { id: 3, number: "FTW-2024-003", title: "Очистка дохода от сомнительных источников", date: "2024-07-10", category: "Очистка", status: "active", summary: "Обязательная очистка дохода через садака при наличии харам-компонента в доходе.", issuedBy: "Д-р Айша аль-Рашид" },
  { id: 4, number: "FTW-2023-010", title: "Расчёт нисаба для закята в UZS", date: "2023-12-01", category: "Закят", status: "revised", summary: "Нисаб рассчитывается по 85г золота по текущему курсу ЦБ РУз.", issuedBy: "Шейх Усман аль-Фаруки" },
  { id: 5, number: "FTW-2024-004", title: "Сукук аль-иджара для недвижимости", date: "2024-09-05", category: "Продукты", status: "active", summary: "Сукук аль-иджара одобрен для финансирования недвижимости по AAOIFI SS 17.", issuedBy: "Шейх Абдуллах аль-Мани" },
];

const FATWA_CATEGORIES = ["Все", "Продукты", "Скрининг", "Очистка", "Закят"];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: C.successBg, text: C.success, label: "Действует" },
  revised: { bg: C.warningBg, text: C.warning, label: "Пересмотрена" },
  superseded: { bg: C.errorBg, text: C.error, label: "Заменена" },
};

export default function SsbPage() {
  const [tab, setTab] = useState<"members" | "fatwas">("members");
  const [category, setCategory] = useState("Все");
  const [expandedFatwa, setExpandedFatwa] = useState<number | null>(null);

  const filteredFatwas = category === "Все" ? FATWAS : FATWAS.filter(f => f.category === category);

  return (
    <IslamicFinanceLayout
      title="SSB / Фатвы"
      titleIcon="📚"
      subtitle="Шариатский наблюдательный совет (Shariah Supervisory Board) и реестр фатв по исламским финансам"
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["members", "fatwas"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${tab === t ? C.primary : C.border}`,
              background: tab === t ? C.primary : C.card, color: tab === t ? "#fff" : C.text,
              fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {t === "members" ? "👥 Члены SSB" : "📜 Фатвы"}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {SSB_MEMBERS.map(m => (
            <div key={m.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 2 }}>{m.name}</h3>
                  <p style={{ fontSize: 14, color: C.muted, direction: "rtl" }}>{m.nameAr}</p>
                </div>
                <span style={{ padding: "4px 10px", borderRadius: 6, background: C.infoBg, color: C.primary, fontSize: 12, fontWeight: 500 }}>{m.role}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.muted }}>
                <span>🎓 {m.specialization}</span>
                <span>📅 {m.experience}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Category Filter */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FATWA_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${category === c ? C.primary : C.border}`,
                  background: category === c ? C.primary : C.card, color: category === c ? "#fff" : C.text,
                  fontSize: 13, cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>

          {/* Fatwa List */}
          {filteredFatwas.map(f => {
            const s = statusColors[f.status];
            return (
              <div key={f.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, cursor: "pointer" }}
                onClick={() => setExpandedFatwa(expandedFatwa === f.id ? null : f.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{f.number}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.text, fontSize: 11, fontWeight: 500 }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted }}>{f.date}</span>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{f.title}</h4>
                <p style={{ fontSize: 12, color: C.muted }}>Категория: {f.category} | Выдана: {f.issuedBy}</p>
                {expandedFatwa === f.id && (
                  <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 8, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                    {f.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
