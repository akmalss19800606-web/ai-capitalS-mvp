'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { reports, portfolios, decisions } from '@/lib/api';

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

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

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

const btnOutline: React.CSSProperties = {
  backgroundColor: C.white,
  color: C.textMuted,
  borderRadius: '8px',
  border: `1px solid ${C.border}`,
  cursor: 'pointer',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s',
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
  boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: C.textMuted,
  marginBottom: '6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Shared UI Components ───────────────────────────────────────────────────
function LoadingState({ text = 'Загрузка...' }: { text?: string }) {
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
      <div style={{ fontWeight: 600, color: C.error, fontSize: '14px' }}>Ошибка: {message}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 14px 0' }}>{children}</h3>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface TemplateSection { section_key: string; title: string; required: boolean; description?: string; }
interface TemplateMetric { metric_key: string; label: string; category?: string; }
interface Template {
  id: number;
  name: string;
  template_key: string;
  description?: string;
  sections: TemplateSection[];
  available_metrics?: TemplateMetric[];
  is_system: boolean;
}

interface SectionContent {
  section_key: string;
  title: string;
  text?: string;
  data?: Record<string, unknown>;
  table?: Record<string, unknown>[];
  chart_type?: string;
  chart_data?: Record<string, unknown>[];
}

interface ReportInstance {
  id: number;
  user_id: number;
  template_key: string;
  title: string;
  portfolio_id?: number;
  decision_id?: number;
  selected_sections?: string[];
  content: SectionContent[];
  executive_summary?: string;
  meta?: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface Portfolio { id: number; name: string; total_value: number; }
interface Decision { id: number; title: string; amount: number; status: string; }

// ─── Template badge colors ──────────────────────────────────────────────────
const TEMPLATE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  investment_memo: { bg: '#ede9fe', text: '#7c3aed', icon: '📋' },
  quarterly_report: { bg: '#dbeafe', text: '#2563eb', icon: '📊' },
  portfolio_report: { bg: '#d1fae5', text: '#059669', icon: '💼' },
  analytical_note: { bg: '#fef3c7', text: '#d97706', icon: '📝' },
};

// ═══════════════════════════════════════════════════════════════════════════
// CHART RENDERERS
// ═══════════════════════════════════════════════════════════════════════════

function SectionChart({ chartType, chartData }: { chartType?: string; chartData?: unknown[] }) {
  if (!chartType || !chartData || chartData.length === 0) return null;

  if (chartType === 'bar') {
    const dataKey = chartData[0]?.value !== undefined ? 'value' : Object.keys(chartData[0]).find(k => k !== 'name') || 'value';
    return (
      <div style={{ marginTop: '12px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
            <Tooltip
              contentStyle={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px' }}
            />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={`bar-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'pie') {
    return (
      <div style={{ marginTop: '12px' }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              dataKey="value"
              label={({ name, percent }: unknown) => `${(name || '').slice(0, 15)} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((_, i) => (
                <Cell key={`pie-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: unknown) => typeof val === 'number' ? val.toFixed(1) : val} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'radar') {
    return (
      <div style={{ marginTop: '12px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke={C.border} />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: C.textMuted }} />
            <PolarRadiusAxis tick={{ fontSize: 10, fill: C.textLight }} />
            <Radar name="Скоринг" dataKey="score" stroke={C.primary} fill={C.primary} fillOpacity={0.25} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

function SectionTable({ table }: { table?: Record<string, unknown>[] }) {
  if (!table || table.length === 0) return null;
  const cols = Object.keys(table[0]);
  return (
    <div style={{ marginTop: '12px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {cols.map(col => (
              <th key={col} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? C.bg : C.white }}>
              {cols.map(col => (
                <td key={col} style={{ padding: '8px 10px', color: C.text }}>
                  {String(row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

type Tab = 'constructor' | 'history';

export default function ReportPage() {
  // Data
  const [templatesList, setTemplatesList] = useState<Template[]>([]);
  const [portfoliosList, setPortfoliosList] = useState<Portfolio[]>([]);
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [historyList, setHistoryList] = useState<ReportInstance[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('constructor');
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constructor form
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('');
  const [selectedDecisionId, setSelectedDecisionId] = useState<number | ''>('');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Generated result
  const [previewReport, setPreviewReport] = useState<ReportInstance | null>(null);

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [tpls, ports, decsRaw] = await Promise.all([
        reports.listTemplates(),
        portfolios.list(),
        decisions.list({ per_page: 100 }),
      ]);
      const tplArr: Template[] = Array.isArray(tpls) ? tpls : [];
      setTemplatesList(tplArr);
      if (tplArr.length > 0 && !selectedTemplateKey) {
        setSelectedTemplateKey(tplArr[0].template_key);
        const allKeys = tplArr[0].sections.map((s: TemplateSection) => s.section_key);
        setSelectedSections(new Set(allKeys));
      }
      setPortfoliosList(Array.isArray(ports) ? ports : (ports?.items || []));
      const decsArr = Array.isArray(decsRaw) ? decsRaw : (decsRaw?.items || []);
      setDecisionsList(decsArr);
    } catch (e: unknown) {
      setError(e.message || 'Ошибка загрузки');
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const hist = await reports.listHistory();
      setHistoryList(Array.isArray(hist) ? hist : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadData(); loadHistory(); }, [loadData, loadHistory]);

  // ─── Template selection ───────────────────────────────────────────────────
  const currentTemplate = templatesList.find(t => t.template_key === selectedTemplateKey);

  const handleTemplateChange = (key: string) => {
    setSelectedTemplateKey(key);
    setPreviewReport(null);
    const tpl = templatesList.find(t => t.template_key === key);
    if (tpl) {
      setSelectedSections(new Set(tpl.sections.map(s => s.section_key)));
    }
  };

  const toggleSection = (key: string) => {
    const tpl = currentTemplate;
    const sec = tpl?.sections.find(s => s.section_key === key);
    if (sec?.required) return;
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedTemplateKey) return;
    setGenerating(true);
    setError(null);
    setPreviewReport(null);
    try {
      const res = await reports.generate({
        template_key: selectedTemplateKey,
        title: reportTitle || undefined,
        portfolio_id: selectedPortfolioId ? Number(selectedPortfolioId) : undefined,
        decision_id: selectedDecisionId ? Number(selectedDecisionId) : undefined,
        selected_sections: Array.from(selectedSections),
        period_label: periodLabel || undefined,
      });
      setPreviewReport(res);
      loadHistory();
    } catch (e: unknown) {
      setError(e.message || 'Ошибка генерации');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await reports.delete(id);
      setHistoryList(prev => prev.filter(r => r.id !== id));
      if (previewReport?.id === id) setPreviewReport(null);
    } catch {
      // silent
    }
  };

  // ─── View from history ────────────────────────────────────────────────────
  const viewReport = async (id: number) => {
    try {
      const res = await reports.get(id);
      setPreviewReport(res);
      setActiveTab('constructor');
    } catch (e: unknown) {
      setError(e.message || 'Ошибка загрузки отчёта');
    }
  };

  // ─── Template needs ───────────────────────────────────────────────────────
  const needsPortfolio = ['quarterly_report', 'portfolio_report'].includes(selectedTemplateKey);
  const needsDecision = ['investment_memo', 'analytical_note'].includes(selectedTemplateKey);

  // ─── Format date ──────────────────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  const tplColor = (key: string) => TEMPLATE_COLORS[key] || { bg: '#f1f5f9', text: '#475569', icon: '📄' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: C.text }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
              <IconDoc />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.text, margin: 0 }}>Генератор отчётов</h1>
          </div>
          <p style={{ margin: 0, color: C.textMuted, fontSize: '14px' }}>
            Конструктор инвестиционных отчётов с шаблонами, аналитикой и NLG-резюме
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: C.white, borderRadius: '10px', padding: '4px', border: `1px solid ${C.border}`, width: 'fit-content' }}>
          {[
            { key: 'constructor' as Tab, label: 'Конструктор' },
            { key: 'history' as Tab, label: `История (${historyList.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: activeTab === tab.key ? C.primary : 'transparent',
                color: activeTab === tab.key ? C.white : C.textMuted,
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div style={card}><LoadingState text="Загрузка шаблонов..." /></div>
        ) : activeTab === 'constructor' ? (
          /* ═══════════════════════════════════════════════════════════════════════
             CONSTRUCTOR TAB
             ═══════════════════════════════════════════════════════════════════════ */
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Left Panel — Form */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <SectionTitle>Параметры отчёта</SectionTitle>

              {/* Template selection */}
              <div>
                <label style={labelStyle}>Шаблон отчёта</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {templatesList.map(tpl => {
                    const c = tplColor(tpl.template_key);
                    const isSelected = tpl.template_key === selectedTemplateKey;
                    return (
                      <div
                        key={tpl.template_key}
                        onClick={() => handleTemplateChange(tpl.template_key)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? C.primary : C.border}`,
                          backgroundColor: isSelected ? C.primaryLight : C.white,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{c.icon}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? C.primary : C.text }}>{tpl.name}</span>
                        </div>
                        {tpl.description && (
                          <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px', lineHeight: 1.4 }}>
                            {tpl.description.slice(0, 80)}{tpl.description.length > 80 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio selector */}
              {needsPortfolio && (
                <div>
                  <label style={labelStyle}>Портфель</label>
                  <select
                    style={inputStyle}
                    value={selectedPortfolioId}
                    onChange={e => setSelectedPortfolioId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Выберите портфель...</option>
                    {portfoliosList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${(p.total_value || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Decision selector */}
              {needsDecision && (
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
              )}

              {/* Custom title */}
              <div>
                <label style={labelStyle}>Название отчёта</label>
                <input
                  style={inputStyle}
                  placeholder="Автоматически по шаблону"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                />
              </div>

              {/* Period */}
              <div>
                <label style={labelStyle}>Период</label>
                <input
                  style={inputStyle}
                  placeholder="Например: Q1 2026"
                  value={periodLabel}
                  onChange={e => setPeriodLabel(e.target.value)}
                />
              </div>

              {/* Section selector */}
              {currentTemplate && (
                <div>
                  <label style={labelStyle}>Разделы ({selectedSections.size}/{currentTemplate.sections.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentTemplate.sections.map(sec => {
                      const isSelected = selectedSections.has(sec.section_key);
                      const isRequired = sec.required;
                      return (
                        <div
                          key={sec.section_key}
                          onClick={() => toggleSection(sec.section_key)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: isRequired ? 'default' : 'pointer',
                            backgroundColor: isSelected ? C.primaryLight : C.bg,
                            border: `1px solid ${isSelected ? '#bfdbfe' : C.border}`,
                            opacity: isRequired ? 0.85 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? C.primary : C.border}`,
                            backgroundColor: isSelected ? C.primary : C.white,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: C.white,
                            flexShrink: 0,
                          }}>
                            {isSelected && <IconCheck />}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>
                              {sec.title}
                              {isRequired && <span style={{ color: C.error, marginLeft: '4px' }}>*</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                style={{
                  ...btnPrimary,
                  justifyContent: 'center',
                  opacity: generating ? 0.6 : 1,
                }}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? <IconSpinner /> : <IconPlay />}
                {generating ? 'Генерация отчёта...' : 'Сгенерировать отчёт'}
              </button>
            </div>

            {/* Right Panel — Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && <ErrorState message={error} />}

              {generating && (
                <div style={card}><LoadingState text="Генерация отчёта — собираем данные, строим аналитику..." /></div>
              )}

              {!previewReport && !generating && !error && (
                <div style={card}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                      <IconDoc />
                    </div>
                    <span style={{ color: C.textMuted, fontSize: '14px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
                      Выберите шаблон, настройте разделы и нажмите «Сгенерировать» для создания отчёта
                    </span>
                  </div>
                </div>
              )}

              {previewReport && !generating && (
                <>
                  {/* Report Title */}
                  <div style={{ ...card, borderLeft: `4px solid ${C.primary}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: C.text }}>{previewReport.title}</div>
                        <div style={{ fontSize: '13px', color: C.textMuted, marginTop: '4px' }}>
                          {previewReport.meta?.template_name} · {previewReport.meta?.period} · {fmtDate(previewReport.created_at)}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: tplColor(previewReport.template_key).bg,
                        color: tplColor(previewReport.template_key).text,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {previewReport.status === 'completed' ? 'Готов' : previewReport.status}
                      </div>
                    </div>
                  </div>

                  {/* NLG Executive Summary */}
                  {previewReport.executive_summary && (
                    <div style={{ ...card, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                          </svg>
                        </div>
                        <span style={{ fontWeight: 700, color: '#1e40af', fontSize: '14px' }}>NLG Executive Summary</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#1e3a5f', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                        {previewReport.executive_summary}
                      </div>
                    </div>
                  )}

                  {/* Report Sections */}
                  {previewReport.content.map((sec, idx) => (
                    <div key={idx} style={card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          backgroundColor: C.primaryLight,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: C.primary,
                        }}>
                          {idx + 1}
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>{sec.title}</h3>
                      </div>

                      {sec.text && (
                        <div style={{ fontSize: '14px', color: C.text, lineHeight: 1.7, marginBottom: '8px' }}>
                          {sec.text}
                        </div>
                      )}

                      {/* KPI data box */}
                      {sec.data && Object.keys(sec.data).length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '6px' }}>
                          {Object.entries(sec.data).map(([k, v]) => (
                            <div key={k} style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: C.bg, border: `1px solid ${C.border}`, minWidth: '100px' }}>
                              <div style={{ fontSize: '11px', color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{k.replace(/_/g, ' ')}</div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
                                {typeof v === 'number' ? (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(1)) : String(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <SectionTable table={sec.table} />
                      <SectionChart chartType={sec.chart_type} chartData={sec.chart_data} />
                    </div>
                  ))}

                  {/* Disclaimer */}
                  {previewReport.meta?.disclaimer && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a', fontSize: '12px', color: '#854d0e', lineHeight: 1.5 }}>
                      {previewReport.meta.disclaimer}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════
             HISTORY TAB
             ═══════════════════════════════════════════════════════════════════════ */
          <div style={card}>
            <SectionTitle>История отчётов</SectionTitle>
            {historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: '14px' }}>
                Отчёты ещё не генерировались. Перейдите в конструктор и создайте первый отчёт.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historyList.map(r => {
                  const c = tplColor(r.template_key);
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `1px solid ${C.border}`,
                        backgroundColor: C.white,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{ fontSize: '20px' }}>{c.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{r.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: c.bg, color: c.text, fontSize: '11px', fontWeight: 600 }}>
                              {TEMPLATE_COLORS[r.template_key]?.icon || ''} {r.meta?.template_name || r.template_key}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.textLight }}>
                              <IconClock /> {fmtDate(r.created_at)}
                            </span>
                            {r.content && (
                              <span style={{ fontSize: '12px', color: C.textLight }}>
                                {r.content.length} разд.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => viewReport(r.id)}
                          style={{
                            ...btnOutline,
                            color: C.primary,
                            borderColor: '#bfdbfe',
                          }}
                        >
                          <IconEye /> Открыть
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          style={{
                            ...btnOutline,
                            color: C.error,
                            borderColor: '#fecaca',
                          }}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
