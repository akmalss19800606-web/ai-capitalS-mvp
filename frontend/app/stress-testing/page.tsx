'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
} from 'recharts';
import { aiAnalytics, portfolios } from '@/lib/api';

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
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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

const IconArrowDown = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
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
    <div style={{ ...card, textAlign: 'center', flex: 1, minWidth: '140px' }}>
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

// ─── Types ──────────────────────────────────────────────────────────────────
interface Portfolio { id: number; name: string; }
interface Scenario { key: string; name: string; description: string; factors_count: number; recovery_months: number; }
interface AssetImpact { asset: string; original_value: number; stressed_value: number; loss_pct: number; }
interface ConcentrationRisk { dimension: string; category: string; weight_pct: number; loss_pct: number; }
interface ShockParameter { factor: string; shock_pct: number; description: string; }

interface StressResult {
  id: number;
  portfolio_id: number;
  scenario_name: string;
  scenario_description?: string;
  shock_parameters: ShockParameter[];
  asset_impacts: AssetImpact[];
  portfolio_value_before: number;
  portfolio_value_after: number;
  total_loss_pct: number;
  max_single_asset_loss_pct: number;
  recovery_time_months?: number;
  concentration_risks?: ConcentrationRisk[];
}

// ─── PIE COLORS ─────────────────────────────────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function StressTestingPage() {
  const [portfoliosList, setPortfoliosList] = useState<Portfolio[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('financial_crisis');
  const [severity, setSeverity] = useState<number>(1.0);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StressResult | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [portsRes, scenariosRes] = await Promise.all([
        portfolios.list(),
        aiAnalytics.getStressScenarios(),
      ]);
      const portsArr: Portfolio[] = Array.isArray(portsRes) ? portsRes : (portsRes?.items || portsRes?.portfolios || []);
      setPortfoliosList(portsArr);
      setScenarios(Array.isArray(scenariosRes) ? scenariosRes : []);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки данных');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const runTest = async () => {
    if (!selectedPortfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiAnalytics.runStressTest({
        portfolio_id: Number(selectedPortfolioId),
        scenario: selectedScenario,
        severity,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Ошибка при стресс-тестировании');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val: number) => {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}М`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}К`;
    return val.toFixed(0);
  };

  // Build impact chart data sorted by loss
  const impactData = [...(result?.asset_impacts || [])]
    .sort((a, b) => a.loss_pct - b.loss_pct)
    .map(d => ({
      ...d,
      name: d.asset.length > 25 ? d.asset.slice(0, 22) + '...' : d.asset,
      loss: d.loss_pct,
      color: d.loss_pct < -20 ? C.error : d.loss_pct < -10 ? C.warning : C.textLight,
    }));

  // Shock parameters table
  const shockData = result?.shock_parameters || [];

  // Concentration risk data for pie
  const concData = (result?.concentration_risks || []);

  // Find selected scenario info
  const scenarioInfo = scenarios.find(s => s.key === selectedScenario);

  const severityLabel = (v: number) => {
    if (v <= 0.5) return 'Мягкий';
    if (v <= 1.0) return 'Стандартный';
    if (v <= 1.5) return 'Умеренный';
    if (v <= 2.0) return 'Жёсткий';
    return 'Экстремальный';
  };

  const severityColor = (v: number) => {
    if (v <= 0.5) return C.success;
    if (v <= 1.0) return C.primary;
    if (v <= 1.5) return C.warning;
    return C.error;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: C.text }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.error }}>
              <IconShield />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.text, margin: 0 }}>Стресс-тестирование</h1>
          </div>
          <p style={{ margin: 0, color: C.textMuted, fontSize: '14px' }}>
            Оценка устойчивости портфеля к экстремальным рыночным сценариям
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
              <SectionTitle>Параметры тестирования</SectionTitle>

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
                <label style={labelStyle}>Сценарий</label>
                <select
                  style={inputStyle}
                  value={selectedScenario}
                  onChange={e => setSelectedScenario(e.target.value)}
                >
                  {scenarios.map(s => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
                {scenarioInfo && (
                  <div style={{ fontSize: '12px', color: C.textLight, marginTop: '6px', lineHeight: 1.5 }}>
                    {scenarioInfo.description}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>
                  Тяжесть: <span style={{ color: severityColor(severity), fontWeight: 700 }}>
                    {severity.toFixed(1)}x — {severityLabel(severity)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={severity}
                  onChange={e => setSeverity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: severityColor(severity) }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.textLight, marginTop: '2px' }}>
                  <span>0.1x</span><span>3.0x</span>
                </div>
              </div>

              <button
                style={{ ...btnPrimary, opacity: !selectedPortfolioId || loading ? 0.6 : 1, justifyContent: 'center', backgroundColor: C.error }}
                onClick={runTest}
                disabled={!selectedPortfolioId || loading}
              >
                {loading ? <IconSpinner /> : <IconZap />}
                {loading ? 'Вычисление...' : 'Запустить стресс-тест'}
              </button>
            </div>

            {/* Right Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && <ErrorState message={error} />}

              {!result && !loading && !error && (
                <div style={card}>
                  <EmptyState text="Выберите портфель, сценарий и запустите стресс-тест для оценки потенциальных потерь" />
                </div>
              )}

              {loading && (
                <div style={card}>
                  <LoadingState text="Запуск стресс-тестирования..." />
                </div>
              )}

              {result && !loading && (
                <>
                  {/* Scenario title */}
                  <div style={{ ...card, borderLeft: `4px solid ${C.error}`, backgroundColor: C.errorLight }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: C.error }}><IconShield /></div>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: '16px' }}>{result.scenario_name}</div>
                        {result.scenario_description && (
                          <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px', lineHeight: 1.5 }}>{result.scenario_description}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KPI Row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <KpiCard
                      label="Портфель ДО"
                      value={`${fmt(result.portfolio_value_before)} UZS`}
                      color={C.primary}
                    />
                    <KpiCard
                      label="Портфель ПОСЛЕ"
                      value={`${fmt(result.portfolio_value_after)} UZS`}
                      color={C.error}
                    />
                    <KpiCard
                      label="Общий убыток"
                      value={`${result.total_loss_pct.toFixed(1)}%`}
                      color={C.error}
                    />
                    <KpiCard
                      label="Макс. убыток актива"
                      value={`${result.max_single_asset_loss_pct.toFixed(1)}%`}
                      color={C.warning}
                    />
                    {result.recovery_time_months != null && (
                      <KpiCard
                        label="Восстановление"
                        value={`${result.recovery_time_months.toFixed(0)} мес.`}
                        color={C.textMuted}
                        sublabel="прогнозная оценка"
                      />
                    )}
                  </div>

                  {/* Asset Impact Bar Chart */}
                  {impactData.length > 0 && (
                    <div style={card}>
                      <SectionTitle>Влияние на активы</SectionTitle>
                      <ResponsiveContainer width="100%" height={Math.max(200, impactData.length * 46)}>
                        <BarChart
                          data={impactData}
                          layout="vertical"
                          margin={{ top: 4, right: 24, left: 120, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} unit="%" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.text }} width={115} />
                          <Tooltip
                            content={({ active, payload }: any) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: C.cardShadow, fontSize: '13px' }}>
                                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{d?.asset}</div>
                                  <div style={{ color: C.textMuted }}>До: {fmt(d?.original_value)} UZS</div>
                                  <div style={{ color: C.error }}>После: {fmt(d?.stressed_value)} UZS</div>
                                  <div style={{ color: C.error, fontWeight: 600 }}>Убыток: {d?.loss_pct?.toFixed(1)}%</div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="loss" name="Убыток (%)" radius={[0, 4, 4, 0]}>
                            {impactData.map((entry, index) => (
                              <Cell key={`impact-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Shock Parameters Table */}
                  {shockData.length > 0 && (
                    <div style={card}>
                      <SectionTitle>Параметры шока</SectionTitle>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr>
                              {['Фактор', 'Шок (%)', 'Описание'].map(h => (
                                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `2px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {shockData.map((s, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.bg : C.white }}>
                                <td style={{ padding: '10px 12px', fontWeight: 500, color: C.text }}>{s.factor}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: s.shock_pct < 0 ? C.error : C.success }}>
                                    <IconArrowDown color={s.shock_pct < 0 ? C.error : C.success} />
                                    {s.shock_pct > 0 ? '+' : ''}{s.shock_pct.toFixed(1)}%
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: '13px' }}>{s.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Concentration Risk */}
                  {concData.length > 0 && (
                    <div style={card}>
                      <SectionTitle>Концентрационные риски</SectionTitle>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                        {/* Pie Chart */}
                        <div>
                          <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                              <Pie
                                data={concData.map((c, i) => ({ name: c.category, value: c.weight_pct }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                              >
                                {concData.map((_, i) => (
                                  <Cell key={`pie-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr>
                                {['Категория', 'Доля', 'Убыток'].map(h => (
                                  <th key={h} style={{ textAlign: h === 'Категория' ? 'left' : 'right', padding: '8px 10px', borderBottom: `2px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {concData.map((c, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.bg : C.white }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 500, color: C.text }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                      {c.category}
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: C.textMuted }}>{c.weight_pct.toFixed(1)}%</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: C.error }}>{c.loss_pct.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
