"use client";
import { useState, useEffect, useRef } from "react";
import { islamicApi, CompanyItem } from "./api";

interface Props {
  onSelect: (company: CompanyItem | null) => void;
}

export default function CompanySearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [marketType, setMarketType] = useState("");
  const [results, setResults] = useState<CompanyItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2 && !marketType) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      islamicApi.getCompanies(query || undefined, marketType || undefined)
        .then(r => { setResults(r); setOpen(true); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, marketType]);

  return (
    <div ref={ref} className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Поиск по названию или тикеру..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">⏳</span>
          )}
        </div>
        <select
          value={marketType}
          onChange={e => setMarketType(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Все площадки</option>
          <option value="uzse">UzSE</option>
          <option value="cktsb">ЦКТСБ</option>
          <option value="private">Частные</option>
        </select>
      </div>

      {open && results.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-10">
          {results.slice(0, 8).map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(c.name_ru); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name_ru}</p>
                  {c.name_en && <p className="text-xs text-gray-400">{c.name_en}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {c.ticker && <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{c.ticker}</span>}
                  <span className="text-xs text-gray-400 uppercase">{c.market_type}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
