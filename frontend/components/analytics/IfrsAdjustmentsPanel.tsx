'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { formatCurrencyUZS } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingCard } from '@/components/ui/LoadingCard';

interface IfrsAdjustmentsPanelProps {
  portfolioId: number;
  periodFrom: string;
  periodTo: string;
}

interface Adjustment {
  adjustment_type: string;
  account_code?: string;
  nsbu_amount: number;
  ifrs_amount: number;
  difference: number;
  description?: string;
}

const TYPE_LABELS: Record<string, string> = {
  ifrs16_lease: 'IFRS 16: Аренда',
  ias16_revaluation: 'IAS 16: Основные средства',
  ias36_impairment: 'IAS 36 / IFRS 9: Обесценение',
  oci: 'OCI: Прочий совокупный доход',
};

const TYPE_ORDER = ['ifrs16_lease', 'ias16_revaluation', 'ias36_impairment', 'oci'];

export function IfrsAdjustmentsPanel({ portfolioId, periodFrom, periodTo }: IfrsAdjustmentsPanelProps) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') || '' : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/analytics/ifrs-convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ portfolio_id: portfolioId, period_from: periodFrom, period_to: periodTo }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments || []);
      }
    } catch {
      /* network error — keep empty state */
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }, [apiBase, token, portfolioId, periodFrom, periodTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleRecalculate() {
    setRecalculating(true);
    fetchData();
  }

  if (loading) return <LoadingCard rows={5} />;
  if (!adjustments.length) return (
    <EmptyState
      icon={<span>🔄</span>}
      title="Нет корректировок МСФО"
      description="Импортируйте данные НСБУ"
    />
  );

  // Group adjustments by type
  const grouped = new Map<string, Adjustment[]>();
  for (const adj of adjustments) {
    const group = grouped.get(adj.adjustment_type) || [];
    group.push(adj);
    grouped.set(adj.adjustment_type, group);
  }

  // Total difference
  const totalDiff = adjustments.reduce((sum, a) => sum + (a.difference ?? 0), 0);

  // Sort by predefined order, unknown types go last
  const sortedTypes = [...grouped.keys()].sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="flex items-center justify-between p-6 pb-0">
        <h3 className="font-bold text-gray-900 text-lg">🔄 Корректировки НСБУ → МСФО</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            {recalculating ? '⏳ Пересчёт...' : '🔄 Пересчитать МСФО'}
          </button>
          <div className="relative group">
            <button
              disabled
              className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
            >
              📥 Экспорт корректировок
            </button>
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              Скоро
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-violet-900 to-slate-900 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">Тип корректировки</th>
              <th className="text-center py-3 px-4">Счёт НСБУ</th>
              <th className="text-right py-3 px-4">Сумма НСБУ</th>
              <th className="text-right py-3 px-4">Сумма МСФО</th>
              <th className="text-right py-3 px-4">Разница</th>
              <th className="text-left py-3 px-4 rounded-tr-lg">Описание</th>
            </tr>
          </thead>
          <tbody>
            {sortedTypes.map(type => {
              const items = grouped.get(type)!;
              return (
                <React.Fragment key={type}>
                  <tr className="bg-blue-50">
                    <td colSpan={6} className="py-2 px-4 font-semibold text-blue-800">
                      {TYPE_LABELS[type] || type}
                    </td>
                  </tr>
                  {items.map((adj, i) => {
                    const diff = adj.difference ?? (adj.ifrs_amount - adj.nsbu_amount);
                    return (
                      <tr key={`${type}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 pl-8 text-gray-600">{TYPE_LABELS[adj.adjustment_type] || adj.adjustment_type}</td>
                        <td className="py-2 px-4 text-center text-gray-500 font-mono">{adj.account_code || '---'}</td>
                        <td className="py-2 px-4 text-right">{formatCurrencyUZS(adj.nsbu_amount)}</td>
                        <td className="py-2 px-4 text-right">{formatCurrencyUZS(adj.ifrs_amount)}</td>
                        <td className={`py-2 px-4 text-right font-medium ${
                          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {formatCurrencyUZS(diff)}
                        </td>
                        <td className="py-2 px-4 text-gray-500 text-xs">{adj.description || '---'}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {/* Total row */}
            <tr className="bg-slate-800 text-white font-bold">
              <td className="py-3 px-4" colSpan={4}>Итого корректировок</td>
              <td className={`py-3 px-4 text-right ${
                totalDiff > 0 ? 'text-emerald-300' : totalDiff < 0 ? 'text-red-300' : 'text-white'
              }`}>
                {formatCurrencyUZS(totalDiff)}
              </td>
              <td className="py-3 px-4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
