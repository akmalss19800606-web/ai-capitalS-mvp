'use client';
import React, { useState, useEffect } from 'react';
import { calculatorPro } from '@/lib/api';

// ── Color Palette (Light Theme) ──────────────────────────────────────────
const C = {
  bg: '#f8fafc', text: '#1e293b', textMuted: '#64748b', textLight: '#94a3b8',
  primary: '#3b82f6', primaryLight: '#eff6ff', success: '#22c55e',
  successLight: '#f0fdf4', error: '#ef4444', errorLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb', purple: '#8b5cf6',
  border: '#e2e8f0', white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

interface Project {
  name: string; initial_investment: number; currency: string;
  revenue_year1: number; revenue_growth_rate: number; operating_margin: number;
  horizon_years: number; discount_rate: number; tax_rate: number; capex_annual: number;
}

interface ProjectResult {
  name: string; npv: number; irr: number; mirr: number;
  payback_period: number; discounted_payback: number; profitability_index: number;
  roi_pct: number; total_revenue: number; total_profit: number;
  yearly_cashflows: number[];
}

const defaultProject = (): Project => ({
  name: '', initial_investment: 50000, currency: 'USD',
  revenue_year1: 30000, revenue_growth_rate: 0.15, operating_margin: 0.25,
  horizon_years: 5, discount_rate: 0.14, tax_rate: 0.15, capex_annual: 0,
});

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
// ==================== BENCHMARK PANEL ====================
function BenchmarkPanel() {
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    calculatorPro.benchmarks({}).then(setBenchmarks).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ padding: 24, color: C.textMuted }}>Загрузка бенчмарков...</div>;
  if (!benchmarks) return <div style={{ padding: 24, color: C.error }}>Не удалось загрузить</div>;
  const items = [
    { label: 'Ставка ЦБ', value: `${benchmarks.cb_rate}%`, icon: '🏛️' },
    { label: 'Инфляция', value: `${benchmarks.inflation}%`, icon: '📈' },
    { label: 'Кредитная ставка', value: `${benchmarks.lending_rate}%`, icon: '🏦' },
    { label: 'Депозит UZS', value: `${benchmarks.deposit_rate}%`, icon: '💰' },
    { label: 'TSMI', value: `${benchmarks.tsmi_index}`, icon: '📊' },
    { label: 'TSMI YTD', value: `+${benchmarks.tsmi_ytd}%`, icon: '🚀' },
    { label: 'USD/UZS', value: `${benchmarks.usd_uzs?.toLocaleString()}`, icon: '💱' },
    { label: 'ГКО 3Y', value: `${benchmarks.gov_bond_3y}%`, icon: '📜' },
    { label: 'ГКО 10Y', value: `${benchmarks.gov_bond_10y}%`, icon: '📜' },
    { label: 'Рост ВВП', value: `${benchmarks.gdp_growth}%`, icon: '🌍' },
  ];
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>📊 Бенчмарки рынка Узбекистана</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {items.map(item => (
          <div key={item.label} style={{ ...card, textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 20 }}>{item.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.primary }}>{item.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  backgroundColor: C.white, borderRadius: 12, boxShadow: C.cardShadow, padding: 20,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, color: C.text, backgroundColor: C.white, outline: 'none', boxSizing: 'border-box',
  textAlign: 'center',
};
const btnPrimary: React.CSSProperties = {
  backgroundColor: C.primary, color: C.white, borderRadius: 8, border: 'none',
  cursor: 'pointer', padding: '10px 20px', fontSize: 14, fontWeight: 600,
};

function ResultsTable({ results }: { results: ProjectResult[] }) {
  const metrics = [
    { key: 'npv', label: 'NPV', fmt: (v: number) => `$${v.toLocaleString()}`, best: 'max' },
    { key: 'irr', label: 'IRR', fmt: (v: number) => `${(v * 100).toFixed(1)}%`, best: 'max' },
    { key: 'mirr', label: 'MIRR', fmt: (v: number) => `${(v * 100).toFixed(1)}%`, best: 'max' },
    { key: 'payback_period', label: 'Окупаемость', fmt: (v: number) => `${v.toFixed(1)} лет`, best: 'min' },
    { key: 'profitability_index', label: 'PI', fmt: (v: number) => v.toFixed(2), best: 'max' },
    { key: 'roi_pct', label: 'ROI', fmt: (v: number) => `${v.toFixed(1)}%`, best: 'max' },
    { key: 'total_revenue', label: 'Общая выручка', fmt: (v: number) => `$${v.toLocaleString()}`, best: 'max' },
    { key: 'total_profit', label: 'Общая прибыль', fmt: (v: number) => `$${v.toLocaleString()}`, best: 'max' },
  ];
  const getBest = (key: string, best: string) => {
    const vals = results.map((r: any) => r[key]);
    return best === 'max' ? Math.max(...vals) : Math.min(...vals);
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.border}` }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600 }}>Метрика</th>
            {results.map((r, i) => (
              <th key={i} style={{ padding: '8px 12px', textAlign: 'center', color: COLORS[i], fontWeight: 700 }}>{r.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => {
            const bestVal = getBest(m.key, m.best);
            return (
              <tr key={m.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: C.text }}>{m.label}</td>
                {results.map((r: any, i) => (
                  <td key={i} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: r[m.key] === bestVal ? 700 : 400, color: r[m.key] === bestVal ? C.success : C.text }}>
                    {m.fmt(r[m.key])}{r[m.key] === bestVal && ' \ud83c\udfc6'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CashflowChart({ results }: { results: ProjectResult[] }) {
  if (!results.length) return null;
  const maxYears = Math.max(...results.map(r => r.yearly_cashflows.length));
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>📈 Денежные потоки по годам</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', color: C.textMuted }}>Год</th>
              {results.map((r, i) => (
                <th key={i} style={{ padding: '6px 10px', textAlign: 'center', color: COLORS[i], fontWeight: 700 }}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxYears }).map((_, y) => (
              <tr key={y} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 10px', color: C.textMuted }}>{y === 0 ? 'Инвест.' : `Год ${y}`}</td>
                {results.map((r, i) => {
                  const val = r.yearly_cashflows[y] || 0;
                  return (
                    <td key={i} style={{ padding: '6px 10px', textAlign: 'center', color: val >= 0 ? C.success : C.error, fontWeight: 500 }}>
                      ${val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function ComparePage() {
  const [projects, setProjects] = useState<Project[]>([
    { ...defaultProject(), name: 'Проект A' },
    { ...defaultProject(), name: 'Проект B' },
  ]);
  const [results, setResults] = useState<ProjectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'benchmarks'>('compare');

  const addProject = () => {
    if (projects.length >= 5) return;
    const letter = String.fromCharCode(65 + projects.length);
    setProjects([...projects, { ...defaultProject(), name: `Проект ${letter}` }]);
  };
  const removeProject = (idx: number) => {
    if (projects.length <= 2) return;
    setProjects(projects.filter((_, i) => i !== idx));
  };
  const updateProject = (idx: number, field: keyof Project, value: any) => {
    setProjects(projects.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const compare = async () => {
    setLoading(true);
    try {
      const data = await calculatorPro.compare({ projects });
      setResults(data.projects || []);
    } catch (e: any) {
      alert('Ошибка: ' + (e.message || e));
    }
    setLoading(false);
  };

  const fields: { key: keyof Project; label: string; type: string; step?: number }[] = [
    { key: 'name', label: 'Название', type: 'text' },
    { key: 'initial_investment', label: 'Инвестиция ($)', type: 'number' },
    { key: 'revenue_year1', label: 'Выручка Year 1 ($)', type: 'number' },
    { key: 'revenue_growth_rate', label: 'Рост выручки (%)', type: 'number', step: 0.01 },
    { key: 'operating_margin', label: 'Маржа (%)', type: 'number', step: 0.01 },
    { key: 'horizon_years', label: 'Горизонт (лет)', type: 'number' },
    { key: 'discount_rate', label: 'Ставка дисконт.', type: 'number', step: 0.01 },
    { key: 'tax_rate', label: 'Налог (%)', type: 'number', step: 0.01 },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '24px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            ⚖️ Сравнение проектов & Бенчмарки
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['compare', 'benchmarks'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                backgroundColor: activeTab === tab ? C.primary : C.white,
                color: activeTab === tab ? C.white : C.textMuted,
                boxShadow: activeTab === tab ? 'none' : C.cardShadow,
              }}>
                {tab === 'compare' ? '📊 Сравнение' : '🏆 Бенчмарки'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'compare' && (
          <>
            {/* Project Inputs Table */}
            <div style={{ ...card, marginBottom: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600 }}>Параметр</th>
                    {projects.map((p, i) => (
                      <th key={i} style={{ padding: '8px 12px', textAlign: 'center', color: COLORS[i], fontWeight: 700 }}>
                        {p.name || `#${i + 1}`}
                        {projects.length > 2 && (
                          <button onClick={() => removeProject(i)} style={{
                            marginLeft: 4, background: 'none', border: 'none',
                            color: C.textLight, cursor: 'pointer', fontSize: 12,
                          }}>×</button>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(f => (
                    <tr key={f.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '6px 12px', fontWeight: 500, color: C.textMuted }}>{f.label}</td>
                      {projects.map((p, i) => (
                        <td key={i} style={{ padding: '4px 8px' }}>
                          <input
                            type={f.type} step={f.step} value={p[f.key]}
                            onChange={e => updateProject(i, f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                            style={inputStyle}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={compare} disabled={loading} style={btnPrimary}>
                {loading ? '⏳ Считаю...' : '📊 Сравнить проекты'}
              </button>
              {projects.length < 5 && (
                <button onClick={addProject} style={{ ...btnPrimary, backgroundColor: C.white, color: C.primary, border: `1px solid ${C.border}` }}>
                  + Проект
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div style={card}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>📋 Результаты сравнения</h3>
                <ResultsTable results={results} />
                <CashflowChart results={results} />
              </div>
            )}
          </>
        )}

        {activeTab === 'benchmarks' && <BenchmarkPanel />}
      </div>
    </div>
  );
}
