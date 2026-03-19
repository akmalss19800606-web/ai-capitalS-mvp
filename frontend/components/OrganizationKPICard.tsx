// frontend/components/OrganizationKPICard.tsx
// Карточка организации с KPI из баланса — Узел 2 конвейера

"use client";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface KPIs {
  current_ratio: number | null;
  quick_ratio: number | null;
  debt_to_equity: number | null;
  equity_ratio: number | null;
  roe: number | null;
  roa: number | null;
  _total_assets: number | null;
  _total_liabilities: number | null;
  _equity: number | null;
}

interface Props {
  orgId: number;
  orgName: string;
  onImportClick?: () => void;
}

const kpiColor = (name: string, val: number | null) => {
  if (val === null) return "text-gray-400";
  if (name === "current_ratio") return val >= 2 ? "text-green-600" : val >= 1 ? "text-yellow-600" : "text-red-600";
  if (name === "debt_to_equity") return val <= 1 ? "text-green-600" : val <= 2 ? "text-yellow-600" : "text-red-600";
  if (name === "roe" || name === "roa") return val > 0 ? "text-green-600" : "text-red-600";
  return "text-gray-700";
};

const kpiLabel: Record<string, string> = {
  current_ratio: "Коэфф. текущей ликвидности",
  quick_ratio: "Быстрая ликвидность",
  debt_to_equity: "Долг / Капитал (D/E)",
  equity_ratio: "Доля капитала",
  roe: "ROE (Рент. капитала)",
  roa: "ROA (Рент. активов)",
};

export default function OrganizationKPICard({ orgId, orgName, onImportClick }: Props) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/import/balance/${orgId}/kpis`);
      if (res.status === 404) { setNoData(true); return; }
      const data = await res.json();
      setKpis(data.kpis);
      setNoData(false);
    } catch {
      setNoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKPIs(); }, [orgId]);

  const fmt = (v: number | null, pct = false) => {
    if (v === null) return "—";
    return pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(2);
  };

  const fmtBig = (v: number | null) =>
    v != null ? v.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) : "—";

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{orgName}</h3>
          <p className="text-xs text-gray-400">Финансовый профиль (из баланса)</p>
        </div>
        {onImportClick && (
          <button
            onClick={onImportClick}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium"
          >
            📄 {noData ? "Загрузить баланс" : "Обновить баланс"}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && noData && (
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">Данные баланса не загружены</p>
          <p className="text-xs text-gray-300 mt-1">Импортируйте Форму №1 чтобы активировать аналитику</p>
        </div>
      )}

      {!loading && kpis && (
        <div className="space-y-4">
          {/* Абсолюты */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Активы", val: kpis._total_assets, color: "bg-blue-50 text-blue-700" },
              { label: "Обязательства", val: kpis._total_liabilities, color: "bg-orange-50 text-orange-700" },
              { label: "Капитал", val: kpis._equity, color: "bg-green-50 text-green-700" },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-2.5 ${item.color}`}>
                <p className="text-[11px] opacity-70">{item.label}</p>
                <p className="text-sm font-bold">{fmtBig(item.val)}</p>
              </div>
            ))}
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(kpiLabel) as (keyof typeof kpiLabel)[]).map((key) => {
              const val = kpis[key as keyof KPIs] as number | null;
              const isPct = key === "roe" || key === "roa" || key === "equity_ratio";
              return (
                <div key={key} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500">{kpiLabel[key]}</span>
                  <span className={`text-sm font-bold ${kpiColor(key, val)}`}>
                    {fmt(val, isPct)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pipeline hint */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 text-xs text-gray-500">
            💡 <b>Данные доступны в:</b> Аналитика · Калькуляторы · Стресс-тест · XAI · Due Diligence · Отчёты
          </div>
        </div>
      )}
    </div>
  );
}
