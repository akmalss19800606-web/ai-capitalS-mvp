'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, ScatterChart, Scatter,
  ZAxis, ReferenceLine,
} from 'recharts';
import { charts, portfolios } from '@/lib/api';

// ─── Color Palette ─────────────────────────────────────────────────────────
const C = {
  bg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  success: '#22c55e',
  successLight: '#f0fdf4',
  error: '#ef4444',
  errorLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  info: '#6366f1',
  infoLight: '#eef2ff',
  border: '#e2e8f0',
  white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

// ─── Shared Styles ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  backgroundColor: C.white,
  borderRadius: '12px',
  boxShadow: C.cardShadow,
  padding: '24px',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  fontSize: '14px',
  color: C.text,
  backgroundColor: C.white,
  outline: 'none',
  cursor: 'pointer',
};

// ─── Palette for charts ─────────────────────────────────────────────────────
const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Прямые инвестиции': '#3b82f6',
  'Недвижимость': '#22c55e',
  'Венчурный капитал': '#f59e0b',
  'Облигации': '#6366f1',
  'Фонды': '#14b8a6',
  'Другое': '#94a3b8',
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || CHART_COLORS[Math.abs(hashStr(cat)) % CHART_COLORS.length];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);

const IconSpinner = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2 a10 10 0 0 1 10 10" opacity="1" />
    <path d="M22 12 a10 10 0 0 1-10 10" opacity="0.4" />
    <path d="M12 22 a10 10 0 0 1-10-10" opacity="0.2" />
    <path d="M2 12 a10 10 0 0 1 10-10" opacity="0.1" />
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
  </svg>
);

const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ─── Tab definitions ────────────────────────────────────────────────────────
type TabKey = 'waterfall' | 'tornado' | 'bubble' | 'heatmap';

const TABS: { key: TabKey; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: 'waterfall',
    label: 'Waterfall',
    desc: 'Каскадная диаграмма изменений',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="14" width="4" height="7" rx="1" />
        <rect x="7" y="8" width="4" height="6" rx="1" />
        <rect x="12" y="11" width="4" height="3" rx="1" />
        <rect x="17" y="4" width="4" height="17" rx="1" />
      </svg>
    ),
  },
  {
    key: 'tornado',
    label: 'Tornado',
    desc: 'Диаграмма чувствительности',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h18M5 12h14M7 16h10M9 20h6M4 4h16" />
      </svg>
    ),
  },
  {
    key: 'bubble',
    label: 'Bubble',
    desc: 'Пузырьковая диаграмма',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="14" r="5" />
        <circle cx="17" cy="8" r="4" />
        <circle cx="16" cy="18" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'heatmap',
    label: 'Heatmap',
    desc: 'Тепловая карта корреляций',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function ChartsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('waterfall');
  const [portfolioId, setPortfolioId] = useState<number | undefined>(undefined);
  const [portfolioList, setPortfolioList] = useState<any[]>([]);

  // Data per tab
  const [waterfallData, setWaterfallData] = useState<any>(null);
  const [tornadoData, setTornadoData] = useState<any>(null);
  const [bubbleData, setBubbleData] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load portfolio list once
  useEffect(() => {
    portfolios.list().then((r: Record<string, unknown>) => {
      const list = Array.isArray(r) ? r : r?.items || [];
      setPortfolioList(list);
    }).catch(() => {});
  }, []);

  // Load data when tab or filter changes
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      switch (activeTab) {
        case 'waterfall': {
          const d = await charts.waterfall(portfolioId);
          setWaterfallData(d);
          break;
        }
        case 'tornado': {
          const d = await charts.tornado(portfolioId);
          setTornadoData(d);
          break;
        }
        case 'bubble': {
          const d = await charts.bubble(portfolioId);
          setBubbleData(d);
          break;
        }
        case 'heatmap': {
          const d = await charts.heatmap(portfolioId);
          setHeatmapData(d);
          break;
        }
      }
    } catch (e: unknown) {
      setError(e.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [activeTab, portfolioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>
            Расширенные визуализации
          </h1>
          <p style={{ fontSize: '14px', color: C.textMuted, marginTop: '4px' }}>
            VIS-CHART-001 — Waterfall, Tornado, Bubble, Heatmap
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={portfolioId ?? ''}
            onChange={(e) => setPortfolioId(e.target.value ? Number(e.target.value) : undefined)}
            style={selectStyle}
          >
            <option value="">Все портфели</option>
            {portfolioList.map((p: Record<string, unknown>) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: `1px solid ${isActive ? C.primary : C.border}`,
                backgroundColor: isActive ? C.primaryLight : C.white,
                color: isActive ? C.primary : C.textMuted,
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,0.08)' : 'none',
              }}
            >
              <span className="flex items-center">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab description ───────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: '20px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: C.primary, display: 'flex', alignItems: 'center' }}>
          <IconChart />
        </span>
        <span style={{ fontSize: '14px', color: C.textMuted }}>
          {TABS.find(t => t.key === activeTab)?.desc}
        </span>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ ...card, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="text-center">
            <IconSpinner />
            <p style={{ marginTop: '12px', fontSize: '14px', color: C.textMuted }}>Загрузка данных...</p>
          </div>
        </div>
      ) : error ? (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', backgroundColor: C.errorLight, border: `1px solid #fecaca` }}>
          <IconAlert />
          <span style={{ fontSize: '14px', color: C.error }}>{error}</span>
        </div>
      ) : (
        <>
          {activeTab === 'waterfall' && waterfallData && <WaterfallChart data={waterfallData} />}
          {activeTab === 'tornado' && tornadoData && <TornadoChart data={tornadoData} />}
          {activeTab === 'bubble' && bubbleData && <BubbleChart data={bubbleData} />}
          {activeTab === 'heatmap' && heatmapData && <HeatmapChart data={heatmapData} />}
        </>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// VIS-CHART-001.1  WATERFALL
// ═══════════════════════════════════════════════════════════════════════════

function WaterfallChart({ data }: { data: Record<string, unknown> }) {
  const items: unknown[] = data.items || [];
  const unit = data.unit || '';

  // Build bar data for waterfall using invisible + visible bars
  const chartData = items.map((item: Record<string, unknown>, idx: number) => {
    const isTotal = item.type === 'total';
    const prev = idx > 0 ? items[idx - 1].cumulative : 0;
    const invisible = isTotal ? 0 : Math.min(prev, item.cumulative);
    const visible = isTotal ? item.value : Math.abs(item.value);

    return {
      name: item.name,
      invisible: Math.max(invisible, 0),
      value: visible,
      rawValue: item.value,
      cumulative: item.cumulative,
      type: item.type,
    };
  });

  const getColor = (type: string) => {
    if (type === 'total') return '#6366f1';
    if (type === 'increase') return '#22c55e';
    return '#ef4444';
  };

  const CustomTooltip = ({ active, payload  }: Record<string, unknown>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const typeLabel = d.type === 'total' ? 'Итого' : d.type === 'increase' ? 'Рост' : 'Снижение';
    return (
      <div style={{ ...card, padding: '12px 16px', fontSize: '13px', border: `1px solid ${C.border}` }}>
        <p style={{ fontWeight: 600, marginBottom: '6px', color: C.text }}>{d.name}</p>
        <p style={{ color: C.textMuted }}>Значение: <span style={{ fontWeight: 600, color: getColor(d.type) }}>{d.rawValue > 0 ? '+' : ''}{d.rawValue} {unit}</span></p>
        <p style={{ color: C.textMuted }}>Накопительно: <span style={{ fontWeight: 600, color: C.text }}>{d.cumulative} {unit}</span></p>
        <p style={{ color: C.textMuted }}>Тип: {typeLabel}</p>
      </div>
    );
  };

  return (
    <div style={card}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '20px' }}>
        Каскадная диаграмма (Waterfall)
      </h3>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: C.textMuted }}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12, fill: C.textMuted }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="invisible" stackId="stack" fill="transparent" />
          <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
            {chartData.map((entry: Record<string, unknown>, idx: number) => (
              <Cell key={idx} fill={getColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
        {[
          { label: 'Рост', color: '#22c55e' },
          { label: 'Снижение', color: '#ef4444' },
          { label: 'Итого', color: '#6366f1' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: l.color }} />
            <span style={{ fontSize: '12px', color: C.textMuted }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// VIS-CHART-001.2  TORNADO
// ═══════════════════════════════════════════════════════════════════════════

function TornadoChart({ data }: { data: Record<string, unknown> }) {
  const items: unknown[] = data.items || [];
  const base = data.base || 0;
  const unit = data.unit || '';

  // Transform for horizontal bar chart
  const chartData = items.map((item: Record<string, unknown>) => ({
    factor: item.factor,
    lowDelta: -(base - item.low),
    highDelta: item.high - base,
    low: item.low,
    high: item.high,
    delta: item.delta,
  }));

  const CustomTooltip = ({ active, payload  }: Record<string, unknown>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ ...card, padding: '12px 16px', fontSize: '13px', border: `1px solid ${C.border}` }}>
        <p style={{ fontWeight: 600, marginBottom: '6px', color: C.text }}>{d.factor}</p>
        <p style={{ color: C.textMuted }}>Негативный сценарий: <span style={{ fontWeight: 600, color: C.error }}>{d.low} {unit}</span></p>
        <p style={{ color: C.textMuted }}>Базовый сценарий: <span style={{ fontWeight: 600, color: C.text }}>{base} {unit}</span></p>
        <p style={{ color: C.textMuted }}>Позитивный сценарий: <span style={{ fontWeight: 600, color: C.success }}>{d.high} {unit}</span></p>
        <p style={{ color: C.textMuted }}>Размах: <span style={{ fontWeight: 600, color: C.primary }}>{d.delta * 2} {unit}</span></p>
      </div>
    );
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, margin: 0 }}>
          Диаграмма чувствительности (Tornado)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', backgroundColor: C.primaryLight }}>
          <span style={{ fontSize: '12px', color: C.textMuted }}>Базовое значение:</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.primary }}>{base} {unit}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(300, items.length * 52)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 140, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: C.textMuted }} />
          <YAxis
            type="category"
            dataKey="factor"
            tick={{ fontSize: 13, fill: C.text }}
            width={130}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke={C.textLight} strokeWidth={1.5} />
          <Bar dataKey="lowDelta" fill={C.error} radius={[4, 0, 0, 4]} name="Негативный" />
          <Bar dataKey="highDelta" fill={C.success} radius={[0, 4, 4, 0]} name="Позитивный" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '12px' }}>
        {[
          { label: 'Негативный сценарий (−20%)', color: C.error },
          { label: 'Позитивный сценарий (+20%)', color: C.success },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: l.color }} />
            <span style={{ fontSize: '12px', color: C.textMuted }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// VIS-CHART-001.3  BUBBLE
// ═══════════════════════════════════════════════════════════════════════════

function BubbleChart({ data }: { data: Record<string, unknown> }) {
  const items: unknown[] = data.items || [];
  const xLabel = data.xLabel || 'X';
  const yLabel = data.yLabel || 'Y';

  // Group by category
  const categories = [...new Set(items.map((i: Record<string, unknown>) => i.category))];

  const riskLabels: Record<number, string> = {
    1: 'Низкий',
    2: 'Средний',
    3: 'Высокий',
    4: 'Критический',
  };

  const CustomTooltip = ({ active, payload  }: Record<string, unknown>) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ ...card, padding: '12px 16px', fontSize: '13px', border: `1px solid ${C.border}` }}>
        <p style={{ fontWeight: 600, marginBottom: '6px', color: C.text }}>{d.name}</p>
        <p style={{ color: C.textMuted }}>Категория: <span style={{ fontWeight: 600, color: getCategoryColor(d.category) }}>{d.category}</span></p>
        <p style={{ color: C.textMuted }}>Доходность: <span style={{ fontWeight: 600, color: C.text }}>{d.x} млн UZS</span></p>
        <p style={{ color: C.textMuted }}>Риск: <span style={{ fontWeight: 600, color: d.y >= 3 ? C.error : d.y === 2 ? C.warning : C.success }}>{riskLabels[d.y] || d.y}</span></p>
        <p style={{ color: C.textMuted }}>Объём: <span style={{ fontWeight: 600, color: C.text }}>{d.z} млн UZS</span></p>
      </div>
    );
  };

  return (
    <div style={card}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '20px' }}>
        Пузырьковая диаграмма
      </h3>
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 12, fill: C.textMuted }}
            label={{ value: xLabel, position: 'insideBottom', offset: -10, fontSize: 12, fill: C.textMuted }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={[0, 5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v: number) => riskLabels[v] || String(v)}
            tick={{ fontSize: 12, fill: C.textMuted }}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: C.textMuted }}
          />
          <ZAxis type="number" dataKey="z" range={[200, 2000]} />
          <Tooltip content={<CustomTooltip />} />
          {categories.map((cat: string) => (
            <Scatter
              key={cat}
              name={cat}
              data={items.filter((i: Record<string, unknown>) => i.category === cat)}
              fill={getCategoryColor(cat)}
              fillOpacity={0.7}
              stroke={getCategoryColor(cat)}
              strokeWidth={1}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
        {categories.map((cat: string) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getCategoryColor(cat) }} />
            <span style={{ fontSize: '12px', color: C.textMuted }}>{cat}</span>
          </div>
        ))}
      </div>

      {/* Stats cards below chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px' }}>
        {categories.map((cat: string) => {
          const catItems = items.filter((i: Record<string, unknown>) => i.category === cat);
          const totalX = catItems.reduce((s: number, i: unknown) => s + (i.x || 0), 0);
          const avgRisk = catItems.length ? (catItems.reduce((s: number, i: unknown) => s + (i.y || 0), 0) / catItems.length).toFixed(1) : '0';
          return (
            <div key={cat} style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getCategoryColor(cat) }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{cat}</span>
              </div>
              <div style={{ fontSize: '12px', color: C.textMuted }}>
                <span>Проектов: {catItems.length}</span>
                <span style={{ margin: '0 8px' }}>|</span>
                <span>Доходность: {totalX.toFixed(1)}</span>
                <span style={{ margin: '0 8px' }}>|</span>
                <span>Ср. риск: {avgRisk}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// VIS-CHART-001.4  HEATMAP
// ═══════════════════════════════════════════════════════════════════════════

function HeatmapChart({ data }: { data: Record<string, unknown> }) {
  const cells: unknown[] = data.cells || [];
  const rows: string[] = data.rows || [];
  const cols: string[] = data.cols || [];
  const unit = data.unit || '';

  // Find min/max for color scale
  const values = cells.map((c: Record<string, unknown>) => c.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);

  function getHeatColor(val: number): string {
    if (maxVal === minVal) return '#93c5fd';
    const ratio = (val - minVal) / (maxVal - minVal);
    if (ratio < 0.25) return '#dbeafe';
    if (ratio < 0.5) return '#93c5fd';
    if (ratio < 0.75) return '#3b82f6';
    return '#1e40af';
  }

  function getTextColor(val: number): string {
    if (maxVal === minVal) return '#1e293b';
    const ratio = (val - minVal) / (maxVal - minVal);
    return ratio > 0.5 ? '#ffffff' : '#1e293b';
  }

  function getCellData(row: string, col: string): unknown | null {
    return cells.find((c: Record<string, unknown>) => c.row === row && c.col === col) || null;
  }

  return (
    <div style={card}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '20px' }}>
        Тепловая карта корреляций
      </h3>

      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th style={{
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: 600,
                color: C.textMuted,
                minWidth: '160px',
              }}>
                Категория / Статус
              </th>
              {cols.map((col) => (
                <th key={col} style={{
                  padding: '10px 14px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.textMuted,
                  minWidth: '110px',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.text,
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                }}>
                  {row}
                </td>
                {cols.map((col) => {
                  const cell = getCellData(row, col);
                  const val = cell?.value || 0;
                  const cnt = cell?.count || 0;
                  return (
                    <td key={col} style={{
                      padding: '12px',
                      textAlign: 'center',
                      backgroundColor: getHeatColor(val),
                      color: getTextColor(val),
                      borderRadius: '8px',
                      transition: 'transform 0.15s',
                      cursor: 'default',
                      position: 'relative',
                    }}
                    title={`${row} × ${col}: ${val} ${unit} (${cnt} шт.)`}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{val}</div>
                      <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{cnt} шт.</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Color scale legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
        <span style={{ fontSize: '12px', color: C.textMuted }}>Мин ({minVal.toFixed(1)})</span>
        <div style={{ display: 'flex', gap: '2px' }}>
          {['#dbeafe', '#93c5fd', '#3b82f6', '#1e40af'].map((color) => (
            <div key={color} style={{ width: '40px', height: '14px', borderRadius: '3px', backgroundColor: color }} />
          ))}
        </div>
        <span style={{ fontSize: '12px', color: C.textMuted }}>Макс ({maxVal.toFixed(1)})</span>
      </div>

      {/* Summary row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: `1px solid ${C.border}`,
      }}>
        {rows.map((row) => {
          const rowCells = cells.filter((c: Record<string, unknown>) => c.row === row);
          const total = rowCells.reduce((s: number, c: unknown) => s + c.value, 0);
          const count = rowCells.reduce((s: number, c: unknown) => s + c.count, 0);
          return (
            <div key={row} className="text-center">
              <div style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{row}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: C.text }}>{total.toFixed(1)} {unit}</div>
              <div style={{ fontSize: '11px', color: C.textLight }}>{count} решений</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
