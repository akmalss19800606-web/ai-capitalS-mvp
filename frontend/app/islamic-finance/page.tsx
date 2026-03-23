"use client";
import IslamicFinanceLayout from "@/components/islamic/IslamicFinanceLayout";
import { C } from "@/components/islamic/IslamicFinanceLayout";

const STATS = [
  { icon: "☪️", label: "Стандарты и нормативы", value: "15", sub: "AAOIFI + IFSB" },
  { icon: "📋", label: "Рыночные скрининги", value: "30+", sub: "Глобальные и локальные индексы" },
  { icon: "🔍", label: "Стандарт скрининга", value: "SS No.62", sub: "AAOIFI" },
  { icon: "💰", label: "Закят и налоги", value: "Нисаб подсчёт", sub: "UZS/USD" },
  { icon: "🌍", label: "Курс валюты", value: "UZ", sub: "Узбекистан сум/доллар" },
];

const TOOLS = [
  { icon: "💰", title: "Закят-калькулятор", desc: "Расчёт обязательных выплат на основе нисаб и активов", href: "/islamic-finance/zakat" },
  { icon: "🔍", title: "Скрининг компаний", desc: "Проверка соответствия шариату по AAOIFI SS No. 62", href: "/islamic-finance/screening" },
  { icon: "📖", title: "Глоссарий и справочник", desc: "30+ терминов исламских финансов с арабской транслитерацией", href: "/islamic-finance/glossary" },
  { icon: "📜", title: "Стандарты и нормативы", desc: "AAOIFI и IFSB — 15 основных стандартов и нормативных документов исламских финансов", href: "/islamic-finance/references" },
];

export default function IslamicFinancePage() {
  const indicators = STATS.map(s => ({ icon: s.icon, label: s.label, value: s.value }));

  return (
    <IslamicFinanceLayout
      title="Исламские финансы — Рынок Узбекистана"
      titleIcon="☪️"
      subtitle="Исламские финансовые инструменты для рынка Узбекистана — инвестиции, скрининг, закят и очистка по стандартам AAOIFI и IFSB. Нисаб, курс золота, конвертация в сум/доллар (UZS)"
      indicators={indicators}
    >
      {/* Tools Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {TOOLS.map((tool) => (
          <a
            key={tool.title}
            href={tool.href}
            style={{
              display: "block", padding: 20, background: C.card, borderRadius: 12,
              border: `1px solid ${C.border}`, textDecoration: "none",
              transition: "all 0.2s", cursor: "pointer",
            }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.1)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>{tool.icon}</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>{tool.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{tool.desc}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
