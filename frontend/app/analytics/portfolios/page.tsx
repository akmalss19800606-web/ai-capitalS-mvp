'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrencyUZS } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { NextStepBanner } from '@/components/analytics/NextStepBanner';

// === ДИЗАЙН-ТОКЕНЫ АНАЛИТИКИ (копировать в каждый файл) ===
const C = {
  // Светлая зона (заголовки, KPI-карточки, навигация)
  pageBg: '#f8f8fc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  navActive: '#3b82f6',
  navActiveText: '#ffffff',
  navInactive: '#64748b',
  badge_blue: 'bg-blue-100 text-blue-700',
  badge_green: 'bg-green-100 text-green-700',
  badge_red: 'bg-red-100 text-red-700',
  badge_yellow: 'bg-yellow-100 text-yellow-700',
  // Тёмная зона (таблицы результатов, графики, расчёты)
  darkBg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900',
  darkCard: 'bg-slate-800/60 border border-slate-700/50 rounded-2xl',
  darkInput: 'bg-slate-900/60 border border-slate-600/50 rounded-xl',
  tabActive: 'bg-violet-600 text-white shadow-lg shadow-violet-500/25',
  tabInactive: 'text-slate-400 hover:text-white hover:bg-slate-700/40',
  btnPrimary: 'bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl',
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-slate-400',
};

type ActiveTab = 'nsbu' | 'ifrs' | 'diff';

interface NsbuRow {
  code?: string;
  label: string;
  current: number | null;
  previous: number | null;
  section?: string;
  asset?: boolean;
  liability?: boolean;
  isHeader?: boolean;
  isTotalAsset?: boolean;
  isTotalLiability?: boolean;
}

interface IfrsRow {
  label: string;
  note?: string;
  current: number | null;
  previous: number | null;
  isHeader?: boolean;
  isTotal?: boolean;
}

interface DiffRow {
  label: string;
  nsbu: number | null;
  ifrs: number | null;
  reason?: string;
}

function NsbuReport() {
  const [rows, setRows] = useState<NsbuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceOk, setBalanceOk] = useState<boolean | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const { setNsbuReady } = useAnalytics();
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/balance`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rows) {
          setRows(data.rows);
          setNsbuReady(true);
          const totalAsset = data.rows.filter((r: NsbuRow) => r.isTotalAsset)?.[0]?.current ?? 0;
          const totalLiab = data.rows.filter((r: NsbuRow) => r.isTotalLiability)?.[0]?.current ?? 0;
          setBalanceOk(Math.abs(totalAsset - totalLiab) < 1);
        }
        if (data?.company_info) setCompanyInfo(data.company_info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, setNsbuReady]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState
      icon={<span>📄</span>}
      title="Нет данных НСБУ"
      description="Сначала загрузите данные из 1С или Excel"
    />
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      {companyInfo && (
        <div className="mb-0 mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-900">{companyInfo.name}</h4>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-blue-800">
            <p>ИНН: {companyInfo.inn}</p>
            <p>Деятельность: {companyInfo.activity}</p>
            <p>Директор: {companyInfo.director}</p>
            <p>Период: {companyInfo.period}</p>
            {companyInfo.unit && <p>Единица: {companyInfo.unit}</p>}
            {companyInfo.accountant && <p>Гл. бухгалтер: {companyInfo.accountant}</p>}
          </div>
        </div>
      )}
      {balanceOk !== null && (
        <div className={`mb-0 mx-6 mt-4 p-3 rounded-lg text-sm font-medium ${
          balanceOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {balanceOk ? '✅ Баланс сходится (Активы = Обязательства + Капитал)' : '⚠️ Баланс не сходится — проверьте данные'}
        </div>
      )}
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">Показатель</th>
              <th className="text-center py-3 px-4 w-20">Код</th>
              <th className="text-right py-3 px-4">Текущий период</th>
              <th className="text-right py-3 px-4 rounded-tr-lg">Предыдущий период</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 ${
                row.isHeader ? 'bg-blue-50 font-semibold text-blue-800' :
                row.isTotalAsset || row.isTotalLiability ? 'bg-slate-800 text-white font-bold' :
                'hover:bg-gray-50'
              }`}>
                <td className={`py-2 px-4 ${row.isHeader ? 'pl-4' : 'pl-8'}`}>{row.label}</td>
                <td className="py-2 px-4 text-center text-gray-400">{row.code}</td>
                <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.current)}</td>
                <td className="py-2 px-4 text-right text-gray-500">{formatCurrencyUZS(row.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IfrsReport() {
  const [rows, setRows] = useState<IfrsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { setIfrsReady } = useAnalytics();
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/ifrs/balance`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) { setRows(d.rows); setIfrsReady(true); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, setIfrsReady]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState
      icon={<span>🌍</span>}
      title="Нет данных МСФО"
      description="Сначала загрузите данные из 1С или Excel"
    />
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-slate-900 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">IAS 1 — Отчёт о финансовом положении</th>
              <th className="text-center py-3 px-4">Примечание</th>
              <th className="text-right py-3 px-4">Текущий период</th>
              <th className="text-right py-3 px-4 rounded-tr-lg">Предыдущий период</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 ${
                row.isHeader ? 'bg-blue-50 font-semibold text-blue-800' :
                row.isTotal ? 'bg-slate-800 text-white font-bold' :
                'hover:bg-gray-50'
              }`}>
                <td className={`py-2 px-4 ${row.isHeader ? 'pl-4' : 'pl-8'}`}>{row.label}</td>
                <td className="py-2 px-4 text-center text-gray-400">{row.note || '---'}</td>
                <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.current)}</td>
                <td className="py-2 px-4 text-right text-gray-500">{formatCurrencyUZS(row.previous)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiffReport() {
  const [rows, setRows] = useState<DiffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/diff`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingCard rows={4} />;
  if (!rows.length) return (
    <EmptyState
      icon={<span>Δ</span>}
      title="Данные по разнице НСБУ / МСФО пока отсутствуют"
    />
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="m-6 mb-0 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>Главные расхождения:</strong> аренда IFRS 16, обесценение OCI, резервы по IAS 36
      </div>
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-amber-800 to-slate-900 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">Показатель</th>
              <th className="text-right py-3 px-4">НСБУ</th>
              <th className="text-right py-3 px-4">МСФО</th>
              <th className="text-right py-3 px-4">Дельта (UZS)</th>
              <th className="text-right py-3 px-4">Дельта %</th>
              <th className="text-left py-3 px-4 rounded-tr-lg">Причина</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const delta = (row.ifrs ?? 0) - (row.nsbu ?? 0);
              const deltaPct = row.nsbu ? (delta / row.nsbu * 100).toFixed(1) : '---';
              return (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-4">{row.label}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.nsbu)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.ifrs)}</td>
                  <td className={`py-2 px-4 text-right font-medium ${
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>{delta !== 0 ? formatCurrencyUZS(delta) : '—'}</td>
                  <td className={`py-2 px-4 text-right ${
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>{deltaPct !== '---' ? deltaPct + '%' : '---'}</td>
                  <td className="py-2 px-4 text-gray-500 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {row.reason || '---'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type OrgType = 'solo' | 'branch' | 'holding';
type OrgSize = 'small' | 'medium' | 'large';

interface RegForm {
  name: string;
  inn: string;
  oked: string;
  address: string;
  director: string;
  accountant: string;
  size: OrgSize;
  org_type: OrgType;
}

const emptyForm: RegForm = { name: '', inn: '', oked: '', address: '', director: '', accountant: '', size: 'medium', org_type: 'solo' };

function CompanyCard({ info }: { info: any }) {
  const sizeLabels: Record<string, string> = { small: 'Малое', medium: 'Среднее', large: 'Крупное' };
  const typeLabels: Record<string, string> = { solo: 'Одно юрлицо', branch: 'Филиал', holding: 'Холдинг' };
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{info.org_type === 'holding' ? '🏛' : info.org_type === 'branch' ? '🏗' : '🏢'}</span>
        <div>
          <h3 className="font-bold text-blue-900 text-lg">{info.name}</h3>
          <p className="text-xs text-blue-600">{typeLabels[info.org_type] || info.org_type} / {sizeLabels[info.size] || info.size}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
        {info.inn && <p>ИНН: {info.inn}</p>}
        {info.activity && <p>ОКЭД: {info.activity}</p>}
        {info.address && <p>Адрес: {info.address}</p>}
        {info.director && <p>Директор: {info.director}</p>}
        {info.accountant && <p>Гл. бухгалтер: {info.accountant}</p>}
        {info.period && <p>Период: {info.period}</p>}
      </div>
    </div>
  );
}

export default function PortfoliosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nsbu');
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [regForm, setRegForm] = useState<RegForm>(emptyForm);
  const [regSaving, setRegSaving] = useState(false);

  const { setActiveOrg, setNsbuReady, setIfrsReady } = useAnalytics();

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') || '' : '';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  // Load company info on mount
  useEffect(() => {
    fetch(`${apiBase}/api/v1/portfolios/company-info`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.company_info) {
          setCompanyInfo(d.company_info);
          setActiveOrg(d.company_info.inn || 'org', d.company_info.name || '');
        }
      })
      .catch(() => {});
  }, [token, apiBase, setActiveOrg]);

  async function handleRegister() {
    if (!regForm.name.trim()) return;
    setRegSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/portfolios/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(regForm),
      });
      if (res.ok) {
        setCompanyInfo({ ...regForm, activity: regForm.oked });
        setActiveOrg(regForm.inn || 'org', regForm.name);
      }
    } catch {}
    finally { setRegSaving(false); }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportStatus('Загружаем файл...');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/portfolios/import/excel`,
        { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form }
      );
      if (res.ok) {
        const data = await res.json();
        setImportStatus('Файл загружен — отчёты обновляются...');
        if (data?.company_info) {
          setCompanyInfo(data.company_info);
          // Auto-fill form from uploaded data
          setRegForm(prev => ({
            ...prev,
            name: data.company_info.name || prev.name,
            inn: data.company_info.inn || prev.inn,
            oked: data.company_info.activity || prev.oked,
            address: data.company_info.address || prev.address,
            director: data.company_info.director || prev.director,
            accountant: data.company_info.accountant || prev.accountant,
          }));
        }
        setActiveTab(t => { const old = t; setTimeout(() => setActiveTab(old), 50); return 'nsbu'; });
      } else {
        setImportStatus(`Ошибка загрузки: ${res.status}`);
      }
    } catch { setImportStatus('Ошибка сети'); }
    finally { setLoading(false); }
  }

  async function handle1CExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportStatus('Загружаем выгрузку 1С...');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/analytics/import/1c-excel`,
        { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form }
      );
      if (res.ok) {
        const data = await res.json();
        const parsed = data.sheets_parsed?.length || 0;
        const found = data.sheets_found?.length || 0;
        setImportStatus(`1С импорт завершён: ${parsed}/${found} листов обработано, ${data.accounts_count || 0} счетов ОСВ`);
        if (data?.company_info) {
          setCompanyInfo(data.company_info);
          setRegForm(prev => ({
            ...prev,
            name: data.company_info.name || prev.name,
            inn: data.company_info.inn || prev.inn,
            oked: data.company_info.activity || prev.oked,
            address: data.company_info.address || prev.address,
            director: data.company_info.director || prev.director,
            accountant: data.company_info.accountant || prev.accountant,
          }));
        }
        if (data.warnings?.length) {
          setImportStatus(prev => prev + ` | Предупреждения: ${data.warnings.join(', ')}`);
        }
      } else {
        const err = await res.json().catch(() => null);
        setImportStatus(`Ошибка импорта 1С: ${err?.detail || res.status}`);
      }
    } catch { setImportStatus('Ошибка сети при импорте 1С'); }
    finally { setLoading(false); }
  }

  const orgTypes: { key: OrgType; icon: string; label: string }[] = [
    { key: 'solo', icon: '🏢', label: 'Solo (одно юрлицо)' },
    { key: 'branch', icon: '🏗', label: 'Филиал (подразделение)' },
    { key: 'holding', icon: '🏛', label: 'Холдинг (группа компаний)' },
  ];

  const sizes: { key: OrgSize; label: string }[] = [
    { key: 'small', label: 'Малое' },
    { key: 'medium', label: 'Среднее' },
    { key: 'large', label: 'Крупное' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🗂 Портфели — Финансовый профиль</h2>
        <p className="text-sm text-gray-500">
          Зарегистрируйте организацию и загрузите данные — система автоматически построит отчёты НСБУ и МСФО.
        </p>
      </div>

      {/* Company card or registration form */}
      {companyInfo?.name ? (
        <CompanyCard info={companyInfo} />
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="font-semibold text-gray-800 mb-4">📋 Регистрация организации</h3>

          {/* Org type selector */}
          <div className="flex flex-wrap gap-3 mb-5">
            {orgTypes.map(t => (
              <button key={t.key} onClick={() => setRegForm(f => ({ ...f, org_type: t.key }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition ${
                  regForm.org_type === t.key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}>
                <span className="text-xl">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Наименование организации *</label>
              <input type="text" value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="ООО «Компания»" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ИНН</label>
              <input type="text" value={regForm.inn} onChange={e => setRegForm(f => ({ ...f, inn: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="123456789" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ОКЭД / Вид деятельности</label>
              <input type="text" value={regForm.oked} onChange={e => setRegForm(f => ({ ...f, oked: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="41.20 — Строительство" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Юридический адрес</label>
              <input type="text" value={regForm.address} onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="г. Ташкент, ул. ..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Директор</label>
              <input type="text" value={regForm.director} onChange={e => setRegForm(f => ({ ...f, director: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="Иванов И.И." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Главный бухгалтер</label>
              <input type="text" value={regForm.accountant} onChange={e => setRegForm(f => ({ ...f, accountant: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                placeholder="Петрова А.А." />
            </div>
          </div>

          {/* Size selector */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-2">Размер предприятия</label>
            <div className="flex gap-3">
              {sizes.map(s => (
                <button key={s.key} onClick={() => setRegForm(f => ({ ...f, size: s.key }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                    regForm.size === s.key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleRegister} disabled={!regForm.name.trim() || regSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition">
            💾 Зарегистрировать организацию
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="font-semibold text-gray-800 mb-4">📤 Источник данных</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
            <div className="text-3xl mb-2">🗂</div>
            <p className="font-medium text-gray-700 text-sm">Импорт из 1С</p>
            <p className="text-xs text-gray-400 mt-1">Excel выгрузка (10 листов)</p>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handle1CExcelUpload} id="upload-1c" />
            <label htmlFor="upload-1c" className="mt-2 inline-block text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-100">
              Выбрать файл
            </label>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-green-400 transition-all">
            <div className="text-3xl mb-2">📊</div>
            <p className="font-medium text-gray-700 text-sm">Загрузить Excel</p>
            <p className="text-xs text-gray-400 mt-1">Шаблон НСБУ + МСФО</p>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} id="upload-excel" />
            <label htmlFor="upload-excel" className="mt-2 inline-block text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full cursor-pointer hover:bg-green-100">
              Выбрать файл
            </label>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-400 transition-all">
            <div className="text-3xl mb-2">📥</div>
            <p className="font-medium text-gray-700 text-sm">Скачать шаблон</p>
            <p className="text-xs text-gray-400 mt-1">Пустой НСБУ + МСФО</p>
            <a href={`${apiBase}/api/v1/portfolios/template/excel`}
              className="mt-2 inline-block text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-full hover:bg-violet-100">
              Скачать .xlsx
            </a>
          </div>
        </div>
        {loading && <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-500">Выполняется загрузка...</div>}
        {importStatus && <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">{importStatus}</div>}
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-2">
        <div className="flex flex-wrap gap-2">
          {(['nsbu', 'ifrs', 'diff'] as ActiveTab[]).map(tab => {
            const labels: Record<ActiveTab, string> = { nsbu: '🇺🇿 НСБУ', ifrs: '🌍 МСФО (IAS 1)', diff: 'Δ Разница' };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? tab === 'nsbu' ? 'bg-blue-600 text-white'
                      : tab === 'ifrs' ? 'bg-green-600 text-white'
                      : 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'nsbu' && <NsbuReport />}
      {activeTab === 'ifrs' && <IfrsReport />}
      {activeTab === 'diff' && <DiffReport />}

      <NextStepBanner
        label="Перейти к Аналитике KPI →"
        href="/analytics/analytics"
        description="Финансовые коэффициенты и DCF-оценка"
      />
    </div>
  );
}
