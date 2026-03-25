"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface IslamicIndex {
  id: number;
  name: string;
  ticker: string;
  provider: string;
  region: string;
  value: number;
  change_pct: number;
  ytd_return: number;
  description: string;
  methodology: string;
}

const INDICES: IslamicIndex[] = [
  { id: 1, name: "Dow Jones Islamic Market World", ticker: "DJIM", provider: "S&P Dow Jones", region: "Глобальный", value: 6842.5, change_pct: 0.34, ytd_return: 8.2, description: "Глобальный исламский индекс акций", methodology: "AAOIFI совместимый" },
  { id: 2, name: "MSCI Islamic Index", ticker: "MSCIIS", provider: "MSCI", region: "Глобальный", value: 3241.8, change_pct: -0.12, ytd_return: 6.7, description: "Индекс халяльных акций по методологии MSCI", methodology: "IFSB совместимый" },
  { id: 3, name: "FTSE Shariah Global Equity", ticker: "FTSESH", provider: "FTSE Russell", region: "Глобальный", value: 9134.2, change_pct: 0.55, ytd_return: 10.1, description: "Индекс акций, соответствующих нормам шариата", methodology: "Yasaar Ltd сертифицирован" },
  { id: 4, name: "S&P 500 Shariah", ticker: "SPSHX", provider: "S&P", region: "США", value: 5621.3, change_pct: 0.78, ytd_return: 12.4, description: "Шариат-совместимые компании из S&P 500", methodology: "AAOIFI стандарт" },
  { id: 5, name: "Borsa Istanbul Participation 30", ticker: "BIST30P", provider: "Borsa Istanbul", region: "Турция", value: 4523.7, change_pct: 1.24, ytd_return: 18.3, description: "Крупнейшие турецкие компании без риба", methodology: "Диван Шариат сертификация" },
];

export default function IslamicIndicesPage() {
  const [selected, setSelected] = useState<IslamicIndex | null>(null);
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const sign = (n: number) => n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
  const clr = (n: number) => n >= 0 ? "#16a34a" : "#dc2626";

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ color: C.primary }}>📈 Исламские фондовые индексы</h2>
        <p style={{ color: C.muted }}>Фондовые индексы, соответствующие нормам шариата и стандартам AAOIFI/IFSB</p>

                {/* Index Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {INDICES.map(idx => (
            <div key={idx.id} onClick={() => setSelected(selected?.id === idx.id ? null : idx)} style={{ background: selected?.id === idx.id ? "#eff6ff" : "#fff", borderRadius: 12, padding: 16, border: `1px solid ${selected?.id === idx.id ? C.primary : "#e5e7eb"}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{idx.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{idx.ticker} • {idx.provider}</div>
                </div>
                <span style={{ background: "#dcfce7", color: "#166534", fontSize: 11, padding: "2px 8px", borderRadius: 8 }}>✓ Халяль</span>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>Значение</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(idx.value)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.muted }}>Изменение</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: clr(idx.change_pct) }}>{sign(idx.change_pct)}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.muted }}>YTD</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: clr(idx.ytd_return) }}>{sign(idx.ytd_return)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>

                {/* Detail Panel */}
        {selected && (
          <div style={{ background: "#eff6ff", borderRadius: 12, padding: 20, border: `1px solid ${C.primary}` }}>
            <h3 style={{ margin: "0 0 8px", color: C.primary }}>{selected.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: C.text }}>{selected.description}</p>
            <div style={{ display: "flex", gap: 24 }}>
              <div><div style={{ fontSize: 11, color: C.muted }}>Провайдер</div><div style={{ fontWeight: 600 }}>{selected.provider}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Регион</div><div style={{ fontWeight: 600 }}>{selected.region}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Методология</div><div style={{ fontWeight: 600 }}>{selected.methodology}</div></div>
            </div>
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
