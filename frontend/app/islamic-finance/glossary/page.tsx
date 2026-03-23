"use client";
import { useEffect, useState } from "react";
import { islamicApi, GlossaryTerm } from "@/components/islamic/api";
import GlossaryTermCard from "@/components/islamic/GlossaryTermCard";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const CATEGORIES = [
  { key: "", label: "Все" },
  { key: "contract", label: "Контракты" },
  { key: "prohibition", label: "Запреты" },
  { key: "instrument", label: "Инструменты" },
  { key: "regulatory", label: "Регуляторика" },
  { key: "concept", label: "Концепции" },
];

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    islamicApi.getGlossary(category || undefined, search || undefined)
      .then(setTerms)
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <IslamicFinanceLayout
      title="Глоссарий"
      titleIcon="📖"
      subtitle="Термины исламских финансов на русском и арабском"
      tipText="Используйте поиск и фильтры по категориям для быстрого нахождения нужного термина"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Поиск термина..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: "10px 16px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 14, boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${category === c.key ? C.primary : C.border}`,
                  background: category === c.key ? C.primary : C.card,
                  color: category === c.key ? "#fff" : C.muted,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 12, background: C.border, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {terms.map(t => <GlossaryTermCard key={t.id} term={t} />)}
            {terms.length === 0 && (
              <p style={{ color: C.muted, fontSize: 14 }}>Термины не найдены</p>
            )}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
