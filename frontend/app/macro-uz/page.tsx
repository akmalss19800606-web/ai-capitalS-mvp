'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import { useLocale } from '../../lib/i18n';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';

/* ─── Types ─── */
interface MacroIndicator {
  id: number;
  category: string;
  indicator_code: string;
  indicator_name_ru: string;
  value: number;
  unit: string | null;
  period_type: string;
  period_date: string;
  year: number;
  change_pct: number | null;
}

interface MacroCategory {
  code: string;
  name_ru: string;
  indicator_count: number;
  latest_year: number | null;
}

interface CurrencyHistoryPoint {
  rate_date: string;
  rate: number;
  diff: number;
}

interface CurrencyHistory {
  code: string;
  points: CurrencyHistoryPoint[];
  total_points: number;
  min_rate: number | null;
  max_rate: number | null;
  avg_rate: number | null;
  change_pct: number | null;
}

interface MacroDashboard {
  gdp_total: number | null;
  gdp_growth_pct: number | null;
  inflation_pct: number | null;
  population_mln: number | null;
  unemployment_pct: number | null;
  trade_balance_bln: number | null;
  industrial_growth_pct: number | null;
  usd_rate: number | null;
  usd_change: number | null;
  eur_rate: number | null;
  eur_change: number | null;
  data_year: number | null;
}

/* ─── SVG Icons ─── */
const IconRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconTrendUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconTrendDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const IconDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

/* ─── Category Icons ─── */
const CATEGORY_ICONS: Record<string, string> = {
  gdp: '#1D8348',
  industry: '#2471A3',
  trade: '#8E44AD',
  prices: '#E74C3C',
  demographics: '#2C3E50',
  labor: '#E67E22',
  investment: '#1ABC9C',
  budget: '#D4AC0D',
  banking: '#5B2C6F',
};

const CATEGORY_ORDER = ['gdp', 'industry', 'trade', 'prices', 'demographics', 'labor', 'investment', 'budget', 'banking'];

/* ─── Styles ─── */
const S = {
  page: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0',
  } as React.CSSProperties,
  syncBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    background: '#fff',
    color: '#374151',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '2px solid #E5E7EB',
    paddingBottom: '0',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: active ? 600 : 400,
    color: active ? '#1D8348' : '#6B7280',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #1D8348' : '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-2px',
    transition: 'all 0.15s',
  }) as React.CSSProperties,
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  } as React.CSSProperties,
  kpiCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  kpiLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 500,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  kpiValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a2e',
    lineHeight: 1.2,
  } as React.CSSProperties,
  kpiUnit: {
    fontSize: '13px',
    color: '#9CA3AF',
    fontWeight: 400,
    marginLeft: '4px',
  } as React.CSSProperties,
  kpiChange: (positive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: positive ? '#059669' : '#DC2626',
    padding: '2px 8px',
    borderRadius: '6px',
    background: positive ? '#ECFDF5' : '#FEF2F2',
  }) as React.CSSProperties,
  catGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  } as React.CSSProperties,
  catCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  catTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  catDot: (color: string) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }) as React.CSSProperties,
  tableWrap: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginBottom: '24px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  } as React.CSSProperties,
  th: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '12px',
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    background: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  } as React.CSSProperties,
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #F3F4F6',
    color: '#374151',
  } as React.CSSProperties,
  chartCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    marginBottom: '24px',
  } as React.CSSProperties,
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '16px',
  } as React.CSSProperties,
  currencySelect: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  currencyBtn: (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: '8px',
    border: active ? '2px solid #1D8348' : '1px solid #D1D5DB',
    background: active ? '#ECFDF5' : '#fff',
    color: active ? '#1D8348' : '#374151',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }) as React.CSSProperties,
  periodBtns: {
    display: 'flex',
    gap: '6px',
    marginBottom: '20px',
  } as React.CSSProperties,
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '16px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  statItem: {
    textAlign: 'center' as const,
    padding: '12px 20px',
    background: '#F9FAFB',
    borderRadius: '8px',
    minWidth: '100px',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '11px',
    color: '#6B7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginTop: '4px',
  } as React.CSSProperties,
  source: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '8px',
    textAlign: 'right' as const,
  } as React.CSSProperties,
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    fontSize: '15px',
    color: '#6B7280',
  } as React.CSSProperties,
};

/* ─── CURRENCIES ─── */
const CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP', 'CNY', 'KZT', 'TRY'];
const PERIODS = [
  { label: '30 дней', days: 30 },
  { label: '90 дней', days: 90 },
  { label: '180 дней', days: 180 },
  { label: '1 год', days: 365 },
];

/* ─── COMPONENT ─── */
export default function MacroUzPage() {
  const router = useRouter();
  const { t } = useLocale();
  const mp = t.macroPage;

  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'charts' | 'currency'>('overview');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dashboard, setDashboard] = useState<MacroDashboard | null>(null);
  const [categories, setCategories] = useState<MacroCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<MacroIndicator[]>([]);
  const [chartData, setChartData] = useState<unknown[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  // Currency history
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [currencyDays, setCurrencyDays] = useState(90);
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistory | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiRequest('/macro/dashboard');
      setDashboard(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiRequest('/macro/categories');
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchIndicators = useCallback(async (category?: string) => {
    try {
      const params = category ? `?category=${category}` : '';
      const data = await apiRequest(`/macro/indicators${params}`);
      setIndicators(data.indicators || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchIndicatorSeries = useCallback(async (code: string) => {
    try {
      const data = await apiRequest(`/macro/indicator/${code}`);
      const items: MacroIndicator[] = data.indicators || [];
      setChartData(items.map(i => ({
        year: i.year,
        value: i.value,
        name: i.indicator_name_ru,
        unit: i.unit,
      })));
    } catch (e) { console.error(e); }
  }, []);

  const fetchCurrencyHistory = useCallback(async () => {
    setCurrencyLoading(true);
    try {
      const data = await apiRequest(`/macro/currency-history?code=${selectedCurrency}&days=${currencyDays}`);
      setCurrencyHistory(data);
    } catch (e) { console.error(e); }
    setCurrencyLoading(false);
  }, [selectedCurrency, currencyDays]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchCategories()]);
      setLoading(false);
    })();
  }, [fetchDashboard, fetchCategories]);

  useEffect(() => {
    if (activeTab === 'currency') fetchCurrencyHistory();
  }, [activeTab, fetchCurrencyHistory]);

  useEffect(() => {
    if (selectedCat) {
      fetchIndicators(selectedCat);
    }
  }, [selectedCat, fetchIndicators]);

  useEffect(() => {
    if (selectedIndicator) {
      fetchIndicatorSeries(selectedIndicator);
    }
  }, [selectedIndicator, fetchIndicatorSeries]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiRequest('/macro/sync', { method: 'POST' });
      await Promise.all([fetchDashboard(), fetchCategories()]);
      if (selectedCat) await fetchIndicators(selectedCat);
    } catch (e) { console.error(e); }
    setSyncing(false);
  };

  const handleCatClick = (code: string) => {
    setSelectedCat(code);
    setSelectedIndicator(null);
    setActiveTab('details');
    fetchIndicators(code);
  };

  const handleIndicatorClick = (code: string) => {
    setSelectedIndicator(code);
    setActiveTab('charts');
    fetchIndicatorSeries(code);
  };

  if (loading) {
    return <div style={S.page}><div style={S.loading}>{t.loading}</div></div>;
  }

  /* ─── KPI cards ─── */
  const kpis = dashboard ? [
    { label: mp.kpi.gdpTotal, value: dashboard.gdp_total, unit: 'трлн UZS', change: dashboard.gdp_growth_pct },
    { label: mp.kpi.gdpGrowth, value: dashboard.gdp_growth_pct, unit: '%', change: null },
    { label: mp.kpi.inflation, value: dashboard.inflation_pct, unit: '%', change: null },
    { label: mp.kpi.population, value: dashboard.population_mln, unit: 'млн чел.', change: null },
    { label: mp.kpi.unemployment, value: dashboard.unemployment_pct, unit: '%', change: null },
    { label: mp.kpi.tradeBalance, value: dashboard.trade_balance_bln, unit: 'млрд USD', change: null },
    { label: mp.kpi.industrialGrowth, value: dashboard.industrial_growth_pct, unit: '%', change: null },
    { label: 'USD/UZS', value: dashboard.usd_rate, unit: 'UZS', change: dashboard.usd_change },
    { label: 'EUR/UZS', value: dashboard.eur_rate, unit: 'UZS', change: dashboard.eur_change },
  ] : [];

  const formatVal = (v: number | null | undefined, unit?: string) => {
    if (v === null || v === undefined) return '—';
    if (Math.abs(v) >= 1000) return v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    return v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  };

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.headerRow}>
        <div>
          <h1 style={S.title}>{mp.title}</h1>
          <p style={S.subtitle}>{mp.subtitle}</p>
        </div>
        <button
          style={{ ...S.syncBtn, opacity: syncing ? 0.6 : 1 }}
          onClick={handleSync}
          disabled={syncing}
        >
          <IconRefresh />
          {syncing ? mp.syncing : mp.syncBtn}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabs}>
        {(['overview', 'details', 'charts', 'currency'] as const).map(tab => (
          <button key={tab} style={S.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {mp.tabs[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Grid */}
          <div style={S.kpiGrid}>
            {kpis.map((kpi, i) => (
              <div key={i} style={S.kpiCard}>
                <div style={S.kpiLabel}>{kpi.label}</div>
                <div style={S.kpiValue}>
                  {formatVal(kpi.value)}
                  <span style={S.kpiUnit}>{kpi.unit}</span>
                </div>
                {kpi.change !== null && kpi.change !== undefined && (
                  <div style={S.kpiChange(kpi.change >= 0)}>
                    {kpi.change >= 0 ? <IconTrendUp /> : <IconTrendDown />}
                    {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Categories Grid */}
          <div style={S.catGrid}>
            {CATEGORY_ORDER.map(code => {
              const cat = categories.find(c => c.code === code);
              if (!cat) return null;
              return (
                <div
                  key={code}
                  style={S.catCard}
                  onClick={() => handleCatClick(code)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = CATEGORY_ICONS[code] || '#1D8348'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB'; }}
                >
                  <div style={S.catTitle}>
                    <span style={S.catDot(CATEGORY_ICONS[code] || '#6B7280')} />
                    {mp.categories[code as keyof typeof mp.categories] || cat.name_ru}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>
                    {cat.indicator_count} {cat.indicator_count === 1 ? 'показатель' : cat.indicator_count < 5 ? 'показателя' : 'показателей'}
                    {cat.latest_year && ` · до ${cat.latest_year} г.`}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.source}>{mp.source}</div>
        </>
      )}

      {/* ── Tab: Details ── */}
      {activeTab === 'details' && (
        <>
          {/* Category selector */}
          <div style={S.currencySelect}>
            {CATEGORY_ORDER.map(code => {
              const cat = categories.find(c => c.code === code);
              if (!cat) return null;
              return (
                <button
                  key={code}
                  style={S.currencyBtn(selectedCat === code)}
                  onClick={() => { setSelectedCat(code); fetchIndicators(code); }}
                >
                  {mp.categories[code as keyof typeof mp.categories] || cat.name_ru}
                </button>
              );
            })}
          </div>

          {indicators.length > 0 ? (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{mp.table.indicator}</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>{mp.table.value}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{mp.table.unit}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{mp.table.year}</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>{mp.table.change}</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind, i) => (
                    <tr
                      key={ind.id || i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleIndicatorClick(ind.indicator_code)}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                    >
                      <td style={S.td}>
                        <span style={{ fontWeight: 500 }}>{ind.indicator_name_ru}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {formatVal(ind.value)}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                        {ind.unit || '—'}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>{ind.year}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        {ind.change_pct !== null ? (
                          <span style={{
                            color: ind.change_pct >= 0 ? '#059669' : '#DC2626',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}>
                            {ind.change_pct >= 0 ? '+' : ''}{ind.change_pct}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={S.loading}>{selectedCat ? t.loading : 'Выберите категорию'}</div>
          )}
        </>
      )}

      {/* ── Tab: Charts ── */}
      {activeTab === 'charts' && (
        <>
          {/* Indicator selector from current category */}
          {selectedCat && indicators.length > 0 && (
            <div style={{ ...S.currencySelect, marginBottom: '20px' }}>
              {[...new Set(indicators.map(i => i.indicator_code))].map(code => {
                const ind = indicators.find(i => i.indicator_code === code);
                return (
                  <button
                    key={code}
                    style={S.currencyBtn(selectedIndicator === code)}
                    onClick={() => handleIndicatorClick(code)}
                  >
                    {ind?.indicator_name_ru || code}
                  </button>
                );
              })}
            </div>
          )}

          {chartData.length > 0 ? (
            <div style={S.chartCard}>
              <div style={S.chartTitle}>
                {chartData[0]?.name} ({chartData[0]?.unit || ''})
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D8348" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1D8348" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatVal(value), chartData[0]?.name]}
                    labelFormatter={(label) => `${label} г.`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1D8348"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    dot={{ fill: '#1D8348', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={S.loading}>
              {selectedIndicator ? t.loading : mp.chart.noData}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Currency History ── */}
      {activeTab === 'currency' && (
        <>
          <div style={S.chartCard}>
            <div style={S.chartTitle}>{mp.currency.title}</div>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>{mp.currency.subtitle}</p>

            {/* Currency selector */}
            <div style={S.currencySelect}>
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  style={S.currencyBtn(selectedCurrency === c)}
                  onClick={() => setSelectedCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Period selector */}
            <div style={S.periodBtns}>
              {PERIODS.map(p => (
                <button
                  key={p.days}
                  style={S.currencyBtn(currencyDays === p.days)}
                  onClick={() => setCurrencyDays(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {currencyLoading ? (
              <div style={S.loading}>{mp.currency.loadingHistory}</div>
            ) : currencyHistory && currencyHistory.points.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={currencyHistory.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="rate_date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d: string) => {
                        const dt = new Date(d);
                        return `${dt.getDate().toString().padStart(2, '0')}.${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString('ru-RU')} UZS`, selectedCurrency]}
                      labelFormatter={(label: string) => {
                        const dt = new Date(label);
                        return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
                      }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#1D8348"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: '#1D8348' }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Stats */}
                <div style={S.statsRow}>
                  {currencyHistory.min_rate !== null && (
                    <div style={S.statItem}>
                      <div style={S.statLabel}>{mp.currency.min}</div>
                      <div style={S.statValue}>{currencyHistory.min_rate?.toLocaleString('ru-RU')}</div>
                    </div>
                  )}
                  {currencyHistory.max_rate !== null && (
                    <div style={S.statItem}>
                      <div style={S.statLabel}>{mp.currency.max}</div>
                      <div style={S.statValue}>{currencyHistory.max_rate?.toLocaleString('ru-RU')}</div>
                    </div>
                  )}
                  {currencyHistory.avg_rate !== null && (
                    <div style={S.statItem}>
                      <div style={S.statLabel}>{mp.currency.avg}</div>
                      <div style={S.statValue}>{currencyHistory.avg_rate?.toLocaleString('ru-RU')}</div>
                    </div>
                  )}
                  {currencyHistory.change_pct !== null && (
                    <div style={S.statItem}>
                      <div style={S.statLabel}>{mp.currency.change}</div>
                      <div style={{
                        ...S.statValue,
                        color: (currencyHistory.change_pct || 0) >= 0 ? '#DC2626' : '#059669',
                      }}>
                        {(currencyHistory.change_pct || 0) >= 0 ? '+' : ''}{currencyHistory.change_pct}%
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={S.loading}>{mp.chart.noData}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
