"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const MODULES = [
  {
    id: 1, title: "AAOIFI Стандарты", icon: "📘", level: "Начальный",
    topics: [
      { name: "FAS 1 — Отчётность (Общее раскрытие)", done: true },
      { name: "FAS 4 — Мушарака", done: true },
      { name: "FAS 7 — Сальм и Параллельный сальм", done: false },
      { name: "FAS 28 — Мурабаха", done: false },
    ]
  },
  {
    id: 2, title: "IFSB Стандарты", icon: "🏛️", level: "Средний",
    topics: [
      { name: "IFSB-1 — Управление рисками", done: false },
      { name: "IFSB-2 — Капитальная достаточность", done: false },
      { name: "IFSB-11 — Банковский надзор", done: false },
    ]
  },
  {
    id: 3, title: "Исламские инструменты", icon: "💼", level: "Практический",
    topics: [
      { name: "Мурабаха — торговая наценка", done: true },
      { name: "Мушарака — партнёрство", done: true },
      { name: "Ижара — лизинг", done: false },
      { name: "Сукук — исламские облигации", done: false },
    ]
  },
  {
    id: 4, title: "Такафул и вакф", icon: "🤝", level: "Продвинутый",
    topics: [
      { name: "Модель такафул-вакала", done: false },
      { name: "Вакф наличными средствами", done: false },
    ]
  },
];

export default function EducationPage() {
  const [activeModule, setActiveModule] = useState<number | null>(null);
  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ color: C.primary }}>🎓 Образование по Исламским финансам</h2>
        <p style={{ color: C.muted }}>Освойте стандарты AAOIFI, IFSB и основные инструменты исламского финансирования</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {MODULES.map(mod => {
            const doneCount = mod.topics.filter(t => t.done).length;
            const pct = Math.round((doneCount / mod.topics.length) * 100);
            const isOpen = activeModule === mod.id;
            return (
              <div key={mod.id} style={{ background: "#fff", borderRadius: 12, padding: 20, border: `1px solid ${isOpen ? C.primary : "#e5e7eb"}`, cursor: "pointer" }} onClick={() => setActiveModule(isOpen ? null : mod.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 28 }}>{mod.icon}</div>
                  <span style={{ background: "#eff6ff", color: C.primary, fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>{mod.level}</span>
                </div>
                <h3 style={{ margin: "8px 0 4px", fontSize: 15 }}>{mod.title}</h3>
                <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, margin: "8px 0 4px" }}>
                  <div style={{ height: 6, background: C.primary, borderRadius: 3, width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{doneCount}/{mod.topics.length} тем изучено • {pct}%</div>
                {isOpen && (
                  <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
                    {mod.topics.map((t, i) => (
                      <li key={i} style={{ fontSize: 13, padding: "4px 0", color: t.done ? "#16a34a" : C.text }}>
                        {t.done ? "✅" : "○"} {t.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
