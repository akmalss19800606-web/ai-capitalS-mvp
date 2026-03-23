"use client";
import { useEffect, useState, useMemo } from "react";
import { islamicApi, GlossaryTerm } from "@/components/islamic/api";
import GlossaryTermCard from "@/components/islamic/GlossaryTermCard";
import GlossarySearchFilter from "@/components/islamic/GlossarySearchFilter";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    islamicApi.getGlossary(category || undefined, search || undefined)
      .then(setTerms)
      .finally(() => setLoading(false));
  }, [category, search]);

  // Group terms by first letter
  const grouped = useMemo(() => {
    const map: Record<string, GlossaryTerm[]> = {};
    const sorted = [...terms].sort((a, b) => a.term_ru.localeCompare(b.term_ru, "ru"));
    for (const t of sorted) {
      const letter = t.term_ru.charAt(0).toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    }
    return map;
  }, [terms]);

  const letters = useMemo(() => Object.keys(grouped).sort((a, b) => a.localeCompare(b, "ru")), [grouped]);

  const displayLetters = activeLetter ? [activeLetter] : letters;

  return (
    <IslamicFinanceLayout
      title="Глоссарий"
      titleIcon="📖"
      subtitle="Термины исламских финансов на русском и арабском"
      tipText="Ищите термины по названию или транслитерации. Фильтруйте по категориям или выберите букву для быстрого перехода."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <GlossarySearchFilter
          search={search}
          category={category}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          totalCount={terms.length}
        />

        {/* Alphabet nav */}
        {!loading && letters.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveLetter(null)}
              style={{
                padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${!activeLetter ? C.primary : C.border}`,
                background: !activeLetter ? C.primary : C.card,
                color: !activeLetter ? "#fff" : C.text,
                cursor: "pointer",
              }}
            >
              Все
            </button>
            {letters.map(l => (
              <button
                key={l}
                onClick={() => setActiveLetter(activeLetter === l ? null : l)}
                style={{
                  padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${activeLetter === l ? C.primary : C.border}`,
                  background: activeLetter === l ? C.primary : C.card,
                  color: activeLetter === l ? "#fff" : C.text,
                  cursor: "pointer", minWidth: 28, textAlign: "center",
                }}
              >
                {l} <span style={{ fontSize: 9, color: activeLetter === l ? "#ffffffaa" : C.muted }}>({grouped[l].length})</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ height: 120, background: "#f3f4f6", borderRadius: 16 }} />
            ))}
          </div>
        ) : terms.length === 0 ? (
          <p style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>
            Термины не найдены
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {displayLetters.map(letter => (
              <div key={letter}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                  borderBottom: `2px solid ${C.primary}20`, paddingBottom: 6,
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>{letter}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{grouped[letter].length} термин(ов)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {grouped[letter].map((term) => (
                    <GlossaryTermCard key={term.id} term={term} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
