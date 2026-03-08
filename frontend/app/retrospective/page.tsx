'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
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
const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconBrain = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2C7.6 2 6 3.6 6 5.5c0 .4.1.8.2 1.2C4.9 7.4 4 8.8 4 10.5c0 1.5.7 2.8 1.7 3.7C5.2 15 5 15.7 5 16.5 5 18.4 6.6 20 8.5 20H9v2h6v-2h.5c1.9 0 3.5-1.6 3.5-3.5 0-.8-.3-1.5-.7-2.1 1-.9 1.7-2.2 1.7-3.7 0-1.7-.9-3.1-2.2-3.8.1-.4.2-.8.2-1.2C18 3.6 16.4 2 14.5 2c-1 0-1.9.4-2.5 1.1C11.4 2.4 10.5 2 9.5 2z" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
);

const IconLightbulb = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
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

const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8M12 8v8" />
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
    <div style={{ ...card, backgroundColor: C.errorLight, border: '1px solid #fecaca', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
    <div style={{ ...card, textAlign: 'center', flex: 1, minWidth: '130px' }}>
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
interface Decision { id: number; title: string; }
interface Portfolio { id: number; name: string; }
interface VarianceFactor { factor: string; contribution_pct: number; description: string; }
interface BenchmarkResult { benchmark_name: string; benchmark_return: number; alpha: number; tracking_error: number; }
interface CognitiveBias { bias_type: string; severity: string; description: string; }
interface LessonLearned { category: string; insight: string; recommendation: string; }

interface RetroResult {
  id: number;
  decision_id?: number;
  portfolio_id?: number;
  analysis_type: string;
  forecast_return: number;
  actual_return: number;
  variance: number;
  variance_pct: number;
  mae?: number;
  mape?: number;
  rmse?: number;
  accuracy_score?: number;
  variance_factors?: VarianceFactor[];
  benchmarks?: BenchmarkResult[];
  cognitive_biases?: CognitiveBias[];
  lessons?: LessonLearned[];
}

// ─── SEVERITY BADGE ─────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const conf: Record<string, { bg: string; color: string; label: string }> = {
    low: { bg: C.successLight, color: C.success, label: 'Низкий' },
    medium: { bg: C.warningLight, color: C.warning, label: 'Средний' },
    high: { bg: C.errorLight, color: C.error, label: 'Высокий' },
  };
  const c = conf[severity] || conf.medium;
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: c.bg, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {c.label}
    </span>
  );
}

// ─── PIE COLORS ─────────────────────────────────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function RetrospectivePage() {
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [portfoliosList, setPortfoliosList] = useState<Portfolio[]>([]);
  const [analysisType, setAnalysisType] = useState<'decision' | 'portfolio'>('decision');
  const [selectedDecisionId, setSelectedDecisionId] = useState<number | ''>('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [forecastReturn, setForecastReturn] = useState<number>(15);
  const [actualReturn, setActualReturn] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RetroResult | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [decsRes, portsRes] = await Promise.all([
        decisions.list({ per_page: 100 }),
        portfolios.list(),
      ]);
      const decsArr: Decision[] = Array.isArray(decsRes) ? decsRes : (decsRes?.items || decsRes?.decisions || []);
      const portsArr: Portfolio[] = Array.isArray(portsRes) ? portsRes : (portsRes?.items || portsRes?.portfolios || []);
      setDecisionsList(decsArr);
      setPortfoliosList(portsArr);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки данных');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        analysis_type: analysisType,
        forecast_return: forecastReturn,
        actual_return: actualReturn,
      };
      if (analysisType === 'decision' && selectedDecisionId !== '') {
        payload.decision_id = Number(selectedDecisionId);
      }
      if (analysisType === 'portfolio' && selectedPortfolioId !== '') {
        payload.portfolio_id = Number(selectedPortfolioId);
      }
      const res = await aiAnalytics.runRetrospective(payload);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка при ретроспективном анализе');
    } finally {
      setLoading(false);
    }
  };

  const canRun =
    (analysisType === 'decision' && selectedDecisionId !== '') ||
    (analysisType === 'portfolio' && selectedPortfolioId !== '');

  // Accuracy color
  const accColor = (v: number) => v >= 80 ? C.success : v >= 50 ? C.warning : C.error;
  const accBg = (v: number) => v >= 80 ? C.successLight : v >= 50 ? C.warningLight : C.errorLight;

  // Variance factors bar chart data
  const varianceData = (result?.variance_factors || []).map((f, i) => ({
    name: f.factor,
    contribution: f.contribution_pct,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: C.text }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <IconHistory />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.text, margin: 0 }}>Ретроспективный анализ</h1>
          </div>
          <p style={{ margin: 0, color: C.textMuted, fontSize: '14px' }}>
            Сравнение прогнозов с фактическими результатами, выявление отклонений и когнитивных искажений
          </p>
        </div>

        {loadingData ? (
          <div style={card}>
            <LoadingState text="Загрузка данных..." />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left Panel */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <SectionTitle>Параметры анализа</SectionTitle>

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
                        name="retroType"
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

              {/* Entity selector */}
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

              {/* Returns input */}
              <div>
                <label style={labelStyle}>Прогнозируемая доходность (%)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={forecastReturn}
                  step={0.1}
                  placeholder="Например: 15"
                  onChange={e => setForecastReturn(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={labelStyle}>Фактическая доходность (%)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={actualReturn}
                  step={0.1}
                  placeholder="Например: 8"
                  onChange={e => setActualReturn(Number(e.target.value))}
                />
              </div>

              <button
                style={{ ...btnPrimary, opacity: !canRun || loading ? 0.6 : 1, justifyContent: 'center' }}
                onClick={runAnalysis}
                disabled={!canRun || loading}
              >
                {loading ? <IconSpinner /> : <IconSearch />}
                {loading ? 'Анализ...' : 'Запустить ретроспективу'}
              </button>
            </div>

            {/* Right Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && <ErrorState message={error} />}

              {!result && !loading && !error && (
                <div style={card}>
                  <EmptyState text="Введите прогнозируемую и фактическую доходность и запустите ретроспективный анализ" />
                </div>
              )}

              {loading && (
                <div style={card}>
                  <LoadingState text="Запуск ретроспективного анализа..." />
                </div>
              )}

              {result && !loading && (
                <>
                  {/* Forecast vs Actual KPIs */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <KpiCard
                      label="Прогноз"
                      value={`${result.forecast_return.toFixed(1)}%`}
                      color={C.primary}
                    />
                    <KpiCard
                      label="Факт"
                      value={`${result.actual_return.toFixed(1)}%`}
                      color={result.actual_return >= result.forecast_return ? C.success : C.error}
                    />
                    <KpiCard
                      label="Отклонение"
                      value={`${result.variance >= 0 ? '+' : ''}${result.variance.toFixed(2)}%`}
                      color={Math.abs(result.variance) < 3 ? C.success : C.error}
                    />
                    {result.accuracy_score != null && (
                      <KpiCard
                        label="Точность"
                        value={`${result.accuracy_score.toFixed(0)}`}
                        color={accColor(result.accuracy_score)}
                        sublabel="из 100"
                      />
                    )}
                  </div>

                  {/* Accuracy Metrics */}
                  <div style={card}>
                    <SectionTitle>Метрики точности прогнозирования</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      {[
                        { label: 'MAE', value: result.mae, desc: 'Средняя абс. ошибка' },
                        { label: 'MAPE', value: result.mape, desc: 'Средн. % ошибки', suffix: '%' },
                        { label: 'RMSE', value: result.rmse, desc: 'Корень СКО' },
                        { label: 'Отклонение', value: result.variance_pct, desc: '% отклонение', suffix: '%' },
                      ].map((m, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: C.bg, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{m.label}</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, color: C.text }}>
                            {m.value != null ? `${m.value.toFixed(2)}${m.suffix || ''}` : '—'}
                          </div>
                          <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>{m.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variance Decomposition */}
                  {varianceData.length > 0 && (
                    <div style={card}>
                      <SectionTitle>Декомпозиция отклонения</SectionTitle>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={varianceData.map(d => ({ name: d.name, value: Math.abs(d.contribution) }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              dataKey="value"
                              label={({ name, percent }: any) => `${name.length > 12 ? name.slice(0, 10) + '..' : name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {varianceData.map((d, i) => (
                                <Cell key={`var-${i}`} fill={d.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div>
                          {(result.variance_factors || []).map((f, i) => (
                            <div key={i} style={{ padding: '8px 0', borderBottom: i < (result.variance_factors?.length || 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                  {f.factor}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: C.primary }}>{f.contribution_pct.toFixed(1)}%</span>
                              </div>
                              {f.description && (
                                <div style={{ fontSize: '12px', color: C.textLight, marginLeft: '14px', lineHeight: 1.4 }}>{f.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Benchmarks */}
                  {result.benchmarks && result.benchmarks.length > 0 && (
                    <div style={card}>
                      <SectionTitle>Бенчмарки</SectionTitle>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr>
                              {['Бенчмарк', 'Доходность', 'Alpha', 'Tracking Error'].map(h => (
                                <th key={h} style={{ textAlign: h === 'Бенчмарк' ? 'left' : 'right', padding: '10px 12px', borderBottom: `2px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.benchmarks.map((b, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.bg : C.white }}>
                                <td style={{ padding: '10px 12px', fontWeight: 500, color: C.text }}>{b.benchmark_name}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textMuted }}>{b.benchmark_return.toFixed(2)}%</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <span style={{ fontWeight: 600, color: b.alpha >= 0 ? C.success : C.error }}>
                                    {b.alpha >= 0 ? '+' : ''}{b.alpha.toFixed(2)}%
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textMuted }}>{b.tracking_error.toFixed(2)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Cognitive Biases */}
                  {result.cognitive_biases && result.cognitive_biases.length > 0 && (
                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ color: C.warning }}><IconBrain /></div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Когнитивные искажения</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {result.cognitive_biases.map((b, i) => (
                          <div key={i} style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{b.bias_type}</span>
                              <SeverityBadge severity={b.severity} />
                            </div>
                            <div style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.5 }}>{b.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lessons Learned */}
                  {result.lessons && result.lessons.length > 0 && (
                    <div style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ color: C.success }}><IconLightbulb /></div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>Извлечённые уроки</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {result.lessons.map((l, i) => (
                          <div key={i} style={{ padding: '14px 16px', borderRadius: '10px', borderLeft: `3px solid ${PIE_COLORS[i % PIE_COLORS.length]}`, backgroundColor: C.bg }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length], textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{l.category}</div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '6px', lineHeight: 1.5 }}>{l.insight}</div>
                            <div style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 600 }}>Рекомендация:</span> {l.recommendation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
