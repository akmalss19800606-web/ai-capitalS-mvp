"use client";
import { useState, useEffect, useRef } from "react";
import { islamicApi, CompanyItem } from "./api";
import { C } from "./IslamicFinanceLayout";

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
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            placeholder="Поиск по названию или тикеру..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            style={{
              width: "100%", padding: "10px 16px", borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 14, boxSizing: "border-box",
            }}
          />
          {loading && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted }}>⏳</span>
          )}
        </div>
        <select
          value={marketType}
          onChange={e => setMarketType(e.target.value)}
          style={{
            padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
            fontSize: 14, background: C.card,
          }}
        >
          <option value="">Все площадки</option>
          <option value="uzse">UzSE</option>
          <option value="cktsb">ЦКТСБ</option>
          <option value="private">Частные</option>
        </select>
      </div>

      {open && results.length > 0 && (
        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 8, background: C.card,
          maxHeight: 320, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}>
          {results.slice(0, 8).map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setQuery(c.name_ru); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "12px 16px",
                borderBottom: `1px solid ${C.bg}`, background: "transparent",
                border: "none", cursor: "pointer", display: "block",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.infoBg)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 500, color: C.text, fontSize: 14 }}>{c.name_ru}</div>
              {c.name_en && <div style={{ fontSize: 12, color: C.muted }}>{c.name_en}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {c.ticker && (
                  <span style={{ fontSize: 11, fontFamily: "monospace", background: C.infoBg, color: C.primary, padding: "1px 6px", borderRadius: 4 }}>
                    {c.ticker}
                  </span>
                )}
                <span style={{ fontSize: 11, color: C.muted }}>{c.market_type}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
