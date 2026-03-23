"use client";
import { useEffect, useState } from "react";
import { islamicApi, GlossaryTerm } from "@/components/islamic/api";
import GlossaryTermCard from "@/components/islamic/GlossaryTermCard";
import GlossarySearchFilter from "@/components/islamic/GlossarySearchFilter";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

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
      tipText="Ищите термины по названию или транслитерации. Фильтруйте по категориям: контракты, запреты, инструменты."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <GlossarySearchFilter
          search={search}
          category={category}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          totalCount={terms.length}
        />

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {terms.map((term) => (
              <GlossaryTermCard key={term.id} term={term} />
            ))}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
