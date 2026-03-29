'use client';

import React, { useEffect, useState } from 'react';

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

function fmtUZS(n: number | null | undefined): string {
  if (n === null || n === undefined) return '---';
  return new Intl.NumberFormat('ru-UZ', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' UZS';
}

function NsbuReport() {
  const [rows, setRows] = useState<NsbuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceOk, setBalanceOk] = useState<boolean | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/balance`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rows) {
          setRows(data.rows);
          const totalAsset = data.rows.filter((r: NsbuRow) => r.isTotalAsset)?.[0]?.current ?? 0;
          const totalLiab = data.rows.filter((r: NsbuRow) => r.isTotalLiability)?.[0]?.current ?? 0;
          setBalanceOk(Math.abs(totalAsset - totalLiab) < 1);
        }
        if (data?.company_info) setCompanyInfo(data.company_info);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center py-8 text-gray-400">⏳ Загружаем НСБУ...</div>;
  if (!rows.length) return (
    <div className="text-center py-12 bg-white rounded-xl border border-[#e2e8f0]">
      <div className="text-4xl mb-3">📄</div>
      <p className="text-gray-500">Нет данных НСБУ</p>
      <p className="text-sm text-gray-400 mt-1">Сначала загрузите данные из 1С или Excel</p>
    </div>
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
                <td className="py-2 px-4 text-right">{fmtUZS(row.current)}</td>
                <td className="py-2 px-4 text-right text-gray-500">{fmtUZS(row.previous)}</td>
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
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/ifrs/balance`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center py-8 text-gray-400">⏳ Загружаем МСФО...</div>;
  if (!rows.length) return (
    <div className="text-center py-12 bg-white rounded-xl border border-[#e2e8f0]">
      <div className="text-4xl mb-3">🌍</div>
      <p className="text-gray-500">Нет данных МСФО</p>
      <p className="text-sm text-gray-400 mt-1">Сначала загрузите данные из 1С или Excel</p>
    </div>
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
                <td className="py-2 px-4 text-right">{fmtUZS(row.current)}</td>
                <td className="py-2 px-4 text-right text-gray-500">{fmtUZS(row.previous)}</td>
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

  if (loading) return <div className="text-center py-8 text-gray-400">⏳ Загружаем разницу...</div>;
  if (!rows.length) return (
    <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-[#e2e8f0] p-6">Данные по разнице НСБУ / МСФО пока отсутствуют</div>
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
                  <td className="py-2 px-4 text-right">{fmtUZS(row.nsbu)}</td>
                  <td className="py-2 px-4 text-right">{fmtUZS(row.ifrs)}</td>
                  <td className={`py-2 px-4 text-right font-medium ${
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>{delta !== 0 ? fmtUZS(delta) : '—'}</td>
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

export default function PortfoliosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nsbu');
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') || '' : '';

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setImportStatus('Загружаем файл...');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/import/excel`,
        { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form }
      );
      if (res.ok) {
        setImportStatus('✅ Файл загружен — отчёты обновляются...');
        // force re-render reports
        setActiveTab(t => { const old = t; setTimeout(() => setActiveTab(old), 50); return 'nsbu'; });
      } else {
        setImportStatus(`❌ Ошибка загрузки: ${res.status}`);
      }
    } catch { setImportStatus('❌ Ошибка сети'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">🗂 Портфели — Финансовый профиль</h2>
        <p className="text-sm text-gray-500">
          Загрузите данные из 1С или Excel — система автоматически построит отчёты НСБУ и МСФО.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="font-semibold text-gray-800 mb-4">📤 Источник данных</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
            <div className="text-3xl mb-2">🗂</div>
            <p className="font-medium text-gray-700 text-sm">Загрузить из 1С</p>
            <p className="text-xs text-gray-400 mt-1">XML / CSV выгрузка</p>
            <input type="file" accept=".xml,.csv" className="hidden" onChange={handleExcelUpload} id="upload-1c" />
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
            <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/template/excel`}
              className="mt-2 inline-block text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-full hover:bg-violet-100">
              Скачать .xlsx
            </a>
          </div>
        </div>
        {loading && <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-500">⏳ Выполняется загрузка...</div>}
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
    </div>
  );
}
