"use client";
import { useState } from "react";
import { islamicApi, ZakatResult } from "./api";
import ZakatResultCard from "./ZakatResultCard";

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
    setLoading(true);
    setError("");
    setResult(null);

    const assetList = ASSET_CATEGORIES
      .filter(c => assets[c.key] && Number(assets[c.key]) > 0)
      .map(c => ({ category: c.key, amount_uzs: Number(assets[c.key]) }));

    if (assetList.length === 0) {
      setError("Введите хотя бы одну категорию активов");
      setLoading(false);
      return;
    }

    try {
      const res = await islamicApi.calculateZakat({
        zakat_type: zakatType,
        assets: assetList,
        liabilities_uzs: Number(liabilities) || 0,
        mode: localStorage.getItem("islamic_mode") || "individual",
      });
      setResult(res);
    } catch (e: any) {
      setError("Ошибка расчёта. Проверьте авторизацию.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">🕌 Калькулятор закята</h2>

        {/* Тип закята */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип закята</label>
          <div className="grid grid-cols-2 gap-2">
            {ZAKAT_TYPES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setZakatType(t.key)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  zakatType === t.key
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-emerald-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Активы */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Активы (в UZS)</label>
          <div className="space-y-2">
            {ASSET_CATEGORIES.map(c => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-48 text-sm text-gray-600 shrink-0">{c.label}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={assets[c.key] || ""}
                  onChange={e => setAssets(prev => ({ ...prev, [c.key]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Обязательства */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Обязательства (долги, в UZS)</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={liabilities}
            onChange={e => setLiabilities(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Рассчитываю..." : "Рассчитать закят"}
        </button>
      </form>

      {result && <ZakatResultCard result={result} />}
    </div>
  );
}
