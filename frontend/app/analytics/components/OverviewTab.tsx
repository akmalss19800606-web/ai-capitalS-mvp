'use client';
/* Оригинальный контент из /analytics/ — переименован в компонент */

import { useEffect, useState, useCallback } from 'react';
import { etl, olap } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface OLAPOverview {
  total_investment_value: number;
  total_decisions: number;
  avg_decision_value: number;
  top_categories: BreakdownItem[];
  top_geographies: BreakdownItem[];
  monthly_trend: TimeSeriesItem[];
  status_breakdown: BreakdownItem[];
  type_breakdown: BreakdownItem[];
  last_etl_run?: string;
}

interface ETLStatus {
  last_run_at?: string;
  total_facts: Record<string, number>;
  total_dimensions: Record<string, number>;
}

interface ETLResult {
  status: string;
  dimensions_loaded: Record<string, number>;
  facts_loaded: Record<string, number>;
  materialized_views_refreshed: string[];
  duration_seconds: number;
  message: string;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const IconDatabase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconTrendUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconPie = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Colors for charts ───────────────────────────────────────────────────────

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OverviewTab() {
  const [overview, setOverview] = useState<OLAPOverview | null>(null);
  const [etlStatus, setEtlStatus] = useState<ETLStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlResult, setEtlResult] = useState<ETLResult | null>(null);
  const [error, setError] = useState('');
  const [activeBreakdown, setActiveBreakdown] = useState('category');
  const [breakdownData, setBreakdownData] = useState<BreakdownItem[]>([]);
  const [granularity, setGranularity] = useState('month');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, statusRes] = await Promise.all([
        olap.overview(),
        etl.status(),
      ]);
      setOverview(overviewRes);
      setEtlStatus(statusRes);

      // Load default breakdown
      try {
        const bdRes = await olap.breakdown('category');
        setBreakdownData(bdRes.items || []);
      } catch { /* empty OLAP */ }

      // Load time series
      try {
        const tsRes = await olap.timeSeries('month');
        setTimeSeriesData(tsRes.items || []);
      } catch { /* empty OLAP */ }
    } catch (err: unknown) {
      setError(err.message || 'Ошибка загрузки');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRunETL = async () => {
    setEtlRunning(true);
    setError('');
    setEtlResult(null);
    try {
      const result = await etl.run();
      setEtlResult(result);
      await loadData();
    } catch (err: unknown) {
      setError(err.message || 'Ошибка ETL');
    }
    setEtlRunning(false);
  };

  const handleBreakdownChange = async (dim: string) => {
    setActiveBreakdown(dim);
    try {
      const res = await olap.breakdown(dim);
      setBreakdownData(res.items || []);
    } catch { setBreakdownData([]); }
  };

  const handleGranularityChange = async (g: string) => {
    setGranularity(g);
    try {
      const res = await olap.timeSeries(g);
      setTimeSeriesData(res.items || []);
    } catch { setTimeSeriesData([]); }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const formatNumber = (v: number) =>
    new Intl.NumberFormat('ru-RU').format(v);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ─── Styles ──────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    padding: '32px',
    maxWidth: '1440px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '16px',
  };

  const kpiCardStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: 'center' as const,
    padding: '24px 16px',
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: '#f1f5f9',
    color: '#334155',
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  // ─── Bar Chart Component (CSS only) ─────────────────────────────────────

  const BarChart = ({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '120px', fontSize: '13px', color: '#334155', fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
            {item.label}
          </div>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '28px', overflow: 'hidden' }}>
            <div style={{
              width: maxValue > 0 ? `${Math.max((item.value / maxValue) * 100, 2)}%` : '2%',
              height: '100%',
              background: item.color,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
              transition: 'width 0.5s ease',
            }}>
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>
                {formatCurrency(item.value)}
              </span>
            </div>
          </div>
          <div style={{ width: '40px', fontSize: '12px', color: '#94a3b8', textAlign: 'right' }}>
            {item.value > 0 && maxValue > 0 ? `${Math.round(item.value / data.reduce((s, d) => s + d.value, 0) * 100)}%` : ''}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Trend Chart (CSS sparkline) ────────────────────────────────────────

  const TrendChart = ({ data }: { data: TimeSeriesItem[] }) => {
    if (data.length === 0) return <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px' }}>Нет данных. Запустите ETL.</div>;
    const maxVal = Math.max(...data.map(d => d.total_value), 1);
    const chartHeight = 180;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${chartHeight}px`, padding: '0 4px' }}>
          {data.map((item, i) => {
            const h = (item.total_value / maxVal) * (chartHeight - 30);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                  {formatCurrency(item.total_value)}
                </div>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${Math.max(h, 4)}px`,
                    background: `linear-gradient(180deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[i % CHART_COLORS.length]}88)`,
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.5s ease',
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '6px 4px 0' }}>
          {data.map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
              {item.period}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '16px' }}>Загрузка...</div>
      </div>
    );
  }

  const hasData = overview && overview.total_decisions > 0;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconChart />
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>OLAP Аналитика</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {etlStatus?.last_run_at && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Последний ETL: {formatDate(etlStatus.last_run_at)}
            </span>
          )}
          <button
            style={{ ...btnPrimary, opacity: etlRunning ? 0.6 : 1 }}
            onClick={handleRunETL}
            disabled={etlRunning}
          >
            <IconRefresh />
            {etlRunning ? 'Выполняется...' : 'Запустить ETL'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#dc2626', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert />
          {error}
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }} onClick={() => setError('')}>
            <IconX />
          </button>
        </div>
      )}

      {/* ETL Result */}
      {etlResult && (
        <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <IconCheck />
            <span style={{ fontWeight: 600, color: '#16a34a' }}>{etlResult.message}</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#334155', flexWrap: 'wrap' }}>
            <span>Факты: {Object.values(etlResult.facts_loaded).reduce((s, v) => s + v, 0)}</span>
            <span>Измерения: {Object.values(etlResult.dimensions_loaded).reduce((s, v) => s + v, 0)}</span>
            <span>Views: {etlResult.materialized_views_refreshed.length}</span>
            <span>Время: {etlResult.duration_seconds}с</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
          <IconDatabase />
          <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>OLAP-хранилище пустое</div>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>
            Создайте инвестиционные решения, затем нажмите «Запустить ETL» для заполнения аналитического хранилища.
          </div>
        </div>
      )}

      {hasData && overview && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Общий объём
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(overview.total_investment_value)}
              </div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Всего решений
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {formatNumber(overview.total_decisions)}
              </div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Средний объём
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(overview.avg_decision_value)}
              </div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Таблицы OLAP
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                {etlStatus ? Object.values(etlStatus.total_facts).reduce((s, v) => s + v, 0) : 0}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>записей</div>
            </div>
          </div>

          {/* Monthly Trend */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconTrendUp />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Динамика инвестиций</h2>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['month', 'quarter', 'year'].map(g => (
                  <button
                    key={g}
                    style={chipStyle(granularity === g)}
                    onClick={() => handleGranularityChange(g)}
                  >
                    {{ month: 'Месяц', quarter: 'Квартал', year: 'Год' }[g]}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart data={timeSeriesData.length > 0 ? timeSeriesData : overview.monthly_trend} />
          </div>

          {/* Breakdown Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Left: Dynamic breakdown */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconPie />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Распределение</h2>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { key: 'category', label: 'Категория' },
                  { key: 'geography', label: 'География' },
                  { key: 'decision_type', label: 'Тип' },
                  { key: 'status', label: 'Статус' },
                  { key: 'priority', label: 'Приоритет' },
                ].map(d => (
                  <button
                    key={d.key}
                    style={chipStyle(activeBreakdown === d.key)}
                    onClick={() => handleBreakdownChange(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {breakdownData.length > 0 ? (
                <BarChart
                  data={breakdownData.map((item, i) => ({
                    label: item.label,
                    value: item.total_value,
                    color: CHART_COLORS[i % CHART_COLORS.length],
                  }))}
                  maxValue={Math.max(...breakdownData.map(d => d.total_value), 1)}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                  Нет данных по этому измерению
                </div>
              )}
            </div>

            {/* Right: Status + Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>По статусу</h3>
                {overview.status_breakdown.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {overview.status_breakdown.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ fontSize: '13px', color: '#334155' }}>{item.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.count}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', width: '40px', textAlign: 'right' }}>{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет данных</div>}
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 12px' }}>По типу решения</h3>
                {overview.type_breakdown.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {overview.type_breakdown.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: CHART_COLORS[i + 3 % CHART_COLORS.length] }} />
                          <span style={{ fontSize: '13px', color: '#334155' }}>{item.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{formatCurrency(item.total_value)}</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8', width: '40px', textAlign: 'right' }}>{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет данных</div>}
              </div>
            </div>
          </div>

          {/* ETL Status Details */}
          {etlStatus && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <IconDatabase />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Состояние OLAP-хранилища</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {Object.entries(etlStatus.total_facts).map(([name, count]) => (
                  <div key={name} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                      {name.replace('fact_', '').replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{formatNumber(count)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>записей</div>
                  </div>
                ))}
                {Object.entries(etlStatus.total_dimensions).map(([name, count]) => (
                  <div key={name} style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ fontSize: '12px', color: '#0284c7', marginBottom: '4px' }}>
                      {name.replace('dim_', '').replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{formatNumber(count)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>записей</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

