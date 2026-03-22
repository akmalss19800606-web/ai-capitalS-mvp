"use client";
import { useEffect, useState } from "react";
import { islamicApi, ZakatHistoryItem } from "./api";
import ShariahStatusBadge from "./ShariahStatusBadge";

export default function ZakatHistoryTable() {
  const [history, setHistory] = useState<ZakatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    islamicApi.getZakatHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-20 animate-pulse bg-gray-50 rounded-2xl" />;
  if (history.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">История расчётов пуста</p>
  );

  const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">История расчётов</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Тип</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Активы (UZS)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Закят (UZS)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map(h => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-600">{h.calculation_date}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{h.zakat_type}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmt(h.assets_total_uzs)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(h.zakat_due_uzs)}</td>
                <td className="px-4 py-3 text-center">
                  <ShariahStatusBadge
                    status={h.is_zakat_due ? "compliant" : "noncompliant"}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
