"use client";
import { ZakatResult } from "./api";
import CurrencyDisplay from "./CurrencyDisplay";

interface Props { result: ZakatResult; }

export default function ZakatResultCard({ result }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className={`rounded-2xl border-2 p-6 shadow-sm ${
      result.is_zakat_due
        ? "border-emerald-300 bg-emerald-50"
        : "border-gray-200 bg-gray-50"
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{result.is_zakat_due ? "✅" : "ℹ️"}</span>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Результат расчёта</p>
          <p className="text-lg font-bold text-gray-900">
            {result.is_zakat_due ? "Закят обязателен" : "Закят не обязателен"}
          </p>
        </div>
      </div>

      {result.is_zakat_due && (
        <div className="mb-4 rounded-xl bg-white border border-emerald-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Сумма закята</p>
          <div className="text-2xl font-bold text-emerald-700">
            <CurrencyDisplay uzs={result.zakat_due_uzs} usd={result.zakat_due_usd} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Активы</p>
          <p className="font-semibold">{fmt(result.assets_total_uzs)} UZS</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Обязательства</p>
          <p className="font-semibold">{fmt(result.liabilities_uzs)} UZS</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Чистые активы</p>
          <p className="font-semibold">{fmt(result.net_assets_uzs)} UZS</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Нисаб</p>
          <p className="font-semibold">{fmt(result.nisab_uzs)} UZS</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 bg-white rounded-xl border border-gray-100 p-3 leading-relaxed">
        {result.explanation}
      </p>
    </div>
  );
}
