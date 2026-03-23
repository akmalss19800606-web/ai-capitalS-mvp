"use client";
import { ScreeningResult } from "./api";
import ShariahStatusBadge from "./ShariahStatusBadge";
import StandardRefBadge from "./StandardRefBadge";

interface Props { result: ScreeningResult; }

const SCORE_COLOR = (s: number) =>
  Number(s) >= 4 ? "text-emerald-600" : Number(s) >= 2.5 ? "text-amber-600" : "text-red-600";

export default function ScreeningResultCard({ result }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{result.company_name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <ShariahStatusBadge status={result.status} score={result.score} />
            <StandardRefBadge code="SS No. 62" org="AAOIFI" />
          </div>
        </div>
        <div className={`text-4xl font-bold ${SCORE_COLOR(result.score)}`}>
          {Number(result.score).toFixed(1)}
        </div>
      </div>

      {/* Показатели */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Харам-выручка", value: result.haram_revenue_pct, limit: 5, unit: "%" },
          { label: "Долговая нагрузка", value: result.debt_ratio, limit: 33, unit: "%" },
          { label: "Процентный доход", value: result.interest_income_pct, limit: 5, unit: "%" },
        ].map(item => {
          const exceeded = item.value !== undefined && item.value !== null && item.value > item.limit;
          return (
            <div key={item.label} className={`rounded-xl border p-3 ${exceeded ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
              <p className={`text-lg font-bold ${exceeded ? "text-red-600" : "text-gray-700"}`}>
                {item.value !== undefined && item.value !== null ? `${item.value}%` : "—"}
              </p>
              <p className="text-xs text-gray-400">лимит: {item.limit}%</p>
            </div>
          );
        })}
      </div>

      {/* Нарушения */}
      {result.violations && Object.keys(result.violations).length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">Нарушения:</p>
          {Object.entries(result.violations).map(([k, v]) => (
            <p key={k} className="text-xs text-red-600">
              ⚠️ {v.label}: {v.value}% (лимит {v.threshold}%)
            </p>
          ))}
        </div>
      )}

      {/* Рекомендация */}
      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{result.recommendation}</p>

      <p className="text-xs text-gray-400">Дата анализа: {result.analysis_date}</p>
    </div>
  );
}
