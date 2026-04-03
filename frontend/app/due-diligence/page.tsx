'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { ddScoring, decisions, companyLookup, ddDocuments } from '@/lib/api';
import { EmptyState as EmptyStateUI } from '@/components/ui/EmptyState';
import { LoadingCard } from '@/components/ui/LoadingCard';
import {
  CompanyProfileCard,
  ExternalSourcesPanel,
  DueDiligenceLayout,
  ScoreBadge,
  RiskBadge,
  FinancialHighlights,
} from '@/components/dd';
import type { DDTab } from '@/components/dd';

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

const card: React.CSSProperties = {
  backgroundColor: C.white, borderRadius: '12px', boxShadow: C.cardShadow, padding: '20px',
};
const btnPrimary: React.CSSProperties = {
  backgroundColor: C.primary, color: C.white, borderRadius: '8px', border: 'none', cursor: 'pointer',
  padding: '10px 20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.15s',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: '8px',
  fontSize: '14px', color: C.text, backgroundColor: C.white, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: C.textMuted, marginBottom: '6px',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const IconSearch = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const IconSpinner = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M12 2 a10 10 0 0 1 10 10" opacity="1" /><path d="M22 12 a10 10 0 0 1-10 10" opacity="0.4" /><path d="M12 22 a10 10 0 0 1-10-10" opacity="0.2" /><path d="M2 12 a10 10 0 0 1 10-10" opacity="0.1" /><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" /></svg>);
const IconAlert = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>);
const IconCheck = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const IconX = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const IconFlag = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>);
const IconTrend = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>);
const IconEmpty = () => (<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>);
const IconClipboard = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>);

function LoadingState() { return <LoadingCard rows={4} />; }
function ErrorState({ message }: { message: string }) {
  return (<div style={{ ...card, backgroundColor: C.errorLight, border: '1px solid #fecaca', display: 'flex', alignItems: 'flex-start', gap: '10px' }}><IconAlert /><div><div style={{ fontWeight: 600, color: C.error, fontSize: '14px', marginBottom: '4px' }}>Ошибка</div><div style={{ color: '#b91c1c', fontSize: '13px', lineHeight: 1.5 }}>{message}</div></div></div>);
}
function EmptyState({ text = 'Введите параметры и запустите DD-скоринг' }: { text?: string }) { return <EmptyStateUI title={text} />; }
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.text, margin: '0 0 14px 0' }}>{children}</h3>;
}

interface CategoryDetail { category: string; subcategory: string; score: number; weight: number; findings: string; recommendation: string; }
interface ChecklistItem { id: string; category: string; item: string; status: string; priority: string; note: string | null; }
interface BenchmarkItem { benchmark_name: string; benchmark_score: number; delta: number; percentile: number; }
interface RedFlagItem { flag: string; severity: string; description: string; }
interface DDResult {
  id: number; decision_id?: number; company_name: string; industry?: string; geography?: string;
  total_score: number; risk_level: string; financial_score: number; operational_score: number;
  compliance_score: number; management_score: number; market_score: number;
  checklist: ChecklistItem[]; category_details: CategoryDetail[]; benchmarks: BenchmarkItem[];
  red_flags: RedFlagItem[]; recommendations: string[]; executive_summary: string;
  created_at: string; decision?: { id: number; title: string; status: string };
}
type Tab = 'Обзор' | 'Категории' | 'Чеклист' | 'Бенчмарки' | 'Риски';

const RISK_COLORS: Record<string, string> = {
  low: C.success, medium: C.warning, high: C.error, critical: '#7f1d1d',
};
const RISK_LABELS: Record<string, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический',
};

const SCORE_CATEGORIES = [
  { key: 'financial_score', label: 'Финансовый', color: C.primary },
  { key: 'operational_score', label: 'Операционный', color: C.cyan },
  { key: 'compliance_score', label: 'Комплайенс', color: C.purple },
  { key: 'management_score', label: 'Менеджмент', color: C.warning },
  { key: 'market_score', label: 'Рынок', color: C.success },
];

const INDUSTRIES = [
  'Сельское хозяйство', 'Текстильная промышленность', 'Химическая промышленность', 'Металлургия',
  'Строительство', 'Торговля', 'Финансы и банкинг', 'Информационные технологии',
  'Телекоммуникации', 'Транспорт и логистика', 'Здравоохранение', 'Образование',
  'Недвижимость', 'Энергетика', 'Туризм', 'Гостиницы и рестораны', 'Другое',
];
const GEOGRAPHIES = ['Узбекистан', 'Ташкент', 'Самарканд', 'Бухара', 'Андижан', 'Наманган', 'Фергана', 'Нукус', 'Каракалпакская обл.', 'Хорезмская обл.', 'Джизакская обл.', 'Кашкадарьянская обл.', 'Навоийская обл.', 'Сурхандарьинская обл.', 'Сырдарьинская обл.', 'Ташкентская обл.'];

export default function DueDiligencePage() {
  const [decisionsList, setDecisionsList] = useState<{ id: number; title: string }[]>([]);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [directorName, setDirectorName] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [authorizedCapital, setAuthorizedCapital] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [licenseCount, setLicenseCount] = useState('');
  const [licensesInfo, setLicensesInfo] = useState('');
  const [servicingBank, setServicingBank] = useState('');
  const [keyCounterparties, setKeyCounterparties] = useState('');

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await decisions.list();
      const items = Array.isArray(res) ? res : (res?.items || []);
      setDecisionsList(items.map((d: Record<string, unknown>) => ({ id: d.id, title: d.title })));
    } catch (e: unknown) { console.error('Load decisions error:', e); }
    finally { setLoadingData(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

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
      if (detail?.charter_fund) setAuthorizedCapital(String(detail.charter_fund));
      if (detail?.foundedyear) setFoundedYear(String(detail.foundedyear));
      if (detail?.founded_year) setFoundedYear(String(detail.founded_year));
      if (detail?.servicing_bank) setServicingBank(detail.servicing_bank);
    } catch (e: any) {
      setError(e.message || 'Ошибка поиска компании');
    } finally { setLookupLoading(false); }
  };

  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/png', 'image/jpeg'];
  const ALLOWED_EXT = ['.pdf', '.xlsx', '.xls', '.docx', '.doc', '.png', '.jpg', '.jpeg'];
  const MAX_SIZE = 10 * 1024 * 1024;

  const fileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return '\u{1F4C4}';
    if (['xlsx', 'xls'].includes(ext)) return '\u{1F4CA}';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return '\u{1F5BC}';
    if (['docx', 'doc'].includes(ext)) return '\u{1F4DD}';
    return '\u{1F4CE}';
  };
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  const uploadFile = async (file: File) => {
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXT.includes(ext)) { setError(`Формат ${ext} не поддерживается. Допустимые: ${ALLOWED_EXT.join(', ')}`); return; }
    if (file.size > MAX_SIZE) { setError(`Файл слишком большой (${formatSize(file.size)}). Максимум: 10 МБ`); return; }
    setUploadingDoc(true); setUploadProgress(0); setError(null);
    try {
      const res = await ddDocuments.upload(file, { sessionId: innQuery || companyName || undefined, onProgress: (pct) => setUploadProgress(pct) });
      setUploadedDocs(prev => [...prev, res]);
    } catch (err: any) { setError(err.message || 'Ошибка загрузки документа'); }
    finally { setUploadingDoc(false); setUploadProgress(0); }
  };
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    for (let i = 0; i < files.length; i++) { await uploadFile(files[i]); }
    e.target.value = '';
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) { await uploadFile(files[i]); }
  };
  const handleDeleteDoc = async (docId: string) => {
    try { await ddDocuments.delete(docId); setUploadedDocs(prev => prev.filter(d => d.id !== docId)); }
    catch (err: any) { setError(err.message || 'Ошибка удаления документа'); }
  };

  const runScoring = async () => {
    if (!companyName.trim()) return;
    setLoading(true); setError(null);
    try {
      const payload: any = { company_name: companyName.trim(), geography };
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
      if (licensesInfo) payload.licenses_info = licensesInfo;
      if (servicingBank) payload.servicing_bank = servicingBank;
      if (keyCounterparties) payload.key_counterparties = keyCounterparties;
      const res = await ddScoring.run(payload);
      setResult(res); setActiveTab('Обзор');
    } catch (e: unknown) { setError((e as any).message || 'Ошибка при DD-скоринге'); }
    finally { setLoading(false); }
  };

  const handleChecklistUpdate = async (itemId: string, newStatus: string) => {
    if (!result) return;
    try {
      const updated = await ddScoring.updateChecklist(result.id, { item_id: itemId, status: newStatus });
      if (updated?.checklist) setResult(prev => prev ? { ...prev, checklist: updated.checklist } : prev);
    } catch (e) { console.error('Checklist update error:', e); }
  };

  const filteredChecklist = result?.checklist?.filter(item => {
    if (checklistFilter === 'all') return true;
    if (checklistFilter === 'pending') return item.status === 'pending';
    if (checklistFilter === 'done') return item.status === 'passed' || item.status === 'failed' || item.status === 'na';
    return item.category === checklistFilter;
  }) || [];

  const kpiData = result ? [
    { label: 'Общий скор', value: `${result.total_score}`, status: result.total_score >= 75 ? 'completed' as const : result.total_score >= 50 ? 'in_progress' as const : 'not_started' as const },
    { label: 'Уровень риска', value: RISK_LABELS[result.risk_level] || result.risk_level, status: result.risk_level === 'low' ? 'completed' as const : result.risk_level === 'medium' ? 'in_progress' as const : 'not_started' as const },
    { label: 'Чеклист', value: `${result.checklist?.filter(i => i.status === 'passed').length || 0}/${result.checklist?.length || 0}`, status: 'in_progress' as const },
    { label: 'Ред флаги', value: `${result.red_flags?.length || 0}`, status: (result.red_flags?.length || 0) === 0 ? 'completed' as const : 'not_started' as const },
  ] : [];

  return (
    <DueDiligenceLayout title="Комплексная проверка (Due Diligence)" kpi={kpiData}
      sidebar={
        <>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SectionTitle>Параметры скоринга</SectionTitle>

            {/* INN Search */}
            <div style={{ padding: '12px', backgroundColor: C.primaryLight, borderRadius: '8px', marginBottom: '12px' }}>
              <label style={labelStyle}>Поиск по ИНН / названию</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={inputStyle} value={innQuery} onChange={e => setInnQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCompanyLookup()}
                  placeholder="Введите ИНН или название" />
                <button onClick={handleCompanyLookup} disabled={lookupLoading || !innQuery.trim()}
                  style={{ ...btnPrimary, whiteSpace: 'nowrap', opacity: lookupLoading || !innQuery.trim() ? 0.6 : 1 }}>
                  {lookupLoading ? <IconSpinner /> : <IconSearch />} Найти
                </button>
              </div>
              {/* CompanyProfileCard - shows after search, NO duplicate green text */}
              {lookupResult && (
                <div style={{ marginTop: 12 }}>
                  <CompanyProfileCard data={lookupResult} onClose={() => setLookupResult(null)} />
                  {lookupResult?.inn && (
                    <div style={{ marginTop: 12 }}>
                      <ExternalSourcesPanel inn={lookupResult.inn} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Company name */}
            <div>
              <label style={labelStyle}>Название компании *</label>
              <input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Например: ООО «Агро Плюс»" />
            </div>

            {/* Industry */}
            <div>
              <label style={labelStyle}>Отрасль</label>
              <select style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="">Не указана</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Geography */}
            <div>
              <label style={labelStyle}>География</label>
              <select style={inputStyle} value={geography} onChange={e => setGeography(e.target.value)}>
                {GEOGRAPHIES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Decision link */}
            <div>
              <label style={labelStyle}>Привязка к решению</label>
              <select style={inputStyle} value={decisionId} onChange={e => setDecisionId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Нет привязки</option>
                {decisionsList.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>

            {/* Financials */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Финансовые показатели (опционально)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Выручка (млн)</label><input style={inputStyle} type="number" value={revenueMln} onChange={e => setRevenueMln(e.target.value)} placeholder="100" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Маржа (%)</label><input style={inputStyle} type="number" value={profitMargin} onChange={e => setProfitMargin(e.target.value)} placeholder="15" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Debt/Equity</label><input style={inputStyle} type="number" value={debtToEquity} onChange={e => setDebtToEquity(e.target.value)} placeholder="0.5" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Лет в бизнесе</label><input style={inputStyle} type="number" value={yearsInBiz} onChange={e => setYearsInBiz(e.target.value)} placeholder="5" /></div>
              </div>
            </div>

            {/* Extra company info */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Доп. информация (автозаполняется по ИНН)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Сотрудники</label><input style={inputStyle} type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} placeholder="50" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Директор</label><input style={inputStyle} value={directorName} onChange={e => setDirectorName(e.target.value)} placeholder="ФИО руководителя" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>ОПФ</label><input style={inputStyle} value={legalForm} onChange={e => setLegalForm(e.target.value)} placeholder="ООО, АО, ИП..." /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Уст. капитал (сум)</label><input style={inputStyle} type="number" value={authorizedCapital} onChange={e => setAuthorizedCapital(e.target.value)} placeholder="1000000" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Год основания</label><input style={inputStyle} type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2010" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Лицензий (кол-во)</label><input style={inputStyle} type="number" value={licenseCount} onChange={e => setLicenseCount(e.target.value)} placeholder="3" /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Обслуживающий банк</label><input style={inputStyle} value={servicingBank} onChange={e => setServicingBank(e.target.value)} placeholder="НБУ, ИпотекаБанк..." /></div>
                <div><label style={{ ...labelStyle, fontSize: '11px' }}>Ключ. контрагенты</label><input style={inputStyle} value={keyCounterparties} onChange={e => setKeyCounterparties(e.target.value)} placeholder="Названия партнёров" /></div>
              </div>
            </div>

            {/* Documents upload */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: C.textLight, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Документы</div>
              <div
                onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                style={{ border: `2px dashed ${dragOver ? C.primary : C.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', backgroundColor: dragOver ? C.primaryLight : C.white, transition: 'all 0.2s' }}
                onClick={() => document.getElementById('doc-upload')?.click()}>
                <input id="doc-upload" type="file" multiple accept={ALLOWED_EXT.join(',')} style={{ display: 'none' }} onChange={handleDocUpload} />
                <div style={{ fontSize: '13px', color: C.textMuted }}>
                  {uploadingDoc ? (
                    <><IconSpinner /> Загрузка файла... {uploadProgress}%</>
                  ) : (
                    <>Добавить документы <span style={{ color: C.primary }}>(PDF, DOCX, XLSX)</span></>
                  )}
                </div>
              </div>
              {uploadedDocs.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {uploadedDocs.map((doc, idx) => (
                    <div key={doc.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: C.primaryLight, borderRadius: '6px', fontSize: '13px' }}>
                      <span>{fileIcon(doc.filename || doc.name || 'file')}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>{doc.filename || doc.name}</span>
                      <span style={{ color: C.textLight, flexShrink: 0 }}>{formatSize(doc.size || 0)}</span>
                      <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, padding: '2px 4px', borderRadius: 4 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run button */}
            <button onClick={runScoring} disabled={loading || !companyName.trim()}
              style={{ ...btnPrimary, justifyContent: 'center', opacity: loading || !companyName.trim() ? 0.6 : 1 }}>
              {loading ? <IconSpinner /> : <IconClipboard />}
              {loading ? 'Анализ...' : 'Запустить DD-скоринг'}
            </button>
          </div>
        </>
      }
    >
      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}
      {!loading && !result && !error && <EmptyState />}
      {!loading && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{result.company_name}</div>
                <div style={{ fontSize: '13px', color: C.textMuted }}>
                  {result.industry && <span style={{ marginRight: '12px' }}>Отрасль: {result.industry}</span>}
                  {result.geography && <span>Регион: {result.geography}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ScoreBadge score={result.total_score} />
                <RiskBadge level={result.risk_level} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: `1px solid ${C.border}`, paddingBottom: '0' }}>
            {(['Обзор', 'Категории', 'Чеклист', 'Бенчмарки', 'Риски'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab ? 700 : 500,
                borderBottom: `2px solid ${activeTab === tab ? C.primary : 'transparent'}`,
                color: activeTab === tab ? C.primary : C.textMuted, backgroundColor: 'transparent', transition: 'all 0.15s',
              }}>{tab}</button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'Обзор' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {result.executive_summary && (
                <div style={{ ...card }}>
                  <SectionTitle>Исполнительное резюме</SectionTitle>
                  <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.6, margin: 0 }}>{result.executive_summary}</p>
                </div>
              )}
              <FinancialHighlights result={result} />
              <div style={{ ...card }}>
                <SectionTitle>Оценка по категориям</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={SCORE_CATEGORIES.map(cat => ({ subject: cat.label, score: (result as any)[cat.key] || 0 }))}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: C.textMuted }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Скор" dataKey="score" stroke={C.primary} fill={C.primary} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {result.recommendations && result.recommendations.length > 0 && (
                <div style={{ ...card }}>
                  <SectionTitle>Рекомендации</SectionTitle>
                  <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.recommendations.map((r, i) => (
                      <li key={i} style={{ fontSize: '13px', color: C.textMuted, lineHeight: 1.5 }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Категории' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SCORE_CATEGORIES.map(({ key, label, color }) => {
                const score = (result as any)[key] || 0;
                const details = result.category_details?.filter(d => d.category === label) || [];
                return (
                  <div key={key} style={{ ...card }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <SectionTitle>{label}</SectionTitle>
                      <ScoreBadge score={score} />
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: C.border, borderRadius: '3px', marginBottom: '12px' }}>
                      <div style={{ width: `${score}%`, height: '100%', backgroundColor: score >= 75 ? C.success : score >= 55 ? color : C.error, borderRadius: '3px', transition: 'width 0.5s' }} />
                    </div>
                    {details.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {details.map((d, i) => (
                          <div key={i} style={{ padding: '10px 12px', backgroundColor: C.bg, borderRadius: '8px', borderLeft: `3px solid ${d.score >= 75 ? C.success : d.score >= 55 ? color : C.error}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{d.subcategory}</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: d.score >= 75 ? C.success : d.score >= 55 ? color : C.error }}>{d.score}</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', backgroundColor: C.border, borderRadius: '2px', marginBottom: '6px' }}>
                              <div style={{ width: `${Math.min(100, d.score)}%`, height: '100%', backgroundColor: d.score >= 75 ? C.success : d.score >= 55 ? color : C.error, borderRadius: '2px' }} />
                            </div>
                            <div style={{ fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>{d.findings}</div>
                            <div style={{ fontSize: '12px', color: d.score >= 60 ? C.success : C.warning, marginTop: '4px', fontStyle: 'italic' }}>{d.recommendation}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'Чеклист' && (
            <div style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <SectionTitle>Чеклист проверки</SectionTitle>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['Все', 'В ожидании', 'Выполнено'].map((f, i) => {
                    const val = ['all', 'pending', 'done'][i];
                    return (
                      <button key={f} onClick={() => setChecklistFilter(val)}
                        style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${checklistFilter === val ? C.primary : C.border}`, backgroundColor: checklistFilter === val ? C.primaryLight : C.white, color: checklistFilter === val ? C.primary : C.textMuted, fontSize: '12px', cursor: 'pointer' }}>
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredChecklist.map(item => {
                  const statusColors: Record<string, { bg: string; border: string }> = {
                    passed: { bg: C.successLight, border: '#bbf7d0' },
                    failed: { bg: C.errorLight, border: '#fecaca' },
                    na: { bg: '#f1f5f9', border: C.border },
                    pending: { bg: C.white, border: C.border },
                  };
                  const sc = statusColors[item.status] || statusColors.pending;
                  return (
                    <div key={item.id} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${sc.border}`, backgroundColor: sc.bg, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => handleChecklistUpdate(item.id, item.status === 'passed' ? 'pending' : 'passed')}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: `1.5px solid ${item.status === 'passed' ? C.success : C.border}`, backgroundColor: item.status === 'passed' ? C.successLight : C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.status === 'passed' && <IconCheck />}
                        </button>
                        <button onClick={() => handleChecklistUpdate(item.id, item.status === 'failed' ? 'pending' : 'failed')}
                          style={{ width: '26px', height: '26px', borderRadius: '6px', border: `1.5px solid ${item.status === 'failed' ? C.error : C.border}`, backgroundColor: item.status === 'failed' ? C.errorLight : C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.status === 'failed' && <IconX />}
                        </button>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>{item.item}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: C.textMuted }}>{item.category}</span>
                          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: item.priority === 'high' ? C.errorLight : item.priority === 'medium' ? C.warningLight : C.primaryLight, color: item.priority === 'high' ? C.error : item.priority === 'medium' ? C.warning : C.primary }}>{item.priority}</span>
                          {item.note && <span style={{ fontSize: '11px', color: C.textMuted, fontStyle: 'italic' }}>{item.note}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleChecklistUpdate(item.id, item.status === 'na' ? 'pending' : 'na')}
                        style={{ padding: '3px 8px', borderRadius: '6px', border: `1px solid ${item.status === 'na' ? C.textMuted : C.border}`, backgroundColor: item.status === 'na' ? '#e2e8f0' : C.white, color: item.status === 'na' ? C.text : C.textLight, fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>N/A</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Бенчмарки' && result.benchmarks && result.benchmarks.length > 0 && (
            <div style={{ ...card }}>
              <SectionTitle>Бенчмарки</SectionTitle>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={result.benchmarks} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="benchmark_name" tick={{ fontSize: 11, fill: C.textMuted }} angle={-25} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}`, 'Скор']} />
                  <Bar dataKey="benchmark_score" radius={[4, 4, 0, 0]}>
                    {result.benchmarks.map((b, i) => (
                      <Cell key={i} fill={b.delta >= 0 ? C.success : C.error} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'Риски' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {result.red_flags && result.red_flags.length > 0 ? (
                result.red_flags.map((flag, i) => (
                  <div key={i} style={{ ...card, borderLeft: `4px solid ${flag.severity === 'critical' ? '#7f1d1d' : C.error}`, backgroundColor: C.errorLight }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <IconFlag />
                      <span style={{ fontWeight: 700, color: C.error, fontSize: '14px' }}>{flag.flag}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: flag.severity === 'critical' ? '#7f1d1d' : C.error, color: C.white }}>{flag.severity}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, lineHeight: 1.5 }}>{flag.description}</p>
                  </div>
                ))
              ) : (
                <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '14px', color: C.success, fontWeight: 600 }}>✅ Критических рисков не обнаружено</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DueDiligenceLayout>
  );
}
