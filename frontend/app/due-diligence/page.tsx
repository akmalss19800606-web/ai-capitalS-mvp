'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { ddScoring, decisions, companyLookup, ddDocuments } from '@/lib/api';
import {
  CompanyProfileCard,
  DueDiligenceLayout,
  ScoreBadge,
  RiskBadge,
  FinancialHighlights,
} from '@/components/dd';
import type { DDTab } from '@/components/dd';

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
  purple: '#8b5cf6',
  purpleLight: '#f5f3ff',
  cyan: '#06b6d4',
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
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconClipboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
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
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconEmpty = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconFlag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const IconTrend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
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

function EmptyState({ text = 'Введите параметры и запустите DD-скоринг' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '14px' }}>
      <IconEmpty />
      <span style={{ color: C.textMuted, fontSize: '14px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 14px 0' }}>{children}</h3>
  );
}


// ─── Types ──────────────────────────────────────────────────────────────────
interface CategoryDetail {
  category: string; subcategory: string; score: number;
  weight: number; findings: string; recommendation: string;
}
interface ChecklistItem {
  id: string; category: string; item: string;
  status: string; priority: string; note: string | null;
}
interface BenchmarkItem {
  benchmark_name: string; benchmark_score: number;
  delta: number; percentile: number;
}
interface RedFlagItem { flag: string; severity: string; description: string; }

interface DDResult {
  id: number;
  decision_id?: number;
  company_name: string;
  industry?: string;
  geography?: string;
  total_score: number;
  risk_level: string;
  financial_score: number;
  legal_score: number;
  operational_score: number;
  market_score: number;
  management_score: number;
  esg_score: number;
  category_details: CategoryDetail[];
  checklist: ChecklistItem[];
  checklist_completion_pct: number;
  benchmarks: BenchmarkItem[];
  red_flags: RedFlagItem[];
  recommendation: string;
  created_at: string;
}

interface Decision { id: number; title: string; }

// ─── Industries List ────────────────────────────────────────────────────────
const INDUSTRIES = [
  'Оптовая торговля продовольствием',
  'Строительство и недвижимость',
  'Производство и переработка',
  'Транспорт и логистика',
  'IT и технологии',
  'Сельское хозяйство',
  'Финансы и банкинг',
  'Розничная торговля',
  'Туризм и гостиничный бизнес',
  'Образование',
];

const GEOGRAPHIES = [
  'Узбекистан', 'Казахстан', 'Кыргызстан', 'Таджикистан',
  'Туркменистан', 'Россия', 'Турция', 'ОАЭ', 'Сингапур', 'США',
];

// ─── Radar Colors ───────────────────────────────────────────────────────────
const RADAR_FILL = '#3b82f6';
const RADAR_STROKE = '#2563eb';

// ─── Category Colors ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'Финансы': '#3b82f6',
  'Юридические': '#8b5cf6',
  'Операционные': '#06b6d4',
  'Рыночные': '#22c55e',
  'Управление': '#f59e0b',
  'ESG': '#ec4899',
};

// ─── Tabs ───────────────────────────────────────────────────────────────────
const TABS = ['Обзор', 'Чеклист', 'Бенчмарки', 'Детализация'] as const;
type Tab = typeof TABS[number];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function DueDiligencePage() {
  // ─── State ────────────────────────────────────────────────────────────
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [geography, setGeography] = useState('Узбекистан');
  const [decisionId, setDecisionId] = useState<number | ''>('');
  const [revenueMln, setRevenueMln] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [debtToEquity, setDebtToEquity] = useState('');
  const [yearsInBiz, setYearsInBiz] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DDResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Обзор');
  const [checklistFilter, setChecklistFilter] = useState<string>('all');
    const [innQuery, setInnQuery] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
    const [directorName, setDirectorName] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [authorizedCapital, setAuthorizedCapital] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [licenseCount, setLicenseCount] = useState('');

  // ─── Load Decisions ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await decisions.list();
      const items = Array.isArray(res) ? res : (res?.items || []);
      setDecisionsList(items.map((d: Record<string, unknown>) => ({ id: d.id, title: d.title })));
    } catch (e: unknown) {
      console.error('Load decisions error:', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  
    // ─── Company Lookup by INN ────────────────────────────────────────────────
  const handleCompanyLookup = async () => {
    if (!innQuery.trim()) return;
    setLookupLoading(true);
    try {
            const results = await companyLookup.search(innQuery.trim());
        const items = Array.isArray(results) ? results : (results?.items || [results]);
        const company = items[0];
        if (!company) { setError('Компания не найдена'); return; }
        let detail = company;
        try { detail = await companyLookup.get(innQuery.trim()); } catch {}
        setLookupResult(detail);
        if (detail?.name) setCompanyName(detail.name);
        if (detail?.oked || detail?.industry) setIndustry(detail.oked || detail.industry);
        if (detail?.address || detail?.region) setGeography(detail.address || detail.region);
        if (detail?.employee_count) setEmployeeCount(String(detail.employee_count));
              if (detail?.director) setDirectorName(detail.director);
      if (detail?.legalform) setLegalForm(detail.legalform);
      if (detail?.authorizedcapital) setAuthorizedCapital(String(detail.authorizedcapital));
      if (detail?.foundedyear) setFoundedYear(String(detail.foundedyear));
    } catch (e: any) {
      setError(e.message || 'Ошибка поиска компании');
    } finally {
      setLookupLoading(false);
    }
  };

  // ─── Document Upload ────────────────────────────────────────────────────
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setError(null);
    try {
      const res = await ddDocuments.upload(innQuery || companyName, file);
      setUploadedDocs(prev => [...prev, res]);
      if (res?.extracteddata) {
        const ed = res.extracteddata;
        if (ed.revenue_mln) setRevenueMln(String(ed.revenue_mln));
        if (ed.profit_margin_pct) setProfitMargin(String(ed.profit_margin_pct));
        if (ed.debt_to_equity) setDebtToEquity(String(ed.debt_to_equity));
        if (ed.employee_count) setEmployeeCount(String(ed.employee_count));
        if (ed.authorized_capital) setAuthorizedCapital(String(ed.authorized_capital));
        if (ed.founded_year) setFoundedYear(String(ed.founded_year));
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки документа');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };
  // ─── Run Scoring ──────────────────────────────────────────────────────
  const runScoring = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        company_name: companyName.trim(),
        geography,
      };
      if (industry) payload.industry = industry;
      if (decisionId) payload.decision_id = Number(decisionId);
      if (revenueMln) payload.revenue_mln = Number(revenueMln);
      if (profitMargin) payload.profit_margin_pct = Number(profitMargin);
      if (debtToEquity) payload.debt_to_equity = Number(debtToEquity);
      if (yearsInBiz) payload.years_in_business = Number(yearsInBiz);
      if (employeeCount) payload.employee_count = Number(employeeCount);
            if (directorName) payload.director_name = directorName;
      if (legalForm) payload.legal_form = legalForm;
      if (authorizedCapital) payload.authorized_capital = Number(authorizedCapital);
      if (foundedYear) payload.founded_year = Number(foundedYear);
      if (licenseCount) payload.license_count = Number(licenseCount);

      const res = await ddScoring.run(payload);
      setResult(res);
      setActiveTab('Обзор');
    } catch (e: unknown) {
            setError((e as any).message || 'Ошибка при DD-скоринге');
    } finally {
      setLoading(false);
    }
  };

  // ─── Checklist Update ─────────────────────────────────────────────────
  const handleChecklistUpdate = async (itemId: string, newStatus: string) => {
    if (!result) return;
    try {
      const updated = await ddScoring.updateChecklist(result.id, {
        item_id: itemId,
        status: newStatus,
      });
      setResult(updated);
    } catch (e: unknown) {
            setError((e as any).message || 'Ошибка обновления чеклиста');
    }
  };

  // ─── Radar Data ───────────────────────────────────────────────────────
  const radarData = result ? [
    { category: 'Финансы', score: result.financial_score, fullMark: 100 },
    { category: 'Юридические', score: result.legal_score, fullMark: 100 },
    { category: 'Операционные', score: result.operational_score, fullMark: 100 },
    { category: 'Рыночные', score: result.market_score, fullMark: 100 },
    { category: 'Управление', score: result.management_score, fullMark: 100 },
    { category: 'ESG', score: result.esg_score, fullMark: 100 },
  ] : [];

  // ─── Score Cards ──────────────────────────────────────────────────────
  const scoreCards = result ? [
    { label: 'Финансы', score: result.financial_score, color: CATEGORY_COLORS['Финансы'] },
    { label: 'Юридические', score: result.legal_score, color: CATEGORY_COLORS['Юридические'] },
    { label: 'Операционные', score: result.operational_score, color: CATEGORY_COLORS['Операционные'] },
    { label: 'Рыночные', score: result.market_score, color: CATEGORY_COLORS['Рыночные'] },
    { label: 'Управление', score: result.management_score, color: CATEGORY_COLORS['Управление'] },
    { label: 'ESG', score: result.esg_score, color: CATEGORY_COLORS['ESG'] },
  ] : [];

  // ─── Filtered Checklist ───────────────────────────────────────────────
  const filteredChecklist = (result?.checklist || []).filter(item => {
    if (checklistFilter === 'all') return true;
    if (checklistFilter === 'pending') return item.status === 'pending';
    if (checklistFilter === 'done') return item.status === 'passed' || item.status === 'failed' || item.status === 'na';
    return item.category === checklistFilter;
  });

  const checklistCategories = [...new Set((result?.checklist || []).map(i => i.category))];

  // ─── Benchmark bar chart data ─────────────────────────────────────────
  const benchData = (result?.benchmarks || []).map(b => ({
    name: b.benchmark_name.length > 28 ? b.benchmark_name.slice(0, 25) + '...' : b.benchmark_name,
    fullName: b.benchmark_name,
    delta: b.delta,
    benchmark: b.benchmark_score,
    percentile: b.percentile,
    color: b.delta >= 0 ? C.success : b.delta < -5 ? C.error : C.warning,
  }));

    const ddIndicators = [
          { icon: '\ud83d\udcca', label: 'Score', value: result ? result.total_score?.toFixed(1) ?? '---' : '---' },
              { icon: 'F', label: 'Flags', value: result ? String(result.red_flags?.length ?? 0) : '---' },
                  { icon: 'C', label: 'Checklist', value: result ? `${result.checklist_completion_pct?.toFixed(0) ?? 0}%` : '---' },
                      { icon: 'R', label: 'Risk', value: result ? (result.risk_level ?? '---') : '---' },
                        ];

                          // Build sidebar & scoreHeader for DueDiligenceLayout
  const scoreHeader = result ? (
    <div style={{ ...card, borderLeft: `4px solid ${result.risk_level === 'low' ? C.success : result.risk_level === 'medium' ? C.warning : C.error}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{result.company_name}</div>
          <div style={{ fontSize: '13px', color: C.textMuted }}>
            {result.industry && <span>{result.industry} &middot; </span>}
            {result.geography}
            {result.decision_id && <span> &middot; Решение #{result.decision_id}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ScoreBadge score={result.total_score} />
          <RiskBadge level={result.risk_level} />
        </div>
      </div>
    </div>
  ) : undefined;
  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
          <DueDiligenceLayout
        sidebar={
                    <>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <SectionTitle>Параметры скоринга</SectionTitle>

                            <div style={{ padding: '12px', backgroundColor: C.primaryLight, borderRadius: '8px', marginBottom: '12px' }}>
                <label style={labelStyle}>Поиск по ИНН / названию</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    style={inputStyle}
                    value={innQuery}
                    onChange={e => setInnQuery(e.target.value)}
                    placeholder="Введите ИНН или название"
                  />
                  <button
                    onClick={handleCompanyLookup}
                    disabled={lookupLoading || !innQuery.trim()}
                    style={{ ...btnPrimary, whiteSpace: 'nowrap', opacity: lookupLoading || !innQuery.trim() ? 0.6 : 1 }}
                  >
                    {lookupLoading ? <IconSpinner /> : <IconSearch />} Найти
                  </button>
                </div>
                {lookupResult && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: C.success }}>
                    ✅ Найдено: {lookupResult.name} {lookupResult.inn && `(ИНН: ${lookupResult.inn})`}
                  </div>
                )}
                            {lookupResult && (
              <div style={{ marginTop: 12 }}>
                <CompanyProfileCard data={lookupResult} onClose={() => setLookupResult(null)} />
              </div>
            )}
              </div>
              <div>
                <label style={labelStyle}>Название компании *</label>
                <input
                  style={inputStyle}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Например: ООО «Агро Плюс»"
                />
              </div>

              <div>
                <label style={labelStyle}>Отрасль</label>
                <select style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)}>
                  <option value="">Не указана</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>География</label>
                <select style={inputStyle} value={geography} onChange={e => setGeography(e.target.value)}>
                  {GEOGRAPHIES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Привязка к решению</label>
                <select style={inputStyle} value={decisionId} onChange={e => setDecisionId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Нет привязки</option>
                  {decisionsList.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              {/* Optional financials */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Финансовые показатели (опционально)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Выручка (млн)</label>
                    <input style={inputStyle} type="number" value={revenueMln} onChange={e => setRevenueMln(e.target.value)} placeholder="100" />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Маржа (%)</label>
                    <input style={inputStyle} type="number" value={profitMargin} onChange={e => setProfitMargin(e.target.value)} placeholder="15" />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>D/E</label>
                    <input style={inputStyle} type="number" step="0.1" value={debtToEquity} onChange={e => setDebtToEquity(e.target.value)} placeholder="1.5" />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Лет в бизнесе</label>
                    <input style={inputStyle} type="number" value={yearsInBiz} onChange={e => setYearsInBiz(e.target.value)} placeholder="5" />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Сотрудников</label>
                    <input style={inputStyle} type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} placeholder="50" />
                  </div>
                </div>

                            {/* Company Details */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Данные компании</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>Директор</label>
                  <input style={inputStyle} value={directorName} onChange={e => setDirectorName(e.target.value)} placeholder="ФИО руководителя" />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>ОПФ</label>
                  <select style={inputStyle} value={legalForm} onChange={e => setLegalForm(e.target.value)}>
                    <option value="">Не указана</option>
                    <option value="ООО">ООО</option>
                    <option value="АО">АО</option>
                    <option value="ИП">ИП</option>
                    <option value="ГУП">ГУП</option>
                    <option value="Фермерское хозяйство">Фермерское хозяйство</option>
                    <option value="СЧЗ">СЧЗ</option>
                    <option value="Другое">Другое</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Год основания</label>
                    <input style={inputStyle} type="number" min={1900} max={2026} value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2010" />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Уставной капитал</label>
                    <input style={inputStyle} type="number" min={0} value={authorizedCapital} onChange={e => setAuthorizedCapital(e.target.value)} placeholder="100" />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>Лицензии</label>
                  <input style={inputStyle} type="number" min={0} value={licenseCount} onChange={e => setLicenseCount(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>
              </div>

              <button
                style={{ ...btnPrimary, opacity: !companyName.trim() || loading ? 0.6 : 1, justifyContent: 'center', backgroundColor: C.purple }}
                onClick={runScoring}
                disabled={!companyName.trim() || loading}
              >
                {loading ? <IconSpinner /> : <IconSearch />}
                {loading ? 'Анализ...' : 'Запустить DD-скоринг'}
              </button>

                            {/* ─── DD Document Upload ─── */}
              <div style={{ marginTop: '16px', padding: '12px', border: `1px dashed ${C.border}`, borderRadius: '8px' }}>
                <label style={labelStyle}>Загрузка DD-документа</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                  onChange={handleDocUpload}
                  disabled={uploadingDoc}
                  style={{ fontSize: '13px', color: C.textMuted }}
                />
                {uploadingDoc && <div style={{ marginTop: '6px', fontSize: '12px', color: C.primary }}><IconSpinner /> Анализ документа...</div>}
                {uploadedDocs.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    {uploadedDocs.map((doc, i) => (
                      <div key={i} style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: C.successLight, borderRadius: '4px', marginBottom: '4px', color: C.success }}>
                        ✅ {doc.filename || `Документ ${i + 1}`} — {doc.risk_indicators?.length || 0} рисков
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
                      </>
        }
        scoreHeader={scoreHeader}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResult={!!result}
        loading={loading || loadingData}
        error={error}
        loadingText={loadingData ? 'Загрузка данных...' : 'Выполняется DD-скоринг...'}
            >
                      {result && (
                <>
                  {activeTab === 'Обзор' && (
                    <>
                      {/* Score Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {scoreCards.map(sc => (
                          <div key={sc.label} style={{ ...card, textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                              {sc.label}
                            </div>
                            <div style={{ fontSize: '26px', fontWeight: 700, color: sc.score >= 75 ? C.success : sc.score >= 55 ? sc.color : C.error }}>
                              {sc.score.toFixed(1)}
                            </div>
                            <div style={{ width: '100%', height: '4px', backgroundColor: C.border, borderRadius: '2px', marginTop: '8px' }}>
                              <div style={{ width: `${Math.min(100, sc.score)}%`, height: '100%', backgroundColor: sc.score >= 75 ? C.success : sc.score >= 55 ? sc.color : C.error, borderRadius: '2px', transition: 'width 0.4s' }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Radar + Red Flags side by side */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {/* Radar */}
                        <div style={card}>
                          <SectionTitle>Радарная диаграмма</SectionTitle>
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                              <PolarGrid stroke={C.border} />
                              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: C.text }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: C.textLight }} />
                              <Radar
                                name="Скоринг"
                                dataKey="score"
                                stroke={RADAR_STROKE}
                                fill={RADAR_FILL}
                                fillOpacity={0.25}
                                strokeWidth={2}
                              />
                              <Tooltip
                                              content={({ active, payload }: any) => {
                                  if (!active || !payload?.length) return null;
                                  const d = payload[0]?.payload;
                                  return (
                                    <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 12px', boxShadow: C.cardShadow, fontSize: '13px' }}>
                                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{d?.category}</div>
                                      <div style={{ color: C.primary, fontWeight: 600 }}>{d?.score?.toFixed(1)} / 100</div>
                                    </div>
                                  );
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Red Flags + Recommendation */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {/* Red Flags */}
                          {(result.red_flags || []).length > 0 && (
                            <div style={card}>
                              <SectionTitle>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <IconFlag /> Красные флаги ({result.red_flags.length})
                                </span>
                              </SectionTitle>
                              <div className="flex flex-col gap-2">
                                {result.red_flags.map((f, i) => {
                                  const sevColor = f.severity === 'critical' ? C.error : f.severity === 'high' ? '#ea580c' : C.warning;
                                  const sevBg = f.severity === 'critical' ? C.errorLight : f.severity === 'high' ? '#fff7ed' : C.warningLight;
                                  const sevLabel = f.severity === 'critical' ? 'КРИТ.' : f.severity === 'high' ? 'ВЫСОК.' : 'СРЕДН.';
                                  return (
                                    <div key={i} style={{ backgroundColor: sevBg, borderRadius: '8px', padding: '10px 14px', borderLeft: `3px solid ${sevColor}` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: sevColor, backgroundColor: C.white, padding: '2px 6px', borderRadius: '4px' }}>{sevLabel}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{f.flag}</span>
                                      </div>
                                      <div style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>{f.description}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Recommendation */}
                          <div style={{ ...card, backgroundColor: C.primaryLight, borderLeft: `4px solid ${C.primary}` }}>
                            <SectionTitle>Рекомендация</SectionTitle>
                            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: C.text }}>{result.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─── TAB: Чеклист ────────────────────────────── */}
                  {activeTab === 'Чеклист' && (
                    <div style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <SectionTitle>
                          Чеклист DD ({result.checklist_completion_pct?.toFixed(0)}% завершено)
                        </SectionTitle>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {['all', 'pending', 'done', ...checklistCategories].map(f => (
                            <button
                              key={f}
                              onClick={() => setChecklistFilter(f)}
                              style={{
                                padding: '5px 10px', border: 'none', borderRadius: '6px',
                                cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                                backgroundColor: checklistFilter === f ? C.primary : C.bg,
                                color: checklistFilter === f ? C.white : C.textMuted,
                                transition: 'all 0.15s',
                              }}
                            >
                              {f === 'all' ? 'Все' : f === 'pending' ? 'Ожидают' : f === 'done' ? 'Завершены' : f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ width: '100%', height: '6px', backgroundColor: C.border, borderRadius: '3px', marginBottom: '16px' }}>
                        <div style={{
                          width: `${result.checklist_completion_pct || 0}%`,
                          height: '100%',
                          backgroundColor: (result.checklist_completion_pct || 0) >= 80 ? C.success : (result.checklist_completion_pct || 0) >= 50 ? C.warning : C.primary,
                          borderRadius: '3px',
                          transition: 'width 0.3s',
                        }} />
                      </div>

                      {/* Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filteredChecklist.map(item => {
                          const statusColors: Record<string, { bg: string; border: string }> = {
                            pending: { bg: C.bg, border: C.border },
                            passed: { bg: C.successLight, border: '#bbf7d0' },
                            failed: { bg: C.errorLight, border: '#fecaca' },
                            na: { bg: '#f1f5f9', border: C.border },
                          };
                          const sc = statusColors[item.status] || statusColors.pending;
                          const prioColor = item.priority === 'critical' ? C.error : item.priority === 'high' ? '#ea580c' : item.priority === 'medium' ? C.warning : C.textLight;

                          return (
                            <div key={item.id} style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              backgroundColor: sc.bg, border: `1px solid ${sc.border}`,
                              borderRadius: '8px', padding: '10px 14px',
                              transition: 'all 0.15s',
                            }}>
                              {/* Status indicator */}
                              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                                <button
                                  onClick={() => handleChecklistUpdate(item.id, item.status === 'passed' ? 'pending' : 'passed')}
                                  title="Пройден"
                                  style={{
                                    width: '26px', height: '26px', borderRadius: '6px', border: `1.5px solid ${item.status === 'passed' ? C.success : C.border}`,
                                    backgroundColor: item.status === 'passed' ? C.successLight : C.white,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  {item.status === 'passed' && <IconCheck />}
                                </button>
                                <button
                                  onClick={() => handleChecklistUpdate(item.id, item.status === 'failed' ? 'pending' : 'failed')}
                                  title="Не пройден"
                                  style={{
                                    width: '26px', height: '26px', borderRadius: '6px', border: `1.5px solid ${item.status === 'failed' ? C.error : C.border}`,
                                    backgroundColor: item.status === 'failed' ? C.errorLight : C.white,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  {item.status === 'failed' && <IconX />}
                                </button>
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{item.item}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                  <span style={{ fontSize: '11px', color: C.textLight }}>{item.category}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: prioColor, backgroundColor: C.white, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${prioColor}20` }}>
                                    {item.priority === 'critical' ? 'КРИТ' : item.priority === 'high' ? 'ВЫСОК' : item.priority === 'medium' ? 'СРЕДН' : 'НИЗК'}
                                  </span>
                                </div>
                              </div>

                              {/* N/A button */}
                              <button
                                onClick={() => handleChecklistUpdate(item.id, item.status === 'na' ? 'pending' : 'na')}
                                title="Неприменимо"
                                style={{
                                  padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                  border: `1px solid ${item.status === 'na' ? C.textMuted : C.border}`,
                                  backgroundColor: item.status === 'na' ? '#e2e8f0' : C.white,
                                  color: item.status === 'na' ? C.text : C.textLight,
                                  cursor: 'pointer',
                                }}
                              >
                                N/A
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─── TAB: Бенчмарки ──────────────────────────── */}
                  {activeTab === 'Бенчмарки' && (
                    <>
                      {/* Delta bar chart */}
                      <div style={card}>
                        <SectionTitle>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <IconTrend /> Отклонение от бенчмарков
                          </span>
                        </SectionTitle>
                        <ResponsiveContainer width="100%" height={Math.max(200, benchData.length * 50)}>
                          <BarChart
                            data={benchData}
                            layout="vertical"
                            margin={{ top: 4, right: 40, left: 160, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: C.textMuted }} unit="" />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.text }} width={155} />
                            <Tooltip
                                            content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0]?.payload;
                                return (
                                  <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px', boxShadow: C.cardShadow, fontSize: '13px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{d?.fullName}</div>
                                    <div style={{ color: C.textMuted }}>Бенчмарк: {d?.benchmark}</div>
                                    <div style={{ color: d?.delta >= 0 ? C.success : C.error, fontWeight: 600 }}>
                                      Дельта: {d?.delta > 0 ? '+' : ''}{d?.delta?.toFixed(1)}
                                    </div>
                                    <div style={{ color: C.textMuted }}>Перцентиль: {d?.percentile}%</div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="delta" name="Дельта" radius={[0, 4, 4, 0]}>
                              {benchData.map((entry, index) => (
                                <Cell key={`bench-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Benchmarks Table */}
                      <div style={card}>
                        <SectionTitle>Таблица бенчмарков</SectionTitle>
                        <div className="overflow-x-auto">
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr>
                                {['Категория', 'Бенчмарк', 'Дельта', 'Перцентиль'].map(h => (
                                  <th key={h} style={{
                                    textAlign: h === 'Категория' ? 'left' : 'right',
                                    padding: '10px 12px',
                                    borderBottom: `2px solid ${C.border}`,
                                    color: C.textMuted, fontWeight: 600, fontSize: '12px',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(result.benchmarks || []).map((b, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? C.bg : C.white }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 500, color: C.text }}>{b.benchmark_name}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textMuted }}>{b.benchmark_score}</td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: b.delta >= 0 ? C.success : C.error }}>
                                    {b.delta > 0 ? '+' : ''}{b.delta.toFixed(1)}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                      backgroundColor: b.percentile >= 60 ? C.successLight : b.percentile >= 40 ? C.warningLight : C.errorLight,
                                      color: b.percentile >= 60 ? C.success : b.percentile >= 40 ? C.warning : C.error,
                                    }}>
                                      {b.percentile}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─── TAB: Детализация ────────────────────────── */}
                  {activeTab === 'Детализация' && (
                    <div className="flex flex-col gap-4">
                      {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                        const items = (result.category_details || []).filter(d => d.category === cat);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat} style={{ ...card, borderTop: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: 0 }}>{cat}</h3>
                              <ScoreBadge score={
                                cat === 'Финансы' ? result.financial_score :
                                cat === 'Юридические' ? result.legal_score :
                                cat === 'Операционные' ? result.operational_score :
                                cat === 'Рыночные' ? result.market_score :
                                cat === 'Управление' ? result.management_score :
                                result.esg_score
                              } />
                            </div>
                            <div className="flex flex-col gap-2">
                              {items.map((d, idx) => (
                                <div key={idx} style={{ backgroundColor: C.bg, borderRadius: '8px', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{d.subcategory}</span>
                                    <div className="flex items-center gap-2">
                                      <span style={{ fontSize: '11px', color: C.textLight }}>Вес: {(d.weight * 100).toFixed(0)}%</span>
                                      <span style={{
                                        fontSize: '13px', fontWeight: 700,
                                        color: d.score >= 75 ? C.success : d.score >= 55 ? C.warning : C.error,
                                      }}>
                                        {d.score.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ width: '100%', height: '4px', backgroundColor: C.border, borderRadius: '2px', marginBottom: '6px' }}>
                                    <div style={{
                                      width: `${Math.min(100, d.score)}%`,
                                      height: '100%',
                                      backgroundColor: d.score >= 75 ? C.success : d.score >= 55 ? color : C.error,
                                      borderRadius: '2px',
                                    }} />
                                  </div>
                                  <div style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>
                                    {d.findings}
                                  </div>
                                  <div style={{ fontSize: '12px', color: d.score >= 60 ? C.success : C.warning, marginTop: '4px', fontStyle: 'italic' }}>
                                    {d.recommendation}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                          </>
        )}
                        </DueDiligenceLayout>
  );
}
