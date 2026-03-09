'use client';
import { useEffect, useState } from 'react';
import { marketAdapters } from '../../lib/api';

/* ─── Типы ──────────────────────────────────────────────────── */
interface SourceItem {
  id: number;
  name: string;
  provider: string;
  is_active: boolean;
  config: any;
  last_sync_at: string | null;
  sync_interval_minutes: number;
  created_at: string;
}

interface CacheItem {
  id: number;
  source_id: number;
  symbol: string;
  data_type: string;
  data: any;
  period: string | null;
  fetched_at: string;
  expires_at: string | null;
}

interface QuoteResult {
  symbol: string;
  price: number | null;
  change: string | null;
  change_percent: string | null;
  volume: string | null;
  source: string;
  fetched_at: string | null;
  note: string | null;
}

interface MacroResult {
  indicator: string;
  country: string;
  value: number | null;
  period: string | null;
  unit: string | null;
  source: string;
  data: any[] | null;
}

interface EtlStatus {
  source_id: number;
  source_name: string;
  provider: string;
  last_sync: string | null;
  interval_min: number;
  is_active: boolean;
  cached_records: number;
}

interface ContactItem {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  contact_type: string;
  tags: string[] | null;
  notes: string | null;
  crm_source: string | null;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealItem {
  id: number;
  contact_id: number | null;
  title: string;
  stage: string;
  amount: number | null;
  currency: string;
  probability: number | null;
  expected_close_date: string | null;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface PipelineSummary {
  total_deals: number;
  total_value: number;
  weighted_value: number;
  by_stage: Record<string, { count: number; value: number }>;
}

interface DocItem {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  mime_type: string | null;
  file_size: number | null;
  current_version: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface DocVersionItem {
  id: number;
  document_id: number;
  version_number: number;
  file_name: string;
  file_size: number | null;
  change_notes: string | null;
  uploaded_by: number | null;
  created_at: string;
}

interface CompanyItem {
  id: number;
  company_name: string;
  ticker: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  revenue: number | null;
  ebitda: number | null;
  net_income: number | null;
  ev_revenue: number | null;
  ev_ebitda: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  ps_ratio: number | null;
  dividend_yield: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

interface AnalysisResult {
  total_companies: number;
  sector: string | null;
  median_ev_revenue: number | null;
  median_ev_ebitda: number | null;
  median_pe: number | null;
  median_pb: number | null;
  avg_ev_revenue: number | null;
  avg_ev_ebitda: number | null;
  avg_pe: number | null;
  avg_pb: number | null;
  companies: CompanyItem[];
}

/* ─── Палитра ───────────────────────────────────────────────── */
const C = {
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  blue: '#3b82f6',
  blueSoft: '#eff6ff',
  green: '#22c55e',
  greenSoft: '#f0fdf4',
  red: '#ef4444',
  redSoft: '#fef2f2',
  amber: '#f59e0b',
  amberSoft: '#fffbeb',
  purple: '#8b5cf6',
  purpleSoft: '#f5f3ff',
  indigo: '#6366f1',
  indigoSoft: '#eef2ff',
  teal: '#14b8a6',
  tealSoft: '#f0fdfa',
};

/* ─── SVG-иконки ────────────────────────────────────────────── */
function SvgIcon({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  chart: 'M23 6l-9.5 9.5-5-5L1 18',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z',
  etl: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  compare: 'M18 20V10M12 20V4M6 20v-6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  search: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35',
  play: 'M5 3l14 9-14 9V3z',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
};

/* ─── Утилиты ───────────────────────────────────────────────── */
function fmtDate(s: string | null) {
  if (!s) return '\u2014';
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(v: number | null | undefined, currency = 'USD') {
  if (v == null) return '\u2014';
  return v.toLocaleString('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function fmtNum(v: number | null | undefined, decimals = 2) {
  if (v == null) return '\u2014';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '\u2014';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: active ? C.greenSoft : C.redSoft,
        color: active ? '#16a34a' : '#dc2626',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? C.green : C.red }} />
      {active ? 'Активен' : 'Неактивен'}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    lead: { bg: C.blueSoft, color: C.blue, label: 'Лид' },
    qualified: { bg: C.indigoSoft, color: C.indigo, label: 'Квалифицирован' },
    proposal: { bg: C.purpleSoft, color: C.purple, label: 'Предложение' },
    negotiation: { bg: C.amberSoft, color: '#d97706', label: 'Переговоры' },
    closed_won: { bg: C.greenSoft, color: '#16a34a', label: 'Закрыта (Успех)' },
    closed_lost: { bg: C.redSoft, color: '#dc2626', label: 'Закрыта (Отказ)' },
  };
  const s = map[stage] || { bg: C.borderLight, color: C.textSecondary, label: stage };
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ─── Стиль кнопок ──────────────────────────────────────────── */
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  backgroundColor: C.blue, color: '#fff', fontSize: '13px',
  fontWeight: '600', cursor: 'pointer', transition: 'background 0.15s',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.border}`,
  backgroundColor: C.cardBg, color: C.textPrimary, fontSize: '13px',
  fontWeight: '500', cursor: 'pointer', transition: 'background 0.15s',
};

const btnDanger: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '6px 12px', borderRadius: '7px', border: 'none',
  backgroundColor: C.redSoft, color: '#dc2626', fontSize: '12px',
  fontWeight: '500', cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: `1px solid ${C.border}`, fontSize: '13px', color: C.textPrimary,
  outline: 'none', transition: 'border 0.15s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', backgroundColor: '#fff',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: C.cardBg, borderRadius: '12px',
  border: `1px solid ${C.border}`, overflow: 'hidden',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: '11px',
  fontWeight: '600', color: C.textMuted, textTransform: 'uppercase',
  letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}`,
  backgroundColor: C.borderLight,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: '13px', color: C.textPrimary,
  borderBottom: `1px solid ${C.borderLight}`,
};

/* ─── Стиль модального окна ─────────────────────────────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ backgroundColor: C.cardBg, borderRadius: '14px', padding: '24px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.textPrimary }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.textMuted, padding: '4px' }}>
            <SvgIcon d={ICONS.x} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── TABS ──────────────────────────────────────────────────── */
const TABS = [
  { key: 'market', label: 'Рыночные данные', icon: ICONS.chart, color: C.blue },
  { key: 'etl', label: 'ETL Pipeline', icon: ICONS.etl, color: C.amber },
  { key: 'crm', label: 'CRM', icon: ICONS.users, color: C.indigo },
  { key: 'dms', label: 'Документы', icon: ICONS.file, color: C.teal },
  { key: 'comparable', label: 'Comparable', icon: ICONS.compare, color: C.purple },
] as const;

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                */
/* ═══════════════════════════════════════════════════════════════ */

export default function MarketAdaptersPage() {
  const [tab, setTab] = useState<string>('market');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Market Data State ──────────────────────────── */
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [srcForm, setSrcForm] = useState({ name: '', provider: 'alpha_vantage', api_key: '', sync_interval_minutes: 60 });
  const [quoteSymbol, setQuoteSymbol] = useState('AAPL');
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [macroIndicator, setMacroIndicator] = useState('GDP');
  const [macroCountry, setMacroCountry] = useState('US');
  const [macroResult, setMacroResult] = useState<MacroResult | null>(null);

  /* ── ETL State ──────────────────────────────────── */
  const [etlStatuses, setEtlStatuses] = useState<EtlStatus[]>([]);
  const [etlRunning, setEtlRunning] = useState(false);

  /* ── CRM State ──────────────────────────────────── */
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [crmSubTab, setCrmSubTab] = useState<'contacts' | 'deals' | 'pipeline'>('contacts');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '', position: '', contact_type: 'investor', notes: '' });
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealForm, setDealForm] = useState({ title: '', stage: 'lead', amount: '', currency: 'USD', probability: '', description: '' });

  /* ── DMS State ──────────────────────────────────── */
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [dmsSearch, setDmsSearch] = useState('');
  const [dmsStats, setDmsStats] = useState<any>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', description: '', category: '' });
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [docVersions, setDocVersions] = useState<DocVersionItem[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionForm, setVersionForm] = useState({ file_name: '', file_size: '', change_notes: '' });

  /* ── Comparable State ───────────────────────────── */
  const [comparables, setComparables] = useState<CompanyItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sectors, setSectors] = useState<string[]>([]);
  const [compSector, setCompSector] = useState('');
  const [showCompModal, setShowCompModal] = useState(false);
  const [compForm, setCompForm] = useState({
    company_name: '', ticker: '', sector: '', industry: '', country: '',
    market_cap: '', revenue: '', ebitda: '', net_income: '',
    ev_revenue: '', ev_ebitda: '', pe_ratio: '', pb_ratio: '',
  });

  /* ── Load data ──────────────────────────────────── */
  useEffect(() => { loadSources(); }, []);
  useEffect(() => {
    if (tab === 'etl') loadEtl();
    if (tab === 'crm') { loadContacts(); loadDeals(); loadPipeline(); }
    if (tab === 'dms') { loadDocs(); loadDmsStats(); }
    if (tab === 'comparable') { loadComparables(); loadSectors(); }
  }, [tab]);

  async function loadSources() {
    try { setSources(await marketAdapters.listSources()); } catch {}
  }
  async function loadEtl() {
    try { setEtlStatuses(await marketAdapters.getEtlStatus()); } catch {}
  }
  async function loadContacts() {
    try { setContacts(await marketAdapters.listContacts()); } catch {}
  }
  async function loadDeals() {
    try { setDeals(await marketAdapters.listDeals()); } catch {}
  }
  async function loadPipeline() {
    try { setPipeline(await marketAdapters.getPipelineSummary()); } catch {}
  }
  async function loadDocs() {
    try { setDocs(await marketAdapters.listDocuments(undefined, dmsSearch || undefined)); } catch {}
  }
  async function loadDmsStats() {
    try { setDmsStats(await marketAdapters.getDmsStats()); } catch {}
  }
  async function loadComparables() {
    try { setComparables(await marketAdapters.listComparables(compSector || undefined)); } catch {}
  }
  async function loadSectors() {
    try {
      const res = await marketAdapters.getSectors();
      setSectors(res.sectors || []);
    } catch {}
  }
  async function loadAnalysis() {
    try { setAnalysis(await marketAdapters.getAnalysis(compSector || undefined)); } catch {}
  }

  /* ── Handlers ───────────────────────────────────── */
  async function handleCreateSource() {
    setLoading(true); setError('');
    try {
      await marketAdapters.createSource({ ...srcForm, sync_interval_minutes: Number(srcForm.sync_interval_minutes) || 60 });
      setShowSourceModal(false);
      setSrcForm({ name: '', provider: 'alpha_vantage', api_key: '', sync_interval_minutes: 60 });
      await loadSources();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeleteSource(id: number) {
    if (!confirm('Удалить источник?')) return;
    try { await marketAdapters.deleteSource(id); await loadSources(); } catch {}
  }

  async function handleFetchQuote() {
    setLoading(true); setQuoteResult(null);
    try { setQuoteResult(await marketAdapters.getQuote(quoteSymbol)); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleFetchMacro() {
    setLoading(true); setMacroResult(null);
    try { setMacroResult(await marketAdapters.getMacro(macroIndicator, undefined, macroCountry)); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleRunEtl(sourceId: number) {
    setEtlRunning(true);
    try { await marketAdapters.runEtl(sourceId); await loadEtl(); } catch {}
    setEtlRunning(false);
  }

  async function handleRunEtlAll() {
    setEtlRunning(true);
    try { await marketAdapters.runEtlAll(); await loadEtl(); } catch {}
    setEtlRunning(false);
  }

  async function handleCleanup() {
    try { await marketAdapters.cleanupCache(); await loadEtl(); } catch {}
  }

  async function handleCreateContact() {
    setLoading(true); setError('');
    try {
      await marketAdapters.createContact(contactForm);
      setShowContactModal(false);
      setContactForm({ first_name: '', last_name: '', email: '', phone: '', company: '', position: '', contact_type: 'investor', notes: '' });
      await loadContacts();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeleteContact(id: number) {
    if (!confirm('Удалить контакт?')) return;
    try { await marketAdapters.deleteContact(id); await loadContacts(); } catch {}
  }

  async function handleCreateDeal() {
    setLoading(true); setError('');
    try {
      await marketAdapters.createDeal({
        ...dealForm,
        amount: dealForm.amount ? Number(dealForm.amount) : undefined,
        probability: dealForm.probability ? Number(dealForm.probability) : undefined,
      });
      setShowDealModal(false);
      setDealForm({ title: '', stage: 'lead', amount: '', currency: 'USD', probability: '', description: '' });
      await loadDeals();
      await loadPipeline();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeleteDeal(id: number) {
    if (!confirm('Удалить сделку?')) return;
    try { await marketAdapters.deleteDeal(id); await loadDeals(); await loadPipeline(); } catch {}
  }

  async function handleCreateDoc() {
    setLoading(true); setError('');
    try {
      await marketAdapters.createDocument(docForm);
      setShowDocModal(false);
      setDocForm({ title: '', description: '', category: '' });
      await loadDocs();
      await loadDmsStats();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeleteDoc(id: number) {
    if (!confirm('Удалить документ?')) return;
    try { await marketAdapters.deleteDocument(id); await loadDocs(); await loadDmsStats(); } catch {}
  }

  async function handleSelectDoc(doc: DocItem) {
    setSelectedDoc(doc);
    try { setDocVersions(await marketAdapters.listDocVersions(doc.id)); } catch {}
  }

  async function handleAddVersion() {
    if (!selectedDoc) return;
    setLoading(true); setError('');
    try {
      await marketAdapters.addDocVersion(selectedDoc.id, {
        file_name: versionForm.file_name,
        file_size: versionForm.file_size ? Number(versionForm.file_size) : undefined,
        change_notes: versionForm.change_notes || undefined,
      });
      setShowVersionModal(false);
      setVersionForm({ file_name: '', file_size: '', change_notes: '' });
      setDocVersions(await marketAdapters.listDocVersions(selectedDoc.id));
      await loadDocs();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDmsSearch() {
    try {
      const res = await marketAdapters.searchDocuments({ query: dmsSearch });
      setDocs(res);
    } catch {}
  }

  async function handleCreateComparable() {
    setLoading(true); setError('');
    try {
      const payload: any = { company_name: compForm.company_name };
      if (compForm.ticker) payload.ticker = compForm.ticker;
      if (compForm.sector) payload.sector = compForm.sector;
      if (compForm.industry) payload.industry = compForm.industry;
      if (compForm.country) payload.country = compForm.country;
      if (compForm.market_cap) payload.market_cap = Number(compForm.market_cap);
      if (compForm.revenue) payload.revenue = Number(compForm.revenue);
      if (compForm.ebitda) payload.ebitda = Number(compForm.ebitda);
      if (compForm.net_income) payload.net_income = Number(compForm.net_income);
      if (compForm.ev_revenue) payload.ev_revenue = Number(compForm.ev_revenue);
      if (compForm.ev_ebitda) payload.ev_ebitda = Number(compForm.ev_ebitda);
      if (compForm.pe_ratio) payload.pe_ratio = Number(compForm.pe_ratio);
      if (compForm.pb_ratio) payload.pb_ratio = Number(compForm.pb_ratio);
      await marketAdapters.createComparable(payload);
      setShowCompModal(false);
      setCompForm({ company_name: '', ticker: '', sector: '', industry: '', country: '', market_cap: '', revenue: '', ebitda: '', net_income: '', ev_revenue: '', ev_ebitda: '', pe_ratio: '', pb_ratio: '' });
      await loadComparables();
      await loadSectors();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeleteComparable(id: number) {
    if (!confirm('Удалить компанию?')) return;
    try { await marketAdapters.deleteComparable(id); await loadComparables(); } catch {}
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  RENDER                                                    */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: C.textPrimary, marginBottom: '6px' }}>
          Адаптеры внешних систем
        </h1>
        <p style={{ fontSize: '13px', color: C.textSecondary }}>
          Интеграция с рыночными данными, ETL-пайплайн, CRM, DMS и Comparable-анализ
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: C.redSoft, color: '#dc2626', fontSize: '13px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}><SvgIcon d={ICONS.x} size={14} /></button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '9px 18px', borderRadius: '10px', border: 'none',
              backgroundColor: tab === t.key ? t.color : C.cardBg,
              color: tab === t.key ? '#fff' : C.textSecondary,
              fontSize: '13px', fontWeight: tab === t.key ? '600' : '500',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: tab === t.key ? `0 2px 8px ${t.color}40` : `0 1px 3px rgba(0,0,0,0.06)`,
              border: tab === t.key ? 'none' : `1px solid ${C.border}`,
            }}
          >
            <SvgIcon d={t.icon} size={15} color={tab === t.key ? '#fff' : t.color} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: MARKET DATA                                      */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'market' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sources */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcon d={ICONS.globe} size={18} color={C.blue} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Источники данных</span>
                <span style={{ fontSize: '12px', color: C.textMuted, backgroundColor: C.borderLight, padding: '2px 8px', borderRadius: '9999px' }}>{sources.length}</span>
              </div>
              <button style={btnPrimary} onClick={() => setShowSourceModal(true)}>
                <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Добавить
              </button>
            </div>
            {sources.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                Нет источников. Добавьте первый для получения рыночных данных.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Название</th>
                    <th style={thStyle}>Провайдер</th>
                    <th style={thStyle}>Интервал</th>
                    <th style={thStyle}>Синхронизация</th>
                    <th style={thStyle}>Статус</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => (
                    <tr key={s.id}>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{s.name}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', backgroundColor: C.blueSoft, color: C.blue }}>
                          {s.provider}
                        </span>
                      </td>
                      <td style={tdStyle}>{s.sync_interval_minutes} мин</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: C.textSecondary }}>{fmtDate(s.last_sync_at)}</td>
                      <td style={tdStyle}><StatusBadge active={s.is_active} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button style={btnDanger} onClick={() => handleDeleteSource(s.id)}>
                          <SvgIcon d={ICONS.trash} size={13} color="#dc2626" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quote lookup */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcon d={ICONS.chart} size={18} color={C.green} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Котировки</span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="Тикер (AAPL, MSFT...)"
                    value={quoteSymbol}
                    onChange={e => setQuoteSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleFetchQuote()}
                  />
                  <button style={btnPrimary} onClick={handleFetchQuote} disabled={loading}>
                    <SvgIcon d={ICONS.search} size={14} color="#fff" /> Запрос
                  </button>
                </div>
                {quoteResult && (
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: C.borderLight }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: C.textPrimary }}>{quoteResult.symbol}</span>
                      <span style={{ fontSize: '11px', color: C.textMuted, backgroundColor: C.blueSoft, padding: '2px 8px', borderRadius: '6px' }}>{quoteResult.source}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: C.textPrimary, marginBottom: '4px' }}>
                      ${quoteResult.price != null ? quoteResult.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '\u2014'}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: C.textSecondary }}>
                      <span>Изменение: {quoteResult.change || '\u2014'}</span>
                      <span>%: {quoteResult.change_percent || '\u2014'}</span>
                      <span>Объём: {quoteResult.volume || '\u2014'}</span>
                    </div>
                    {quoteResult.note && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: C.amber, fontStyle: 'italic' }}>{quoteResult.note}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Macro indicator */}
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcon d={ICONS.globe} size={18} color={C.indigo} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Макроиндикаторы</span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select style={{ ...selectStyle, flex: 1 }} value={macroIndicator} onChange={e => setMacroIndicator(e.target.value)}>
                    <option value="GDP">ВВП (GDP)</option>
                    <option value="CPI">ИПЦ (CPI)</option>
                    <option value="INFLATION">Инфляция</option>
                    <option value="UNEMPLOYMENT">Безработица</option>
                  </select>
                  <input
                    style={{ ...inputStyle, width: '80px' }}
                    placeholder="Страна"
                    value={macroCountry}
                    onChange={e => setMacroCountry(e.target.value.toUpperCase())}
                  />
                  <button style={btnPrimary} onClick={handleFetchMacro} disabled={loading}>
                    <SvgIcon d={ICONS.search} size={14} color="#fff" />
                  </button>
                </div>
                {macroResult && (
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: C.borderLight }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: C.textPrimary }}>{macroResult.indicator} ({macroResult.country})</span>
                      <span style={{ fontSize: '11px', color: C.textMuted, backgroundColor: C.indigoSoft, padding: '2px 8px', borderRadius: '6px' }}>{macroResult.source}</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: C.textPrimary }}>
                      {macroResult.value != null ? fmtNum(macroResult.value) : '\u2014'}
                      {macroResult.unit && <span style={{ fontSize: '13px', color: C.textMuted, marginLeft: '6px' }}>{macroResult.unit}</span>}
                    </div>
                    {macroResult.period && <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>Период: {macroResult.period}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Source Modal */}
          <Modal open={showSourceModal} onClose={() => setShowSourceModal(false)} title="Новый источник данных">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Название</label>
                <input style={inputStyle} placeholder="Alpha Vantage API" value={srcForm.name} onChange={e => setSrcForm({ ...srcForm, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Провайдер</label>
                <select style={selectStyle} value={srcForm.provider} onChange={e => setSrcForm({ ...srcForm, provider: e.target.value })}>
                  <option value="alpha_vantage">Alpha Vantage</option>
                  <option value="yahoo_finance">Yahoo Finance</option>
                  <option value="world_bank">World Bank</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>API Key (опционально)</label>
                <input style={inputStyle} placeholder="Ваш API ключ" value={srcForm.api_key} onChange={e => setSrcForm({ ...srcForm, api_key: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Интервал синхронизации (мин)</label>
                <input style={inputStyle} type="number" min="1" value={srcForm.sync_interval_minutes} onChange={e => setSrcForm({ ...srcForm, sync_interval_minutes: Number(e.target.value) })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowSourceModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleCreateSource} disabled={loading || !srcForm.name}>
                  {loading ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: ETL PIPELINE                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'etl' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnPrimary} onClick={handleRunEtlAll} disabled={etlRunning}>
              <SvgIcon d={ICONS.play} size={14} color="#fff" /> {etlRunning ? 'Запуск...' : 'Запустить все ETL'}
            </button>
            <button style={btnSecondary} onClick={handleCleanup}>
              <SvgIcon d={ICONS.trash} size={14} /> Очистить кэш
            </button>
            <button style={btnSecondary} onClick={loadEtl}>
              <SvgIcon d={ICONS.refresh} size={14} /> Обновить
            </button>
          </div>

          {/* ETL Status Table */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcon d={ICONS.etl} size={18} color={C.amber} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Статус ETL-процессов</span>
              </div>
            </div>
            {etlStatuses.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                Нет источников для ETL. Добавьте источник во вкладке &laquo;Рыночные данные&raquo;.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Источник</th>
                    <th style={thStyle}>Провайдер</th>
                    <th style={thStyle}>Записей</th>
                    <th style={thStyle}>Интервал</th>
                    <th style={thStyle}>Синхронизация</th>
                    <th style={thStyle}>Статус</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {etlStatuses.map(s => (
                    <tr key={s.source_id}>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{s.source_name}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', backgroundColor: C.amberSoft, color: '#d97706' }}>{s.provider}</span>
                      </td>
                      <td style={tdStyle}>{s.cached_records}</td>
                      <td style={tdStyle}>{s.interval_min} мин</td>
                      <td style={{ ...tdStyle, fontSize: '12px', color: C.textSecondary }}>{fmtDate(s.last_sync)}</td>
                      <td style={tdStyle}><StatusBadge active={s.is_active} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button style={btnSecondary} onClick={() => handleRunEtl(s.source_id)} disabled={etlRunning}>
                          <SvgIcon d={ICONS.play} size={13} /> Запуск
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: CRM                                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'crm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: C.borderLight, borderRadius: '10px', padding: '4px' }}>
            {([['contacts', 'Контакты'], ['deals', 'Сделки'], ['pipeline', 'Pipeline']] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setCrmSubTab(k)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none',
                  backgroundColor: crmSubTab === k ? C.cardBg : 'transparent',
                  color: crmSubTab === k ? C.textPrimary : C.textSecondary,
                  fontSize: '13px', fontWeight: crmSubTab === k ? '600' : '400',
                  cursor: 'pointer', boxShadow: crmSubTab === k ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Contacts */}
          {crmSubTab === 'contacts' && (
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcon d={ICONS.users} size={18} color={C.indigo} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Контакты</span>
                  <span style={{ fontSize: '12px', color: C.textMuted, backgroundColor: C.borderLight, padding: '2px 8px', borderRadius: '9999px' }}>{contacts.length}</span>
                </div>
                <button style={btnPrimary} onClick={() => setShowContactModal(true)}>
                  <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Добавить
                </button>
              </div>
              {contacts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                  Нет контактов. Добавьте первый контакт.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Имя</th>
                      <th style={thStyle}>Компания</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Тип</th>
                      <th style={thStyle}>Источник</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => (
                      <tr key={c.id}>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{c.first_name} {c.last_name || ''}</td>
                        <td style={tdStyle}>{c.company || '\u2014'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: C.textSecondary }}>{c.email || '\u2014'}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', backgroundColor: C.indigoSoft, color: C.indigo }}>{c.contact_type}</span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: C.textSecondary }}>{c.crm_source || '\u2014'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button style={btnDanger} onClick={() => handleDeleteContact(c.id)}>
                            <SvgIcon d={ICONS.trash} size={13} color="#dc2626" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Deals */}
          {crmSubTab === 'deals' && (
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcon d={ICONS.dollar} size={18} color={C.green} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Сделки</span>
                  <span style={{ fontSize: '12px', color: C.textMuted, backgroundColor: C.borderLight, padding: '2px 8px', borderRadius: '9999px' }}>{deals.length}</span>
                </div>
                <button style={btnPrimary} onClick={() => setShowDealModal(true)}>
                  <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Добавить
                </button>
              </div>
              {deals.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                  Нет сделок. Добавьте первую сделку.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Название</th>
                      <th style={thStyle}>Стадия</th>
                      <th style={thStyle}>Сумма</th>
                      <th style={thStyle}>Вероятность</th>
                      <th style={thStyle}>Дата закрытия</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map(d => (
                      <tr key={d.id}>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{d.title}</td>
                        <td style={tdStyle}><StageBadge stage={d.stage} /></td>
                        <td style={tdStyle}>{fmtMoney(d.amount, d.currency)}</td>
                        <td style={tdStyle}>{d.probability != null ? `${d.probability}%` : '\u2014'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px', color: C.textSecondary }}>{fmtDate(d.expected_close_date)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button style={btnDanger} onClick={() => handleDeleteDeal(d.id)}>
                            <SvgIcon d={ICONS.trash} size={13} color="#dc2626" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Pipeline */}
          {crmSubTab === 'pipeline' && pipeline && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {[
                  { label: 'Всего сделок', value: pipeline.total_deals.toString(), color: C.blue, bg: C.blueSoft },
                  { label: 'Общая сумма', value: fmtMoney(pipeline.total_value), color: C.green, bg: C.greenSoft },
                  { label: 'Взвешенная сумма', value: fmtMoney(pipeline.weighted_value), color: C.purple, bg: C.purpleSoft },
                ].map((c, i) => (
                  <div key={i} style={{ ...cardStyle, padding: '18px 20px' }}>
                    <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '6px' }}>{c.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              {/* By stage */}
              <div style={cardStyle}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>По стадиям</span>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {Object.entries(pipeline.by_stage).map(([stage, data]) => (
                    <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                      <StageBadge stage={stage} />
                      <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                        <span style={{ color: C.textSecondary }}>{data.count} сделок</span>
                        <span style={{ fontWeight: '600', color: C.textPrimary }}>{fmtMoney(data.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Modal */}
          <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Новый контакт">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Имя *</label>
                  <input style={inputStyle} value={contactForm.first_name} onChange={e => setContactForm({ ...contactForm, first_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Фамилия</label>
                  <input style={inputStyle} value={contactForm.last_name} onChange={e => setContactForm({ ...contactForm, last_name: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Email</label>
                  <input style={inputStyle} type="email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Телефон</label>
                  <input style={inputStyle} value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Компания</label>
                  <input style={inputStyle} value={contactForm.company} onChange={e => setContactForm({ ...contactForm, company: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Должность</label>
                  <input style={inputStyle} value={contactForm.position} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Тип контакта</label>
                <select style={selectStyle} value={contactForm.contact_type} onChange={e => setContactForm({ ...contactForm, contact_type: e.target.value })}>
                  <option value="investor">Инвестор</option>
                  <option value="partner">Партнёр</option>
                  <option value="advisor">Консультант</option>
                  <option value="broker">Брокер</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Заметки</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={contactForm.notes} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowContactModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleCreateContact} disabled={loading || !contactForm.first_name}>
                  {loading ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </Modal>

          {/* Deal Modal */}
          <Modal open={showDealModal} onClose={() => setShowDealModal(false)} title="Новая сделка">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Название *</label>
                <input style={inputStyle} value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Стадия</label>
                  <select style={selectStyle} value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}>
                    <option value="lead">Лид</option>
                    <option value="qualified">Квалифицирован</option>
                    <option value="proposal">Предложение</option>
                    <option value="negotiation">Переговоры</option>
                    <option value="closed_won">Закрыта (Успех)</option>
                    <option value="closed_lost">Закрыта (Отказ)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Валюта</label>
                  <select style={selectStyle} value={dealForm.currency} onChange={e => setDealForm({ ...dealForm, currency: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="UZS">UZS</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Сумма</label>
                  <input style={inputStyle} type="number" placeholder="0" value={dealForm.amount} onChange={e => setDealForm({ ...dealForm, amount: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Вероятность (%)</label>
                  <input style={inputStyle} type="number" min="0" max="100" placeholder="50" value={dealForm.probability} onChange={e => setDealForm({ ...dealForm, probability: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Описание</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={dealForm.description} onChange={e => setDealForm({ ...dealForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowDealModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleCreateDeal} disabled={loading || !dealForm.title}>
                  {loading ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: DMS                                              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'dms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stats */}
          {dmsStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              {[
                { label: 'Документов', value: dmsStats.total_documents ?? 0, color: C.teal },
                { label: 'Версий', value: dmsStats.total_versions ?? 0, color: C.blue },
                { label: 'Общий размер', value: fmtSize(dmsStats.total_size ?? 0), color: C.indigo },
                { label: 'Категорий', value: dmsStats.categories_count ?? 0, color: C.purple },
              ].map((c, i) => (
                <div key={i} style={{ ...cardStyle, padding: '16px 20px' }}>
                  <div style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '4px' }}>{c.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search + Add */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Поиск документов..."
                value={dmsSearch}
                onChange={e => setDmsSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDmsSearch()}
              />
              <button style={btnSecondary} onClick={handleDmsSearch}>
                <SvgIcon d={ICONS.search} size={14} />
              </button>
            </div>
            <button style={btnPrimary} onClick={() => setShowDocModal(true)}>
              <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Создать
            </button>
          </div>

          {/* Document list + Detail */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '1fr 1fr' : '1fr', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SvgIcon d={ICONS.file} size={18} color={C.teal} />
                  <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Документы</span>
                  <span style={{ fontSize: '12px', color: C.textMuted, backgroundColor: C.borderLight, padding: '2px 8px', borderRadius: '9999px' }}>{docs.length}</span>
                </div>
              </div>
              {docs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                  Нет документов.
                </div>
              ) : (
                <div>
                  {docs.map(d => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDoc(d)}
                      style={{
                        padding: '12px 20px',
                        borderBottom: `1px solid ${C.borderLight}`,
                        cursor: 'pointer',
                        backgroundColor: selectedDoc?.id === d.id ? C.blueSoft : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: C.textPrimary }}>{d.title}</div>
                          <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                            {d.category && <span style={{ marginRight: '8px', padding: '1px 6px', borderRadius: '4px', backgroundColor: C.tealSoft, color: C.teal }}>{d.category}</span>}
                            v{d.current_version} &middot; {fmtDate(d.updated_at)}
                          </div>
                        </div>
                        <button style={btnDanger} onClick={e => { e.stopPropagation(); handleDeleteDoc(d.id); }}>
                          <SvgIcon d={ICONS.trash} size={12} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Version detail */}
            {selectedDoc && (
              <div style={cardStyle}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>{selectedDoc.title}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                      Версия {selectedDoc.current_version} &middot; {selectedDoc.description || 'Без описания'}
                    </div>
                  </div>
                  <button style={btnPrimary} onClick={() => setShowVersionModal(true)}>
                    <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Версия
                  </button>
                </div>
                {docVersions.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                    Нет версий.
                  </div>
                ) : (
                  <div>
                    {docVersions.map(v => (
                      <div key={v.id} style={{ padding: '10px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: C.blue }}>v{v.version_number}</span>
                            <span style={{ fontSize: '12px', color: C.textSecondary, marginLeft: '8px' }}>{v.file_name}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: C.textMuted }}>{fmtDate(v.created_at)}</span>
                        </div>
                        {v.change_notes && <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '4px' }}>{v.change_notes}</div>}
                        {v.file_size && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{fmtSize(v.file_size)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doc Modal */}
          <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Новый документ">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Название *</label>
                <input style={inputStyle} value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Категория</label>
                <input style={inputStyle} placeholder="contract, report, memo..." value={docForm.category} onChange={e => setDocForm({ ...docForm, category: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Описание</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={docForm.description} onChange={e => setDocForm({ ...docForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowDocModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleCreateDoc} disabled={loading || !docForm.title}>
                  {loading ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </div>
          </Modal>

          {/* Version Modal */}
          <Modal open={showVersionModal} onClose={() => setShowVersionModal(false)} title="Добавить версию">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Имя файла *</label>
                <input style={inputStyle} placeholder="document_v2.pdf" value={versionForm.file_name} onChange={e => setVersionForm({ ...versionForm, file_name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Размер файла (байт)</label>
                <input style={inputStyle} type="number" value={versionForm.file_size} onChange={e => setVersionForm({ ...versionForm, file_size: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Примечания к изменениям</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={versionForm.change_notes} onChange={e => setVersionForm({ ...versionForm, change_notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowVersionModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleAddVersion} disabled={loading || !versionForm.file_name}>
                  {loading ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  TAB: COMPARABLE COMPANIES                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'comparable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select style={{ ...selectStyle, width: '200px' }} value={compSector} onChange={e => { setCompSector(e.target.value); }}>
              <option value="">Все секторы</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={btnSecondary} onClick={() => { loadComparables(); }}>
              <SvgIcon d={ICONS.refresh} size={14} /> Обновить
            </button>
            <button style={{ ...btnSecondary, backgroundColor: C.purpleSoft, borderColor: C.purple, color: C.purple }} onClick={loadAnalysis}>
              <SvgIcon d={ICONS.compare} size={14} color={C.purple} /> Анализ мультипликаторов
            </button>
            <div style={{ flex: 1 }} />
            <button style={btnPrimary} onClick={() => setShowCompModal(true)}>
              <SvgIcon d={ICONS.plus} size={14} color="#fff" /> Добавить
            </button>
          </div>

          {/* Analysis result */}
          {analysis && (
            <div style={cardStyle}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>
                  Анализ мультипликаторов {analysis.sector ? `\u2014 ${analysis.sector}` : '(все секторы)'}
                </span>
                <span style={{ fontSize: '12px', color: C.textMuted, marginLeft: '12px' }}>{analysis.total_companies} компаний</span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  {[
                    { label: 'EV/Revenue (median)', value: fmtNum(analysis.median_ev_revenue), avg: fmtNum(analysis.avg_ev_revenue) },
                    { label: 'EV/EBITDA (median)', value: fmtNum(analysis.median_ev_ebitda), avg: fmtNum(analysis.avg_ev_ebitda) },
                    { label: 'P/E (median)', value: fmtNum(analysis.median_pe), avg: fmtNum(analysis.avg_pe) },
                    { label: 'P/B (median)', value: fmtNum(analysis.median_pb), avg: fmtNum(analysis.avg_pb) },
                  ].map((m, i) => (
                    <div key={i} style={{ padding: '14px', borderRadius: '10px', backgroundColor: C.purpleSoft }}>
                      <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '6px' }}>{m.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: C.purple }}>{m.value}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>Среднее: {m.avg}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Companies table */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcon d={ICONS.compare} size={18} color={C.purple} />
                <span style={{ fontSize: '15px', fontWeight: '600', color: C.textPrimary }}>Компании-аналоги</span>
                <span style={{ fontSize: '12px', color: C.textMuted, backgroundColor: C.borderLight, padding: '2px 8px', borderRadius: '9999px' }}>{comparables.length}</span>
              </div>
            </div>
            {comparables.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
                Нет компаний-аналогов. Добавьте первую.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Компания</th>
                      <th style={thStyle}>Тикер</th>
                      <th style={thStyle}>Сектор</th>
                      <th style={thStyle}>Страна</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Капитализация</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>EV/Revenue</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>EV/EBITDA</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>P/E</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>P/B</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparables.map(c => (
                      <tr key={c.id}>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{c.company_name}</td>
                        <td style={tdStyle}>
                          {c.ticker ? <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: C.purpleSoft, color: C.purple }}>{c.ticker}</span> : '\u2014'}
                        </td>
                        <td style={{ ...tdStyle, fontSize: '12px' }}>{c.sector || '\u2014'}</td>
                        <td style={{ ...tdStyle, fontSize: '12px' }}>{c.country || '\u2014'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontSize: '12px' }}>{c.market_cap ? fmtMoney(c.market_cap) : '\u2014'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtNum(c.ev_revenue)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtNum(c.ev_ebitda)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtNum(c.pe_ratio)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtNum(c.pb_ratio)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button style={btnDanger} onClick={() => handleDeleteComparable(c.id)}>
                            <SvgIcon d={ICONS.trash} size={13} color="#dc2626" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comparable Modal */}
          <Modal open={showCompModal} onClose={() => setShowCompModal(false)} title="Добавить компанию-аналог">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Название *</label>
                  <input style={inputStyle} value={compForm.company_name} onChange={e => setCompForm({ ...compForm, company_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Тикер</label>
                  <input style={inputStyle} placeholder="AAPL" value={compForm.ticker} onChange={e => setCompForm({ ...compForm, ticker: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Сектор</label>
                  <input style={inputStyle} placeholder="Technology" value={compForm.sector} onChange={e => setCompForm({ ...compForm, sector: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Индустрия</label>
                  <input style={inputStyle} placeholder="SaaS" value={compForm.industry} onChange={e => setCompForm({ ...compForm, industry: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginBottom: '6px' }}>Страна</label>
                  <input style={inputStyle} placeholder="US" value={compForm.country} onChange={e => setCompForm({ ...compForm, country: e.target.value })} />
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: C.textSecondary, marginTop: '4px' }}>Финансовые показатели</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Капитализация</label>
                  <input style={inputStyle} type="number" placeholder="0" value={compForm.market_cap} onChange={e => setCompForm({ ...compForm, market_cap: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Выручка</label>
                  <input style={inputStyle} type="number" placeholder="0" value={compForm.revenue} onChange={e => setCompForm({ ...compForm, revenue: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>EBITDA</label>
                  <input style={inputStyle} type="number" placeholder="0" value={compForm.ebitda} onChange={e => setCompForm({ ...compForm, ebitda: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>Чистая прибыль</label>
                  <input style={inputStyle} type="number" placeholder="0" value={compForm.net_income} onChange={e => setCompForm({ ...compForm, net_income: e.target.value })} />
                </div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: C.textSecondary }}>Мультипликаторы</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>EV/Revenue</label>
                  <input style={inputStyle} type="number" step="0.01" value={compForm.ev_revenue} onChange={e => setCompForm({ ...compForm, ev_revenue: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>EV/EBITDA</label>
                  <input style={inputStyle} type="number" step="0.01" value={compForm.ev_ebitda} onChange={e => setCompForm({ ...compForm, ev_ebitda: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>P/E</label>
                  <input style={inputStyle} type="number" step="0.01" value={compForm.pe_ratio} onChange={e => setCompForm({ ...compForm, pe_ratio: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>P/B</label>
                  <input style={inputStyle} type="number" step="0.01" value={compForm.pb_ratio} onChange={e => setCompForm({ ...compForm, pb_ratio: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button style={btnSecondary} onClick={() => setShowCompModal(false)}>Отмена</button>
                <button style={btnPrimary} onClick={handleCreateComparable} disabled={loading || !compForm.company_name}>
                  {loading ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
