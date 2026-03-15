'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Insight {
  type: string;
  severity: string;
  title: string;
  message: string;
  recommendation: string;
}

interface InsightsResponse {
  generated_at: string;
  total_insights: number;
  insights: Insight[];
  summary?: {
    total_decisions: number;
    total_value: number;
    avg_value: number;
  };
}

interface TrendItem {
  period: string;
  total_value: number;
  count: number;
  avg_value: number;
  mom_growth?: number;
}

interface TrendResponse {
  trend_direction: string;
  total_growth_pct: number;
  periods_analyzed: number;
  data: TrendItem[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function SeverityBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
}

export default function ReportsPage() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'trends' | 'export'>('insights');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, trRes] = await Promise.all([
        fetch(`${API}/api/v1/reports/olap/insights`, { headers }),
        fetch(`${API}/api/v1/reports/olap/trends`, { headers }),
      ]);
      if (insRes.ok) setInsights(await insRes.json());
      if (trRes.ok) setTrends(await trRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Insights</h1>
            <p className="text-sm text-gray-500">AI-powered portfolio analysis and export</p>
          </div>
          <button onClick={loadData} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['insights', 'trends', 'export'] as const).map(tab => (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insights?.summary && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <p className="text-xs text-gray-500">Total Decisions</p>
                  <p className="text-xl font-bold">{insights.summary.total_decisions}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <p className="text-xs text-gray-500">Total Value</p>
                  <p className="text-xl font-bold">{fmt(insights.summary.total_value)}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <p className="text-xs text-gray-500">Avg Value</p>
                  <p className="text-xl font-bold">{fmt(insights.summary.avg_value)}</p>
                </div>
              </div>
            )}
            {insights?.insights.length === 0 && <p className="text-sm text-gray-400">No insights available</p>}
            {insights?.insights.map((ins, i) => (
              <div key={i} className="bg-white rounded-xl shadow p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{ins.title}</h3>
                  <SeverityBadge s={ins.severity} />
                </div>
                <p className="text-sm text-gray-600 mb-2">{ins.message}</p>
                <p className="text-xs text-blue-600 font-medium">→ {ins.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && trends && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500">Trend Direction</p>
                <p className="text-xl font-bold capitalize">{trends.trend_direction}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500">Total Growth</p>
                <p className={`text-xl font-bold ${trends.total_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trends.total_growth_pct >= 0 ? '+' : ''}{trends.total_growth_pct}%
                </p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500">Periods Analyzed</p>
                <p className="text-xl font-bold">{trends.periods_analyzed}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500">Period</th>
                    <th className="text-right px-4 py-3 text-gray-500">Total Value</th>
                    <th className="text-right px-4 py-3 text-gray-500">Count</th>
                    <th className="text-right px-4 py-3 text-gray-500">MoM %</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.data.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{row.period}</td>
                      <td className="px-4 py-3 text-right">{fmt(row.total_value)}</td>
                      <td className="px-4 py-3 text-right">{row.count}</td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        (row.mom_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>{row.mom_growth !== undefined ? `${row.mom_growth >= 0 ? '+' : ''}${row.mom_growth}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Export Data</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">All Decisions (CSV)</p>
                  <p className="text-sm text-gray-500">Export all investment decisions as CSV file</p>
                </div>
                <a
                  href={`${API}/api/v1/reports/olap/export/csv`}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  download
                >Download CSV</a>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Portfolio Report (JSON)</p>
                  <p className="text-sm text-gray-500">Full OLAP portfolio analytics report</p>
                </div>
                <a
                  href={`${API}/api/v1/reports/olap/portfolio`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  target="_blank" rel="noopener"
                >View Report</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
