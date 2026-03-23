"use client";
import { useRef } from "react";

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
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск термина на русском или транслитерацией..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 pl-9 pr-10 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
        />
        {search && (
          <button
            onClick={() => { onSearchChange(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
          >×</button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => onCategoryChange(c.key)}
            className={
              "px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors " +
              (category === c.key
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700")
            }
          >{c.label}</button>
        ))}
        {totalCount !== undefined && (
          <span className="ml-auto text-xs text-gray-400">
            {totalCount} {totalCount === 1 ? "термин" : totalCount < 5 ? "термина" : "терминов"}
          </span>
        )}
      </div>
    </div>
  );
}