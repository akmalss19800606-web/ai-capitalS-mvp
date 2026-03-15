'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface KPI {
  total_portfolio_value: number;
  total_decisions: number;
  avg_decision_value: number;
  active_decisions: number;
  completed_decisions: number;
  this_month_value: number;
  last_month_value: number;
  mom_growth_pct: number;
}

interface BreakdownItem {
  dimension: string;
  label: string;
  total_value: number;
  count: number;
  percentage: number;
}

interface TimeSeriesItem {
  period: string;
  total_value: number;
  count: number;
  avg_value: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesItem[]>([]);
  const [dimension, setDimension] = useState('category');
  const [granularity, setGranularity] = useState('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [kpiRes, bdRes, tsRes] = await Promise.all([
        fetch(`${API}/api/v1/analytics/olap/kpi`, { headers }),
        fetch(`${API}/api/v1/analytics/olap/breakdown?dimension=${dimension}`, { headers }),
        fetch(`${API}/api/v1/analytics/olap/time-series?granularity=${granularity}`, { headers }),
      ]);
      if (kpiRes.ok) setKpi(await kpiRes.json());
      if (bdRes.ok) setBreakdown(await bdRes.json());
      if (tsRes.ok) setTimeSeries(await tsRes.json());
    } catch (e) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [dimension, granularity]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OLAP Analytics</h1>
            <p className="text-sm text-gray-500">Multi-dimensional investment analysis</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* KPI Cards */}
        {kpi && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Total Portfolio Value" value={fmt(kpi.total_portfolio_value)} />
            <KpiCard title="Total Decisions" value={kpi.total_decisions.toString()} />
            <KpiCard title="Avg Decision Value" value={fmt(kpi.avg_decision_value)} />
            <KpiCard
              title="MoM Growth"
              value={`${kpi.mom_growth_pct >= 0 ? '+' : ''}${kpi.mom_growth_pct}%`}
              sub={`This month: ${fmt(kpi.this_month_value)}`}
            />
            <KpiCard title="Active Decisions" value={kpi.active_decisions.toString()} />
            <KpiCard title="Completed" value={kpi.completed_decisions.toString()} />
            <KpiCard title="This Month" value={fmt(kpi.this_month_value)} />
            <KpiCard title="Last Month" value={fmt(kpi.last_month_value)} />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Breakdown by:</label>
            <select
              value={dimension}
              onChange={e => setDimension(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="category">Category</option>
              <option value="geography">Geography</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Time granularity:</label>
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Breakdown Table */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Breakdown by {dimension}</h2>
            {breakdown.length === 0 ? (
              <p className="text-sm text-gray-400">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Label</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Value</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Count</th>
                      <th className="text-right py-2 text-gray-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-800">{item.label}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">{fmt(item.total_value)}</td>
                        <td className="py-2 pr-4 text-right text-gray-500">{item.count}</td>
                        <td className="py-2 text-right">
                          <span className="inline-flex items-center gap-1">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                            </div>
                            <span className="text-gray-500">{item.percentage}%</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Time Series */}
          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Time Series ({granularity})</h2>
            {timeSeries.length === 0 ? (
              <p className="text-sm text-gray-400">No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Period</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Total Value</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Count</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeSeries.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-4 text-gray-800">{item.period}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">{fmt(item.total_value)}</td>
                        <td className="py-2 pr-4 text-right text-gray-500">{item.count}</td>
                        <td className="py-2 text-right text-gray-500">{fmt(item.avg_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          Data from OLAP analytics engine — endpoints: /api/v1/analytics/olap/*
        </p>
      </div>
    </div>
  );
}
