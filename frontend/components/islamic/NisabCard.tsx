"use client";
import { useEffect, useState } from "react";
import { islamicApi, NisabData } from "./api";
import CurrencyDisplay from "./CurrencyDisplay";

export default function NisabCard() {
  const [data, setData] = useState<NisabData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    islamicApi.getNisab()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-2/3" />
    </div>
  );

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
            Нисаб сегодня · AAOIFI (85г золота)
          </p>
          <div className="text-2xl font-bold text-gray-900">
            <CurrencyDisplay uzs={data.nisab_uzs} usd={data.nisab_usd} />
          </div>
        </div>
        <div className="text-3xl">🕌</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-white border border-emerald-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Цена золота (1г)</p>
          <p className="font-semibold text-gray-800">
            {new Intl.NumberFormat("ru-RU").format(data.gold_price_uzs)} UZS
          </p>
        </div>
        <div className="rounded-xl bg-white border border-emerald-100 p-3">
          <p className="text-xs text-gray-500 mb-0.5">Курс USD/UZS</p>
          <p className="font-semibold text-gray-800">
            {new Intl.NumberFormat("ru-RU").format(data.exchange_rate_uzs)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Данные на {data.rate_date} · источник: {data.source}
      </p>
    </div>
  );
}
