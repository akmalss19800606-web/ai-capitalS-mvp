"use client";
import { useState } from "react";
import { islamicApi, ZakatResult } from "./api";
import ZakatResultCard from "./ZakatResultCard";
import { C } from "./IslamicFinanceLayout";

const ASSET_CATEGORIES = [
  { key: "cash",        label: "💵 Наличные и банковские счета" },
  { key: "gold",        label: "🥇 Золото и ювелирные изделия" },
  { key: "silver",      label: "⚪ Серебро" },
  { key: "investments", label: "📈 Инвестиции и акции" },
  { key: "trade_goods", label: "📦 Торговые товары" },
  { key: "receivables", label: "📋 Дебиторская задолженность" },
];

const ZAKAT_TYPES = [
  { key: "wealth",     label: "Закят с имущества" },
  { key: "trade",      label: "Закят с торговли" },
  { key: "investment", label: "Закят с инвестиций" },
  { key: "savings",    label: "Закят со сбережений" },
];

export default function ZakatCalculatorForm() {
  const [zakatType, setZakatType] = useState("wealth");
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [liabilities, setLiabilities] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ZakatResult | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setResult(null);
    const assetList = ASSET_CATEGORIES
      .filter(c => assets[c.key] && Number(assets[c.key]) > 0)
      .map(c => ({ category: c.key, amount_uzs: Number(assets[c.key]) }));
    if (assetList.length === 0) {
      setError("Введите хотя бы одну категорию активов");
      setLoading(false); return;
    }
    try {
      const res = await islamicApi.calculateZakat({
        zakat_type: zakatType, assets: assetList,
        liabilities_uzs: Number(liabilities) || 0,
        mode: localStorage.getItem("islamic_mode") || "individual",
      });
      setResult(res);
    } catch {
      setError("Ошибка расчёта. Проверьте авторизацию.");
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Тип закята */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 8 }}>Тип закята</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ZAKAT_TYPES.map(t => (
              <button
                key={t.key} type="button"
                onClick={() => setZakatType(t.key)}
                style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${zakatType === t.key ? C.primary : C.border}`,
                  background: zakatType === t.key ? C.infoBg : C.card,
                  color: zakatType === t.key ? C.primary : C.muted,
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Активы */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 8 }}>Активы (в UZS)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ASSET_CATEGORIES.map(c => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 200, fontSize: 13, color: C.muted, flexShrink: 0 }}>{c.label}</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={assets[c.key] || ""}
                  onChange={e => setAssets(prev => ({ ...prev, [c.key]: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Обязательства */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 8 }}>Обязательства (долги, в UZS)</label>
          <input
            type="number" min="0" placeholder="0"
            value={liabilities}
            onChange={e => setLiabilities(e.target.value)}
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: C.error, background: C.errorBg, padding: "8px 12px", borderRadius: 8 }}>{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8,
            background: loading ? C.muted : C.primary, color: "#fff",
            border: "none", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Рассчитываю..." : "Рассчитать закят"}
        </button>
      </form>

      {result && <ZakatResultCard result={result} />}
    </div>
  );
}
