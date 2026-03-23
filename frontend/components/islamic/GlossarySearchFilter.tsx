"use client";
import { useRef } from "react";
import { C } from "./IslamicFinanceLayout";

const CATEGORIES = [
  { key: "", label: "Все" },
  { key: "contract", label: "Контракты" },
  { key: "prohibition", label: "Запреты" },
  { key: "instrument", label: "Инструменты" },
  { key: "regulatory", label: "Регуляторика" },
  { key: "concept", label: "Концепции" },
];

interface Props {
  search: string;
  category: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  totalCount?: number;
}

export default function GlossarySearchFilter({
  search, category, onSearchChange, onCategoryChange, totalCount,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 13 }}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск термина на русском или транслитерацией..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12,
            border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
            background: C.card, outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: `1px solid ${category === cat.key ? C.primary : C.border}`,
              background: category === cat.key ? C.primary : C.card,
              color: category === cat.key ? "#fff" : C.text,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {cat.label}
          </button>
        ))}
        {totalCount !== undefined && (
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>
            {totalCount} терминов
          </span>
        )}
      </div>
    </div>
  );
}
