'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ReferenceLine,
} from 'recharts';
import { aiAnalytics, decisions, portfolios } from '@/lib/api';

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
  border: '#e2e8f0',
  white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

// ─── Shared Styles ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  backgroundColor: C.white,
  borderRadius: '12px',
  boxShadow: C.cardShadow,
  padding: '20px',
};

const btnPrimary: React.CSSProperties = {
  backgroundColor: C.primary,
  color: C.white,
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'background 0.15s',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  fontSize: '14px',
  color: C.text,
  backgroundColor: C.white,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: C.textMuted,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconDice = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3"/>
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

const IconBars = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="14" width="4" height="7" rx="1"/>
    <rect x="10" y="9" width="4" height="12" rx="1"/>
    <rect x="17" y="4" width="4" height="17" rx="1"/>
  </svg>
);

const IconGraph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconBrain = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2C7.6 2 6 3.6 6 5.5c0 .4.1.8.2 1.2C4.9 7.4 4 8.8 4 10.5c0 1.5.7 2.8 1.7 3.7C5.2 15 5 15.7 5 16.5 5 18.4 6.6 20 8.5 20H9v2h6v-2h.5c1.9 0 3.5-1.6 3.5-3.5 0-.8-.3-1.5-.7-2.1 1-.9 1.7-2.2 1.7-3.7 0-1.7-.9-3.1-2.2-3.8.1-.4.2-.8.2-1.2C18 3.6 16.4 2 14.5 2c-1 0-1.9.4-2.5 1.1C11.4 2.4 10.5 2 9.5 2z"/>
    <line x1="12" y1="7" x2="12" y2="13"/>
    <line x1="9" y1="10" x2="15" y2="10"/>
  </svg>
);

const IconArrowUp = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

const IconArrowDown = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12h8M12 8v8"/>
  </svg>
);

const IconSpinner = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2 a10 10 0 0 1 10 10" opacity="1"/>
    <path d="M22 12 a10 10 0 0 1-10 10" opacity="0.4"/>
    <path d="M12 22 a10 10 0 0 1-10-10" opacity="0.2"/>
    <path d="M2 12 a10 10 0 0 1 10-10" opacity="0.1"/>
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
  </svg>
);

const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Shared UI Components ───────────────────────────────────────────────────

function LoadingState({ text = 'Вычисление...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
      <IconSpinner />
      <span style={{ color: C.textMuted, fontSize: '14px', fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ ...card, backgroundColor: C.errorLight, border: `1px solid #fecaca`, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <IconAlert />
      <div>
        <div style={{ fontWeight: 600, color: C.error, fontSize: '14px', marginBottom: '4px' }}>Ошибка</div>
        <div style={{ color: '#b91c1c', fontSize: '13px', lineHeight: 1.5 }}>{message}</div>
      </div>
    </div>
  );
}

function EmptyState({ text = 'Выберите параметры и запустите анализ' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
      <IconEmpty />
      <span style={{ color: C.textMuted, fontSize: '14px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

function KpiCard({ label, value, color, sublabel }: { label: string; value: string; color: string; sublabel?: string }) {
  return (
    <div style={{ ...card, textAlign: 'center', flex: 1, minWidth: '120px' }}>
      <div style={{ fontSize: '22px', fontWeight: 700, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {sublabel && <div style={{ fontSize: '11px', color: C.textLight, marginTop: '2px' }}>{sublabel}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 14px 0' }}>{children}</h3>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Decision {
  id: number;
  title: string;
  initial_investment?: number;
}

interface Portfolio {
  id: number;
  name: string;
}

interface MonteCarloResult {
  id: number;
  percentile_5: number;
  percentile_50: number;
  percentile_95: number;
  probability_of_loss: number;
  max_drawdown: number;
  distribution_data: Array<{ bin_start: number; bin_end: number; frequency: number; label?: string }>;
  sensitivity_data: Array<{ parameter: string; low_impact: number; high_impact: number; range_impact: number }>;
}

interface ShapResult {
  id: number;
  predicted_value: number;
  model_confidence: number;
  narrative_explanation: string;
  shap_values: Array<{ feature_name: string; display_name: string; shap_value: number; importance: number }>;
  feature_importance: Array<{ feature_name: string; display_name: string; importance: number }>;
}

interface FrontierResult {
  id: number;
  current_return: number;
  current_risk: number;
  current_sharpe: number;
  optimal_return: number;
  optimal_risk: number;
  optimal_sharpe: number;
  var_95: number;
  cvar_95: number;
  frontier_points: Array<{ risk: number; returns: number; sharpe?: number }>;
  allocation_comparison: Array<{ asset_name: string; current_weight: number; optimal_weight: number; change: number }>;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: C.cardShadow, fontSize: '13px' }}>
      <div style={{ color: C.textMuted, marginBottom: '4px' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || C.text, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: MONTE CARLO
// ═══════════════════════════════════════════════════════════════════════════

function MonteCarloTab({ decisionsList }: { decisionsList: Decision[] }) {
  const [selectedDecisionId, setSelectedDecisionId] = useState<number | ''>('');
  const [investment, setInvestment] = useState<number>(100000);
  const [horizon, setHorizon] = useState<number>(36);
  const [iterations, setIterations] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    if (selectedDecisionId !== '') {
      const dec = decisionsList.find(d => d.id === Number(selectedDecisionId));
      if (dec?.initial_investment) setInvestment(dec.initial_investment);
    }
  }, [selectedDecisionId, decisionsList]);

  const runSimulation = async () => {
    if (!selectedDecisionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiAnalytics.runMonteCarlo({
        decision_id: Number(selectedDecisionId),
        initial_investment: investment,
        time_horizon_months: horizon,
        num_iterations: iterations,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка при запуске симуляции');
    } finally {
      setLoading(false);
    }
  };

  // Build histogram data with color
  const histogramData = (result?.distribution_data || []).map((d) => ({
    label: d.label || `${d.bin_start.toFixed(1)}%`,
    frequency: d.frequency,
    center: (d.bin_start + d.bin_end) / 2,
    color: d.bin_end < -0.5 ? C.error : d.bin_start > 0.5 ? C.success : '#94a3b8',
  }));

  // Build tornado data sorted by range_impact desc
  const tornadoData = [...(result?.sensitivity_data || [])]
    .sort((a, b) => b.range_impact - a.range_impact)
    .slice(0, 8);

  const fmt = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}М`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}К`;
    return val.toFixed(0);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Left Panel */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <SectionTitle>Параметры симуляции</SectionTitle>

        <div>
          <label style={labelStyle}>Решение</label>
          <select
            style={inputStyle}
            value={selectedDecisionId}
            onChange={e => setSelectedDecisionId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Выберите решение...</option>
            {decisionsList.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Сумма инвестиции (₽)</label>
          <input
            type="number"
            style={inputStyle}
            value={investment}
            min={0}
            placeholder="Например: 100000"
            onChange={e => setInvestment(Number(e.target.value))}
          />
        </div>

        <div>
          <label style={labelStyle}>Горизонт: {horizon} мес.</label>
          <input
            type="range"
            min={6}
            max={120}
            step={6}
            value={horizon}
            onChange={e => setHorizon(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.primary }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textLight, marginTop: '2px' }}>
            <span>6 мес.</span><span>120 мес.</span>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Итерации</label>
          <select
            style={inputStyle}
            value={iterations}
            onChange={e => setIterations(Number(e.target.value))}
          >
            <option value={1000}>1 000 итераций</option>
            <option value={5000}>5 000 итераций</option>
            <option value={10000}>10 000 итераций</option>
          </select>
        </div>

        <button
          style={{ ...btnPrimary, opacity: !selectedDecisionId || loading ? 0.6 : 1, justifyContent: 'center' }}
          onClick={runSimulation}
          disabled={!selectedDecisionId || loading}
        >
          {loading ? <IconSpinner /> : <IconDice />}
          {loading ? 'Вычисление...' : 'Запустить симуляцию'}
        </button>
      </div>

      {/* Right Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <ErrorState message={error} />}

        {!result && !loading && !error && (
          <div style={card}>
            <EmptyState text="Выберите решение, настройте параметры и запустите симуляцию Монте-Карло" />
          </div>
        )}

        {loading && (
          <div style={card}>
            <LoadingState text="Запуск симуляции Монте-Карло..." />
          </div>
        )}

        {result && !loading && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <KpiCard label="P5 (пессимист)" value={`${fmt(result.percentile_5)} ₽`} color={C.error} />
              <KpiCard label="Медиана (P50)" value={`${fmt(result.percentile_50)} ₽`} color={C.primary} />
              <KpiCard label="P95 (оптимист)" value={`${fmt(result.percentile_95)} ₽`} color={C.success} />
              <KpiCard
                label="Вер-ть убытка"
                value={`${(result.probability_of_loss * 100).toFixed(1)}%`}
                color={result.probability_of_loss > 0.3 ? C.error : C.success}
              />
              <KpiCard
                label="Max Drawdown"
                value={`${(result.max_drawdown * 100).toFixed(1)}%`}
                color={C.warning}
              />
            </div>

            {/* Distribution Histogram */}
            <div style={card}>
              <SectionTitle>Распределение доходности</SectionTitle>
              {histogramData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={histogramData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="frequency" name="Частота" radius={[3, 3, 0, 0]}>
                      {histogramData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="Нет данных распределения" />
              )}
            </div>

            {/* Tornado Diagram */}
            {tornadoData.length > 0 && (
              <div style={card}>
                <SectionTitle>Tornado-диаграмма чувствительности</SectionTitle>
                <ResponsiveContainer width="100%" height={Math.max(200, tornadoData.length * 46)}>
                  <BarChart
                    data={tornadoData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 100, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                    <YAxis type="category" dataKey="parameter" tick={{ fontSize: 12, fill: C.text }} width={95} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine x={0} stroke={C.border} strokeWidth={1.5} />
                    <Bar dataKey="low_impact" name="Негативное" fill={C.error} radius={[0, 3, 3, 0]} />
                    <Bar dataKey="high_impact" name="Позитивное" fill={C.success} radius={[3, 0, 0, 3]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: SHAP Analysis
// ═══════════════════════════════════════════════════════════════════════════

function ShapTab({ decisionsList, portfoliosList }: { decisionsList: Decision[]; portfoliosList: Portfolio[] }) {
  const [analysisType, setAnalysisType] = useState<'decision' | 'portfolio'>('decision');
  const [selectedDecisionId, setSelectedDecisionId] = useState<number | ''>('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShapResult | null>(null);

  const runShap = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: { decision_id?: number; portfolio_id?: number; analysis_type?: string } = {
        analysis_type: analysisType,
      };
      if (analysisType === 'decision' && selectedDecisionId !== '') {
        payload.decision_id = Number(selectedDecisionId);
      } else if (analysisType === 'portfolio' && selectedPortfolioId !== '') {
        payload.portfolio_id = Number(selectedPortfolioId);
      }
      const res = await aiAnalytics.runShap(payload);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка при запуске SHAP-анализа');
    } finally {
      setLoading(false);
    }
  };

  const canRun =
    (analysisType === 'decision' && selectedDecisionId !== '') ||
    (analysisType === 'portfolio' && selectedPortfolioId !== '');

  // Score color
  const scoreColor = (v: number) => (v < 40 ? C.error : v < 60 ? C.warning : C.success);
  const scoreBarColor = (v: number) => (v < 40 ? C.error : v < 60 ? C.warning : C.success);
  const scoreBg = (v: number) => (v < 40 ? C.errorLight : v < 60 ? C.warningLight : C.successLight);

  // SHAP waterfall data
  const waterfallData = [...(result?.shap_values || [])]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 10)
    .map(d => ({
      ...d,
      absVal: Math.abs(d.shap_value),
      color: d.shap_value >= 0 ? C.success : C.error,
    }));

  // Feature importance data sorted desc
  const featureData = [...(result?.feature_importance || [])]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Left Panel */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <SectionTitle>Параметры SHAP</SectionTitle>

        {/* Radio Analysis Type */}
        <div>
          <label style={labelStyle}>Тип анализа</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(['decision', 'portfolio'] as const).map(type => (
              <label
                key={type}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${analysisType === type ? C.primary : C.border}`, backgroundColor: analysisType === type ? C.primaryLight : C.white, transition: 'all 0.15s' }}
              >
                <input
                  type="radio"
                  name="analysisType"
                  value={type}
                  checked={analysisType === type}
                  onChange={() => { setAnalysisType(type); setResult(null); setError(null); }}
                  style={{ accentColor: C.primary }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500, color: analysisType === type ? C.primary : C.text }}>
                  {type === 'decision' ? 'Анализ решения' : 'Анализ портфеля'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Decision/Portfolio Select */}
        {analysisType === 'decision' ? (
          <div>
            <label style={labelStyle}>Решение</label>
            <select
              style={inputStyle}
              value={selectedDecisionId}
              onChange={e => setSelectedDecisionId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Выберите решение...</option>
              {decisionsList.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Портфель</label>
            <select
              style={inputStyle}
              value={selectedPortfolioId}
              onChange={e => setSelectedPortfolioId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Выберите портфель...</option>
              {portfoliosList.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          style={{ ...btnPrimary, opacity: !canRun || loading ? 0.6 : 1, justifyContent: 'center' }}
          onClick={runShap}
          disabled={!canRun || loading}
        >
          {loading ? <IconSpinner /> : <IconBars />}
          {loading ? 'Анализ...' : 'Запустить SHAP'}
        </button>
      </div>

      {/* Right Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <ErrorState message={error} />}

        {!result && !loading && !error && (
          <div style={card}>
            <EmptyState text="Выберите тип анализа, объект и запустите SHAP-анализ для объяснения предсказания модели" />
          </div>
        )}

        {loading && (
          <div style={card}>
            <LoadingState text="Запуск SHAP-анализа модели..." />
          </div>
        )}

        {result && !loading && (
          <>
            {/* Score Card */}
            <div style={{ ...card, backgroundColor: scoreBg(result.predicted_value) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <SectionTitle>Предсказание модели</SectionTitle>
                <div style={{ fontSize: '11px', color: C.textMuted, backgroundColor: C.white, padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>
                  Уверенность: {(result.model_confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ fontSize: '52px', fontWeight: 800, color: scoreColor(result.predicted_value), lineHeight: 1 }}>
                  {result.predicted_value.toFixed(1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textMuted, marginBottom: '6px' }}>
                    <span>0</span><span>50</span><span>100</span>
                  </div>
                  <div style={{ height: '10px', borderRadius: '5px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${result.predicted_value}%`, backgroundColor: scoreBarColor(result.predicted_value), borderRadius: '5px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '6px' }}>
                    {result.predicted_value < 40 ? 'Низкий рейтинг' : result.predicted_value < 60 ? 'Средний рейтинг' : 'Высокий рейтинг'}
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Explanation */}
            {result.narrative_explanation && (
              <div style={{ ...card, borderLeft: `3px solid ${C.primary}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ color: C.primary, flexShrink: 0, marginTop: '1px' }}>
                    <IconBrain />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Объяснение модели</div>
                    <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: 1.7 }}>{result.narrative_explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SHAP Waterfall */}
            {waterfallData.length > 0 && (
              <div style={card}>
                <SectionTitle>SHAP-значения (влияние факторов)</SectionTitle>
                <ResponsiveContainer width="100%" height={Math.max(220, waterfallData.length * 38)}>
                  <BarChart
                    data={waterfallData}
                    layout="vertical"
                    margin={{ top: 4, right: 30, left: 120, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} />
                    <YAxis type="category" dataKey="display_name" tick={{ fontSize: 12, fill: C.text }} width={115} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: C.cardShadow, fontSize: '13px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{d?.display_name}</div>
                            <div style={{ color: d?.shap_value >= 0 ? C.success : C.error }}>
                              SHAP: {d?.shap_value >= 0 ? '+' : ''}{d?.shap_value?.toFixed(3)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={0} stroke={C.border} strokeWidth={1.5} />
                    <Bar dataKey="shap_value" name="SHAP-значение" radius={[0, 4, 4, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`shap-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Feature Importance */}
            {featureData.length > 0 && (
              <div style={card}>
                <SectionTitle>Важность признаков</SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={featureData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis
                      dataKey="display_name"
                      tick={{ fontSize: 11, fill: C.textMuted }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="importance" name="Важность" fill={C.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: Efficient Frontier
// ═══════════════════════════════════════════════════════════════════════════

function EfficientFrontierTab({ portfoliosList }: { portfoliosList: Portfolio[] }) {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [riskFreeRate, setRiskFreeRate] = useState<number>(5);
  const [optimizationTarget, setOptimizationTarget] = useState<string>('max_sharpe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FrontierResult | null>(null);

  const runFrontier = async () => {
    if (!selectedPortfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiAnalytics.runFrontier({
        portfolio_id: Number(selectedPortfolioId),
        risk_free_rate: riskFreeRate / 100,
        optimization_target: optimizationTarget,
        num_frontier_points: 50,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка при оптимизации портфеля');
    } finally {
      setLoading(false);
    }
  };

  const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const fmtNum = (v: number) => v.toFixed(3);

  // Scatter data: frontier + special points
  const scatterFrontier = (result?.frontier_points || []).map(p => ({ x: p.risk * 100, y: p.returns * 100 }));
  const currentPoint = result ? [{ x: result.current_risk * 100, y: result.current_return * 100 }] : [];
  const optimalPoint = result ? [{ x: result.optimal_risk * 100, y: result.optimal_return * 100 }] : [];

  const improvement = (cur: number, opt: number, higherIsBetter = true) => {
    const diff = opt - cur;
    const isGood = higherIsBetter ? diff > 0 : diff < 0;
    return { diff, isGood, label: `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)}%` };
  };

  const retImpr = result ? improvement(result.current_return, result.optimal_return, true) : null;
  const riskImpr = result ? improvement(result.current_risk, result.optimal_risk, false) : null;
  const sharpeImpr = result ? { diff: result.optimal_sharpe - result.current_sharpe, isGood: result.optimal_sharpe > result.current_sharpe, label: `${result.optimal_sharpe - result.current_sharpe >= 0 ? '+' : ''}${(result.optimal_sharpe - result.current_sharpe).toFixed(3)}` } : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Left Panel */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <SectionTitle>Параметры оптимизации</SectionTitle>

        <div>
          <label style={labelStyle}>Портфель</label>
          <select
            style={inputStyle}
            value={selectedPortfolioId}
            onChange={e => setSelectedPortfolioId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Выберите портфель...</option>
            {portfoliosList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Безрисковая ставка (%)</label>
          <input
            type="number"
            style={inputStyle}
            value={riskFreeRate}
            min={0}
            max={30}
            step={0.1}
            placeholder="Например: 5"
            onChange={e => setRiskFreeRate(Number(e.target.value))}
          />
        </div>

        <div>
          <label style={labelStyle}>Цель оптимизации</label>
          <select
            style={inputStyle}
            value={optimizationTarget}
            onChange={e => setOptimizationTarget(e.target.value)}
          >
            <option value="max_sharpe">Max Sharpe (макс. коэф. Шарпа)</option>
            <option value="min_variance">Min Variance (мин. риск)</option>
            <option value="max_return">Max Return (макс. доходность)</option>
          </select>
        </div>

        <button
          style={{ ...btnPrimary, opacity: !selectedPortfolioId || loading ? 0.6 : 1, justifyContent: 'center' }}
          onClick={runFrontier}
          disabled={!selectedPortfolioId || loading}
        >
          {loading ? <IconSpinner /> : <IconGraph />}
          {loading ? 'Оптимизация...' : 'Оптимизировать'}
        </button>
      </div>

      {/* Right Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <ErrorState message={error} />}

        {!result && !loading && !error && (
          <div style={card}>
            <EmptyState text="Выберите портфель, настройте параметры и запустите оптимизацию эффективной границы" />
          </div>
        )}

        {loading && (
          <div style={card}>
            <LoadingState text="Вычисление эффективной границы..." />
          </div>
        )}

        {result && !loading && (
          <>
            {/* KPI Comparison 2x3 */}
            <div style={card}>
              <SectionTitle>Сравнение: Текущий vs. Оптимальный</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Current */}
                <MetricCompareCard label="Доходность" subtitle="Текущий" value={fmtPct(result.current_return)} isOptimal={false} />
                <MetricCompareCard label="Риск" subtitle="Текущий" value={fmtPct(result.current_risk)} isOptimal={false} />
                <MetricCompareCard label="Sharpe" subtitle="Текущий" value={fmtNum(result.current_sharpe)} isOptimal={false} />
                {/* Optimal */}
                <MetricCompareCard label="Доходность" subtitle="Оптимальный" value={fmtPct(result.optimal_return)} isOptimal={true} improvement={retImpr} />
                <MetricCompareCard label="Риск" subtitle="Оптимальный" value={fmtPct(result.optimal_risk)} isOptimal={true} improvement={riskImpr} />
                <MetricCompareCard label="Sharpe" subtitle="Оптимальный" value={fmtNum(result.optimal_sharpe)} isOptimal={true} improvement={sharpeImpr} />
              </div>
            </div>

            {/* Scatter Chart */}
            {scatterFrontier.length > 0 && (
              <div style={card}>
                <SectionTitle>Эффективная граница</SectionTitle>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <LegendDot color={C.primary} label="Эффективная граница" />
                  <LegendDot color={C.error} label="Текущий портфель" />
                  <LegendDot color={C.success} label="Оптимальный портфель" />
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Риск"
                      unit="%"
                      tick={{ fontSize: 11, fill: C.textMuted }}
                      label={{ value: 'Риск (%)', position: 'insideBottom', offset: -2, fontSize: 11, fill: C.textMuted }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Доходность"
                      unit="%"
                      tick={{ fontSize: 11, fill: C.textMuted }}
                      label={{ value: 'Доходность (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: C.textMuted }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: C.cardShadow, fontSize: '13px' }}>
                            <div>Риск: {d?.x?.toFixed(2)}%</div>
                            <div>Доходность: {d?.y?.toFixed(2)}%</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter name="Граница" data={scatterFrontier} fill={C.primary} fillOpacity={0.6} r={3} line={{ stroke: C.primary, strokeWidth: 1.5 }} lineType="fitting" />
                    <Scatter name="Текущий" data={currentPoint} fill={C.error} r={8} shape="circle" />
                    <Scatter name="Оптимальный" data={optimalPoint} fill={C.success} r={8} shape="circle" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Allocation Table */}
            {result.allocation_comparison && result.allocation_comparison.length > 0 && (
              <div style={card}>
                <SectionTitle>Изменение аллокации</SectionTitle>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr>
                        {['Актив', 'Текущий вес', 'Оптимальный вес', 'Изменение'].map(h => (
                          <th key={h} style={{ textAlign: h === 'Актив' ? 'left' : 'right', padding: '10px 12px', borderBottom: `2px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocation_comparison.map((row, i) => {
                        const change = row.change ?? (row.optimal_weight - row.current_weight);
                        const isPositive = change > 0.001;
                        const isNegative = change < -0.001;
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.bg : C.white }}>
                            <td style={{ padding: '10px 12px', color: C.text, fontWeight: 500 }}>{row.asset_name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textMuted }}>{(row.current_weight * 100).toFixed(2)}%</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.text }}>{(row.optimal_weight * 100).toFixed(2)}%</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: isPositive ? C.success : isNegative ? C.error : C.textMuted }}>
                                {isPositive && <IconArrowUp color={C.success} />}
                                {isNegative && <IconArrowDown color={C.error} />}
                                {`${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VaR / CVaR */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ ...card, flex: 1, borderTop: `3px solid ${C.warning}` }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>VaR 95%</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: C.warning }}>{fmtPct(result.var_95)}</div>
                <div style={{ fontSize: '12px', color: C.textLight, marginTop: '4px' }}>Максимальные потери (5% вероятность)</div>
              </div>
              <div style={{ ...card, flex: 1, borderTop: `3px solid ${C.error}` }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>CVaR 95%</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: C.error }}>{fmtPct(result.cvar_95)}</div>
                <div style={{ fontSize: '12px', color: C.textLight, marginTop: '4px' }}>Ожидаемые потери при превышении VaR</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper sub-components for Frontier tab
function MetricCompareCard({ label, subtitle, value, isOptimal, improvement }: {
  label: string;
  subtitle: string;
  value: string;
  isOptimal: boolean;
  improvement?: { diff: number; isGood: boolean; label: string } | null;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '10px',
      backgroundColor: isOptimal ? (improvement?.isGood ? C.successLight : C.errorLight) : C.bg,
      border: `1.5px solid ${isOptimal ? (improvement?.isGood ? '#bbf7d0' : '#fecaca') : C.border}`,
    }}>
      <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: isOptimal ? (improvement?.isGood ? C.success : C.error) : C.text, marginBottom: '2px' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.textMuted }}>
        <span>{subtitle}</span>
        {isOptimal && improvement && (
          <span style={{ color: improvement.isGood ? C.success : C.error, fontWeight: 600, marginLeft: '4px' }}>
            {improvement.label}
          </span>
        )}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textMuted }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

type Tab = 'montecarlo' | 'shap' | 'frontier';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'montecarlo', label: 'Monte Carlo', icon: <IconDice /> },
  { key: 'shap', label: 'SHAP-анализ', icon: <IconBars /> },
  { key: 'frontier', label: 'Efficient Frontier', icon: <IconGraph /> },
];

export default function AIAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('montecarlo');
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [portfoliosList, setPortfoliosList] = useState<Portfolio[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [decsRes, portsRes] = await Promise.all([
        decisions.list({ per_page: 200 }),
        portfolios.list(),
      ]);
      const decsArr: Decision[] = Array.isArray(decsRes) ? decsRes : (decsRes?.items || decsRes?.decisions || []);
      const portsArr: Portfolio[] = Array.isArray(portsRes) ? portsRes : (portsRes?.items || portsRes?.portfolios || []);
      setDecisionsList(decsArr);
      setPortfoliosList(portsArr);
    } catch (e: any) {
      setDataError(e.message || 'Ошибка загрузки данных');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: C.text }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.text, margin: 0 }}>AI-Аналитика</h1>
          </div>
          <p style={{ margin: 0, color: C.textMuted, fontSize: '14px' }}>
            Моделирование рисков, объяснение решений и оптимизация портфеля
          </p>
        </div>

        {/* Global Error */}
        {dataError && (
          <div style={{ marginBottom: '20px' }}>
            <ErrorState message={`Не удалось загрузить данные: ${dataError}`} />
          </div>
        )}

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', backgroundColor: C.white, padding: '6px', borderRadius: '12px', boxShadow: C.cardShadow, width: 'fit-content' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.white : C.textMuted,
                  backgroundColor: isActive ? C.primary : 'transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {loadingData ? (
          <div style={card}>
            <LoadingState text="Загрузка данных..." />
          </div>
        ) : (
          <>
            {activeTab === 'montecarlo' && (
              <MonteCarloTab decisionsList={decisionsList} />
            )}
            {activeTab === 'shap' && (
              <ShapTab decisionsList={decisionsList} portfoliosList={portfoliosList} />
            )}
            {activeTab === 'frontier' && (
              <EfficientFrontierTab portfoliosList={portfoliosList} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
