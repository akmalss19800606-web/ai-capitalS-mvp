'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, BookOpen } from 'lucide-react';
import { formatCurrencyUZS } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingCard } from '@/components/ui/LoadingCard';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { NextStepBanner } from '@/components/analytics/NextStepBanner';
import { IfrsAdjustmentsPanel } from '@/components/analytics/IfrsAdjustmentsPanel';
import { ExportFullReportButton } from '@/components/analytics/ExportFullReportButton';

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

type ActiveTab = 'nsbu' | 'ifrs' | 'diff' | 'adjustments' | 'reconciliation';

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

interface PnlRow {
  section: string;
  name: string;
  current_year: number;
  previous_year: number;
  source?: string;
}

interface CashFlowRow {
  section: string;
  group: string;
  name: string;
  inflow: number;
  outflow: number;
  net: number;
  previous_inflow?: number;
  previous_outflow?: number;
  previous_net?: number;
  source?: string;
}

interface CapitalRow {
  name: string;
  balance_start: number;
  movement: number;
  balance_end: number;
}

interface FixedAssetRow {
  section: string;
  category: string;
  balance_start?: number;
  inflow?: number;
  disposal?: number;
  revaluation?: number;
  balance_end?: number;
  useful_life?: number;
  accum_start?: number;
  charged?: number;
  disposal_accum?: number;
  accum_end?: number;
  rate?: number;
}

type NsbuSubTab = 'balance' | 'pnl' | 'cashflow' | 'capital' | 'fixed_assets';

function NsbuBalanceTable({ rows, companyInfo, balanceOk }: {
  rows: NsbuRow[];
  companyInfo: any;
  balanceOk: boolean | null;
}) {
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
          {balanceOk ? 'Баланс сходится (Активы = Обязательства + Капитал)' : 'Баланс не сходится — проверьте данные'}
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

function NsbuPnlTable() {
  const [rows, setRows] = useState<PnlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/pnl`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState icon={<span>---</span>} title="Нет данных ОПиУ" description="Загрузите выгрузку 1С с листом Доходы и Расходы" />
  );

  let currentSection = '';
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">Наименование</th>
              <th className="text-right py-3 px-4">За отчётный период</th>
              <th className="text-right py-3 px-4 rounded-tr-lg">За предыдущий период</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const showSection = row.section && row.section !== currentSection;
              if (showSection) currentSection = row.section;
              return (
                <React.Fragment key={i}>
                  {showSection && (
                    <tr className="bg-blue-50">
                      <td colSpan={3} className="py-2 px-4 font-semibold text-blue-800 uppercase text-xs">
                        {row.section}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 pl-8">{row.name}</td>
                    <td className={`py-2 px-4 text-right ${row.current_year < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrencyUZS(row.current_year)}
                    </td>
                    <td className={`py-2 px-4 text-right text-gray-500 ${row.previous_year < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrencyUZS(row.previous_year)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NsbuCashFlowTable() {
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [summary, setSummary] = useState<{ cash_begin: number; cash_end: number; net_cash_change: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/cashflow`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.rows) setRows(d.rows);
        if (d?.summary) setSummary(d.summary);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState icon={<span>---</span>} title="Нет данных ДДС" description="Загрузите выгрузку 1С с листом Денежные Средства" />
  );

  const hasPrevious = rows.some(r => (r.previous_inflow ?? 0) !== 0 || (r.previous_outflow ?? 0) !== 0 || (r.previous_net ?? 0) !== 0);
  let currentGroup = '';
  const colCount = hasPrevious ? 7 : 4;
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg" rowSpan={hasPrevious ? 2 : 1}>Наименование</th>
              {hasPrevious ? (
                <>
                  <th className="text-center py-2 px-4 border-b border-slate-600" colSpan={3}>Текущий период</th>
                  <th className="text-center py-2 px-4 border-b border-slate-600 rounded-tr-lg" colSpan={3}>Предыдущий период</th>
                </>
              ) : (
                <>
                  <th className="text-right py-3 px-4">Поступления</th>
                  <th className="text-right py-3 px-4">Выбытие</th>
                  <th className="text-right py-3 px-4 rounded-tr-lg">Нетто</th>
                </>
              )}
            </tr>
            {hasPrevious && (
              <tr className="bg-slate-700 text-white text-xs">
                <th className="text-right py-2 px-4">Поступления</th>
                <th className="text-right py-2 px-4">Выбытие</th>
                <th className="text-right py-2 px-4">Нетто</th>
                <th className="text-right py-2 px-4">Поступления</th>
                <th className="text-right py-2 px-4">Выбытие</th>
                <th className="text-right py-2 px-4">Нетто</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const showGroup = row.group && row.group !== currentGroup;
              if (showGroup) currentGroup = row.group;
              return (
                <React.Fragment key={i}>
                  {showGroup && (
                    <tr className="bg-blue-50">
                      <td colSpan={colCount} className="py-2 px-4 font-semibold text-blue-800 uppercase text-xs">
                        {row.group}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 pl-8">{row.name}</td>
                    <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.inflow)}</td>
                    <td className={`py-2 px-4 text-right ${row.outflow > 0 ? 'text-red-600' : ''}`}>
                      {formatCurrencyUZS(row.outflow)}
                    </td>
                    <td className={`py-2 px-4 text-right font-medium ${row.net < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrencyUZS(row.net)}
                    </td>
                    {hasPrevious && (
                      <>
                        <td className="py-2 px-4 text-right text-gray-500">{formatCurrencyUZS(row.previous_inflow ?? 0)}</td>
                        <td className={`py-2 px-4 text-right text-gray-500 ${(row.previous_outflow ?? 0) > 0 ? 'text-red-400' : ''}`}>
                          {formatCurrencyUZS(row.previous_outflow ?? 0)}
                        </td>
                        <td className={`py-2 px-4 text-right font-medium ${(row.previous_net ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatCurrencyUZS(row.previous_net ?? 0)}
                        </td>
                      </>
                    )}
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Cash summary from balance sheet for reconciliation */}
            {summary && (
              <>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td colSpan={colCount} className="py-1" />
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-4 font-medium text-slate-700">ДС на начало периода (по балансу)</td>
                  <td className="py-2 px-4" colSpan={hasPrevious ? 2 : 2} />
                  <td className="py-2 px-4 text-right font-medium">{formatCurrencyUZS(summary.cash_begin)}</td>
                  {hasPrevious && <td className="py-2 px-4" colSpan={3} />}
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-4 font-medium text-slate-700">ДС на конец периода (по балансу)</td>
                  <td className="py-2 px-4" colSpan={hasPrevious ? 2 : 2} />
                  <td className="py-2 px-4 text-right font-medium">{formatCurrencyUZS(summary.cash_end)}</td>
                  {hasPrevious && <td className="py-2 px-4" colSpan={3} />}
                </tr>
                <tr className="bg-emerald-50 font-bold">
                  <td className="py-2 px-4 text-emerald-800">Чистое изменение ДС (конец - начало)</td>
                  <td className="py-2 px-4" colSpan={hasPrevious ? 2 : 2} />
                  <td className={`py-2 px-4 text-right ${summary.net_cash_change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrencyUZS(summary.net_cash_change)}
                  </td>
                  {hasPrevious && <td className="py-2 px-4" colSpan={3} />}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NsbuCapitalTable() {
  const [rows, setRows] = useState<CapitalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/capital`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingCard rows={4} />;
  if (!rows.length) return (
    <EmptyState icon={<span>---</span>} title="Нет данных по капиталу" description="Загрузите выгрузку 1С с листом Капитал" />
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      <div className="overflow-x-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-3 px-4 rounded-tl-lg">Наименование</th>
              <th className="text-right py-3 px-4">Остаток на начало</th>
              <th className="text-right py-3 px-4">Движение</th>
              <th className="text-right py-3 px-4 rounded-tr-lg">Остаток на конец</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-4">{row.name}</td>
                <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.balance_start)}</td>
                <td className={`py-2 px-4 text-right ${row.movement < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrencyUZS(row.movement)}
                </td>
                <td className="py-2 px-4 text-right font-medium">{formatCurrencyUZS(row.balance_end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FixedAssetTotals {
  cost_balance_start: number;
  cost_inflow: number;
  cost_disposal: number;
  cost_revaluation: number;
  cost_balance_end: number;
  depr_accum_start: number;
  depr_charged: number;
  depr_disposal_accum: number;
  depr_accum_end: number;
  net_book_start: number;
  net_book_end: number;
}

function NsbuFixedAssetsTable() {
  const [rows, setRows] = useState<FixedAssetRow[]>([]);
  const [totals, setTotals] = useState<FixedAssetTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports/nsbu/fixed-assets`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rows) setRows(d.rows); if (d?.totals) setTotals(d.totals); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState icon={<span>---</span>} title="Нет данных по основным средствам" description="Загрузите выгрузку 1С с листом Основные Средства" />
  );

  const costRows = rows.filter(r => r.section === 'cost');
  const deprRows = rows.filter(r => r.section === 'depreciation');

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] space-y-6">
      {costRows.length > 0 && (
        <div className="overflow-x-auto p-6 pb-0">
          <h4 className="font-semibold text-blue-800 mb-3 uppercase text-xs">Первоначальная стоимость</h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left py-3 px-4 rounded-tl-lg">Категория ОС</th>
                <th className="text-right py-3 px-4">На начало</th>
                <th className="text-right py-3 px-4">Поступление</th>
                <th className="text-right py-3 px-4">Выбытие</th>
                <th className="text-right py-3 px-4">Переоценка</th>
                <th className="text-right py-3 px-4 rounded-tr-lg">На конец</th>
              </tr>
            </thead>
            <tbody>
              {costRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-4">{row.category}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.balance_start ?? 0)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.inflow ?? 0)}</td>
                  <td className={`py-2 px-4 text-right ${(row.disposal ?? 0) > 0 ? 'text-red-600' : ''}`}>
                    {formatCurrencyUZS(row.disposal ?? 0)}
                  </td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.revaluation ?? 0)}</td>
                  <td className="py-2 px-4 text-right font-medium">{formatCurrencyUZS(row.balance_end ?? 0)}</td>
                </tr>
              ))}
              {totals && (
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="py-2 px-4">ИТОГО</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.cost_balance_start)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.cost_inflow)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.cost_disposal)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.cost_revaluation)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.cost_balance_end)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {deprRows.length > 0 && (
        <div className="overflow-x-auto p-6 pt-0">
          <h4 className="font-semibold text-blue-800 mb-3 uppercase text-xs">Накопленная амортизация</h4>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left py-3 px-4 rounded-tl-lg">Категория ОС</th>
                <th className="text-right py-3 px-4">На начало</th>
                <th className="text-right py-3 px-4">Начислено</th>
                <th className="text-right py-3 px-4">Выбытие</th>
                <th className="text-right py-3 px-4 rounded-tr-lg">На конец</th>
              </tr>
            </thead>
            <tbody>
              {deprRows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-4">{row.category}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.accum_start ?? 0)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.charged ?? 0)}</td>
                  <td className={`py-2 px-4 text-right ${(row.disposal_accum ?? 0) > 0 ? 'text-red-600' : ''}`}>
                    {formatCurrencyUZS(row.disposal_accum ?? 0)}
                  </td>
                  <td className="py-2 px-4 text-right font-medium">{formatCurrencyUZS(row.accum_end ?? 0)}</td>
                </tr>
              ))}
              {totals && (
                <tr className="bg-slate-800 text-white font-bold">
                  <td className="py-2 px-4">ИТОГО</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.depr_accum_start)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.depr_charged)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.depr_disposal_accum)}</td>
                  <td className="py-2 px-4 text-right">{formatCurrencyUZS(totals.depr_accum_end)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {totals && (
        <div className="overflow-x-auto p-6 pt-0">
          <h4 className="font-semibold text-blue-800 mb-3 uppercase text-xs">Балансовая (остаточная) стоимость</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600">На начало периода</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrencyUZS(totals.net_book_start)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600">На конец периода</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrencyUZS(totals.net_book_end)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NsbuReport() {
  const [subTab, setSubTab] = useState<NsbuSubTab>('balance');
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
      icon={<span>---</span>}
      title="Нет данных НСБУ"
      description="Сначала загрузите данные из 1С или Excel"
    />
  );

  const subTabs: { key: NsbuSubTab; label: string }[] = [
    { key: 'balance', label: 'Баланс' },
    { key: 'pnl', label: 'ОПиУ' },
    { key: 'cashflow', label: 'ДДС' },
    { key: 'capital', label: 'Капитал' },
    { key: 'fixed_assets', label: 'Движение ОС' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              subTab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'balance' && <NsbuBalanceTable rows={rows} companyInfo={companyInfo} balanceOk={balanceOk} />}
      {subTab === 'pnl' && <NsbuPnlTable />}
      {subTab === 'cashflow' && <NsbuCashFlowTable />}
      {subTab === 'capital' && <NsbuCapitalTable />}
      {subTab === 'fixed_assets' && <NsbuFixedAssetsTable />}
    </div>
  );
}

// ── IFRS sub-tab types ──────────────────────────────────────────────
type IfrsSubTab = 'position' | 'income' | 'cashflow' | 'equity' | 'notes';

const IFRS_SUB_TABS: { key: IfrsSubTab; label: string }[] = [
  { key: 'position', label: 'Фин. положение' },
  { key: 'income', label: 'Совокупный доход' },
  { key: 'cashflow', label: 'ДДС' },
  { key: 'equity', label: 'Капитал' },
  { key: 'notes', label: 'Примечания' },
];

// ── Purple IFRS table header ────────────────────────────────────────
const IFRS_HEADER_BG = 'bg-gradient-to-r from-purple-800 to-purple-950';

// ── 1. Statement of Financial Position (existing, restyled) ─────────
function IfrsPositionReport() {
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
      icon={<span className="text-purple-400"><FileText size={40} /></span>}
      title="Нет данных МСФО"
      description="Для формирования отчётности МСФО нажмите «Пересчитать МСФО» на вкладке Корректировки"
    />
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className={`${IFRS_HEADER_BG} text-white`}>
            <th className="text-left py-3 px-4 rounded-tl-lg">IAS 1 — Отчёт о финансовом положении</th>
            <th className="text-center py-3 px-4">Примечание</th>
            <th className="text-right py-3 px-4">Текущий период</th>
            <th className="text-right py-3 px-4 rounded-tr-lg">Предыдущий период</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-100 ${
              row.isHeader ? 'bg-purple-50 font-semibold text-purple-800' :
              row.isTotal ? 'bg-purple-900 text-white font-bold' :
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
  );
}

// ── 2. Statement of Comprehensive Income (P&L + OCI) ────────────────
interface IncomeRow { label: string; amount: number | null; isHeader?: boolean; isTotal?: boolean; note?: string }

function IfrsIncomeReport() {
  const [incomeRows, setIncomeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/api/v1/portfolios/reports/ifrs/income`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted) return;
        if (data?.rows) setIncomeRows(data.rows);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, apiBase]);

  if (loading) return <LoadingCard rows={6} />;
  if (!incomeRows.length) return (
    <EmptyState
      icon={<span className="text-purple-400"><FileText size={40} /></span>}
      title="Нет данных для отчёта о совокупном доходе"
      description="Сначала загрузите файл 1С на вкладке «Портфели»"
    />
  );

  const pnlRows: IncomeRow[] = incomeRows.map(row => ({
    label: row.label || '',
    amount: row.current ?? row.amount ?? null,
    isHeader: row.isHeader,
    isTotal: row.isTotal,
    note: row.note,
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className={`${IFRS_HEADER_BG} text-white`}>
            <th className="text-left py-3 px-4 rounded-tl-lg">IAS 1 — Отчёт о совокупном доходе</th>
            <th className="text-center py-3 px-4">Стандарт</th>
            <th className="text-right py-3 px-4 rounded-tr-lg">Сумма МСФО</th>
          </tr>
        </thead>
        <tbody>
          {pnlRows.map((row, i) => {
            if (!row.label) return <tr key={i}><td colSpan={3} className="py-2" /></tr>;
            return (
              <tr key={i} className={`border-b border-gray-100 ${
                row.isHeader ? 'bg-purple-50 font-semibold text-purple-800' :
                row.isTotal ? 'bg-purple-50 font-bold text-purple-900' :
                'hover:bg-gray-50'
              }`}>
                <td className={`py-2 px-4 ${row.isHeader ? '' : 'pl-8'}`}>{row.label}</td>
                <td className="py-2 px-4 text-center text-gray-400 text-xs">{row.note || ''}</td>
                <td className={`py-2 px-4 text-right ${
                  row.amount !== null && row.amount < 0 ? 'text-red-600' : ''
                }`}>
                  {row.amount !== null ? formatCurrencyUZS(row.amount) : '---'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 3. Statement of Cash Flows (IAS 7) ──────────────────────────────
interface CashFlowRow { label: string; amount: number | null; isHeader?: boolean; isTotal?: boolean; note?: string }

function IfrsCashFlowReport() {
  const [cfApiRows, setCfApiRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/api/v1/portfolios/reports/ifrs/cashflow`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted) return;
        if (data?.rows) setCfApiRows(data.rows);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, apiBase]);

  if (loading) return <LoadingCard rows={6} />;
  if (!cfApiRows.length) return (
    <EmptyState
      icon={<span className="text-purple-400"><FileText size={40} /></span>}
      title="Нет данных для отчёта о движении денежных средств"
      description="Сначала загрузите файл 1С на вкладке «Портфели»"
    />
  );

  const cfRows: CashFlowRow[] = cfApiRows.map(row => ({
    label: row.label || '',
    amount: row.current ?? row.amount ?? null,
    isHeader: row.isHeader,
    isTotal: row.isTotal,
    note: row.note,
  }));

  return (
    <div className="overflow-x-auto">
      <div className="mx-0 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
        <strong>IAS 7:</strong> Арендный платёж по МСФО разделяется на погашение обязательства (финансовая) + процент (операционная)
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className={`${IFRS_HEADER_BG} text-white`}>
            <th className="text-left py-3 px-4 rounded-tl-lg">IAS 7 — Отчёт о движении денежных средств</th>
            <th className="text-center py-3 px-4">Стандарт</th>
            <th className="text-right py-3 px-4 rounded-tr-lg">Сумма МСФО</th>
          </tr>
        </thead>
        <tbody>
          {cfRows.map((row, i) => {
            if (!row.label) return <tr key={i}><td colSpan={3} className="py-2" /></tr>;
            return (
              <tr key={i} className={`border-b border-gray-100 ${
                row.isHeader ? 'bg-purple-50 font-semibold text-purple-800' :
                row.isTotal ? 'bg-purple-50 font-bold text-purple-900' :
                'hover:bg-gray-50'
              }`}>
                <td className={`py-2 px-4 ${row.isHeader ? '' : 'pl-8'}`}>{row.label}</td>
                <td className="py-2 px-4 text-center text-gray-400 text-xs">{row.note || ''}</td>
                <td className={`py-2 px-4 text-right ${
                  row.amount !== null && row.amount < 0 ? 'text-red-600' : ''
                }`}>
                  {row.amount !== null ? formatCurrencyUZS(row.amount) : '---'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── 4. Statement of Changes in Equity (IAS 1) ───────────────────────
interface EquityChangeRow {
  label: string;
  charter: number | null;
  emission: number | null;
  ociReserve: number | null;
  retained: number | null;
  total: number | null;
  isHeader?: boolean;
  isTotal?: boolean;
}

function IfrsEquityReport() {
  const [rows, setRows] = useState<IfrsRow[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch(`${apiBase}/api/v1/portfolios/reports/ifrs/balance`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/v1/analytics/ifrs-convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ portfolio_id: 1, period_from: '2025-01-01', period_to: '2025-12-31' }),
      }).then(r => r.ok ? r.json() : null),
    ]).then(([balData, adjData]) => {
      if (!mounted) return;
      if (balData?.rows) setRows(balData.rows);
      if (adjData?.adjustments) setAdjustments(adjData.adjustments);
      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, apiBase]);

  if (loading) return <LoadingCard rows={5} />;
  if (!rows.length) return (
    <EmptyState
      icon={<span className="text-purple-400"><FileText size={40} /></span>}
      title="Нет данных для отчёта об изменениях в капитале"
      description="Для формирования отчётности МСФО нажмите «Пересчитать МСФО» на вкладке Корректировки"
    />
  );

  // Extract equity values from IFRS balance rows
  const findRow = (search: string) => rows.find(r => r.label.includes(search));
  const charterRow = findRow('Уставный капитал');
  const retainedRow = findRow('Нераспределённая прибыль');
  const profitRow = findRow('Прибыль текущего периода');
  const revaluation = adjustments.find(a => a.adjustment_type === 'ias16_revaluation');

  const charterCurrent = charterRow?.current ?? 0;
  const charterPrevious = charterRow?.previous ?? 0;
  const retainedCurrent = retainedRow?.current ?? 0;
  const retainedPrevious = retainedRow?.previous ?? 0;
  const netProfit = profitRow?.current ?? 0;
  const ociAmount = revaluation?.difference ?? 0;

  const equityRows: EquityChangeRow[] = [
    {
      label: 'На начало периода',
      charter: charterPrevious,
      emission: null,
      ociReserve: null,
      retained: retainedPrevious,
      total: charterPrevious + retainedPrevious,
    },
    {
      label: 'Чистая прибыль',
      charter: null,
      emission: null,
      ociReserve: null,
      retained: netProfit || null,
      total: netProfit || null,
    },
    {
      label: 'Прочий совокупный доход',
      charter: null,
      emission: null,
      ociReserve: ociAmount || null,
      retained: null,
      total: ociAmount || null,
    },
    {
      label: 'Дивиденды',
      charter: null,
      emission: null,
      ociReserve: null,
      retained: null,
      total: null,
    },
    {
      label: 'На конец периода',
      charter: charterCurrent,
      emission: null,
      ociReserve: ociAmount || null,
      retained: retainedCurrent + (netProfit || 0),
      total: charterCurrent + (ociAmount || 0) + retainedCurrent + (netProfit || 0),
      isTotal: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="mx-0 mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
        <strong>Отличие от НСБУ:</strong> колонка OCI (резерв переоценки) — результат переоценки ОС по IAS 16
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className={`${IFRS_HEADER_BG} text-white`}>
            <th className="text-left py-3 px-4 rounded-tl-lg">IAS 1 — Изменения в капитале</th>
            <th className="text-right py-3 px-4">Уставный</th>
            <th className="text-right py-3 px-4">Эмиссионный</th>
            <th className="text-right py-3 px-4">Резерв переоценки (OCI)</th>
            <th className="text-right py-3 px-4">Нераспред. прибыль</th>
            <th className="text-right py-3 px-4 rounded-tr-lg">ИТОГО</th>
          </tr>
        </thead>
        <tbody>
          {equityRows.map((row, i) => (
            <tr key={i} className={`border-b border-gray-100 ${
              row.isTotal ? 'bg-purple-900 text-white font-bold' : 'hover:bg-gray-50'
            }`}>
              <td className="py-2 px-4 font-medium">{row.label}</td>
              <td className="py-2 px-4 text-right">{row.charter !== null ? formatCurrencyUZS(row.charter) : '—'}</td>
              <td className="py-2 px-4 text-right">{row.emission !== null ? formatCurrencyUZS(row.emission) : '—'}</td>
              <td className="py-2 px-4 text-right">{row.ociReserve !== null ? formatCurrencyUZS(row.ociReserve) : '—'}</td>
              <td className="py-2 px-4 text-right">{row.retained !== null ? formatCurrencyUZS(row.retained) : '—'}</td>
              <td className="py-2 px-4 text-right font-semibold">{row.total !== null ? formatCurrencyUZS(row.total) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 5. Notes to Financial Statements (IAS 1) ────────────────────────
function IfrsNotesReport() {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [rows, setRows] = useState<IfrsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetch(`${apiBase}/api/v1/portfolios/reports/ifrs/balance`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBase}/api/v1/analytics/ifrs-convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ portfolio_id: 1, period_from: '2025-01-01', period_to: '2025-12-31' }),
      }).then(r => r.ok ? r.json() : null),
    ]).then(([balData, adjData]) => {
      if (!mounted) return;
      if (balData?.rows) setRows(balData.rows);
      if (adjData?.adjustments) setAdjustments(adjData.adjustments);
      setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, apiBase]);

  if (loading) return <LoadingCard rows={4} />;
  if (!rows.length && !adjustments.length) return (
    <EmptyState
      icon={<span className="text-purple-400"><BookOpen size={40} /></span>}
      title="Нет данных для примечаний"
      description="Для формирования отчётности МСФО нажмите «Пересчитать МСФО» на вкладке Корректировки"
    />
  );

  const toggleSection = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  // Extract data for notes
  const revaluation = adjustments.find(a => a.adjustment_type === 'ias16_revaluation');
  const impairment = adjustments.find(a => a.adjustment_type === 'ias36_impairment');
  const lease = adjustments.find(a => a.adjustment_type === 'ifrs16_lease');
  const findBalRow = (search: string) => rows.find(r => r.label.includes(search));
  const faRow = findBalRow('Основные средства');

  const sections = [
    {
      title: '1. Учётная политика',
      content: (
        <div className="text-sm text-gray-700 leading-relaxed">
          <p>Отчётность подготовлена в соответствии с Международными стандартами финансовой отчётности (МСФО).</p>
          <p className="mt-2">Основные применённые стандарты:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>IAS 1</strong> — Представление финансовой отчётности</li>
            <li><strong>IAS 7</strong> — Отчёт о движении денежных средств</li>
            <li><strong>IAS 16</strong> — Основные средства (модель переоценки)</li>
            <li><strong>IFRS 9</strong> — Финансовые инструменты (модель ожидаемых кредитных убытков)</li>
            <li><strong>IFRS 16</strong> — Аренда (модель права пользования)</li>
          </ul>
        </div>
      ),
    },
    {
      title: '2. Основные средства (IAS 16)',
      content: (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-purple-50 text-purple-800">
              <th className="text-left py-2 px-3">Наименование</th>
              <th className="text-right py-2 px-3">Первонач. стоимость</th>
              <th className="text-right py-2 px-3">Переоценка</th>
              <th className="text-right py-2 px-3">Амортизация</th>
              <th className="text-right py-2 px-3">Остаточная стоимость</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3">Основные средства</td>
              <td className="py-2 px-3 text-right">{formatCurrencyUZS(revaluation?.nsbu_amount ?? faRow?.current)}</td>
              <td className="py-2 px-3 text-right text-purple-600">{formatCurrencyUZS(revaluation?.difference ?? 0)}</td>
              <td className="py-2 px-3 text-right text-gray-500">---</td>
              <td className="py-2 px-3 text-right font-medium">{formatCurrencyUZS(revaluation?.ifrs_amount ?? faRow?.current)}</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      title: '3. Дебиторская задолженность (IFRS 9)',
      content: (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-purple-50 text-purple-800">
              <th className="text-left py-2 px-3">Контрагент</th>
              <th className="text-right py-2 px-3">Сумма</th>
              <th className="text-right py-2 px-3">ECL резерв</th>
              <th className="text-right py-2 px-3">Чистая стоимость</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3">Торговая дебиторская задолженность</td>
              <td className="py-2 px-3 text-right">{formatCurrencyUZS(impairment?.nsbu_amount ?? 0)}</td>
              <td className="py-2 px-3 text-right text-red-600">{formatCurrencyUZS(impairment ? -Math.abs(impairment.difference) : 0)}</td>
              <td className="py-2 px-3 text-right font-medium">{formatCurrencyUZS(impairment?.ifrs_amount ?? 0)}</td>
            </tr>
          </tbody>
        </table>
      ),
    },
    {
      title: '4. Аренда (IFRS 16)',
      content: (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-purple-50 text-purple-800">
              <th className="text-left py-2 px-3">Показатель</th>
              <th className="text-right py-2 px-3">Сумма МСФО</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Актив права пользования (RoU)', value: lease ? (lease.nsbu_amount * 3.5) : null },
              { label: 'Обязательство по аренде', value: lease ? (lease.nsbu_amount * 3.5) : null },
              { label: 'Амортизация ПП-актива', value: lease ? (lease.ifrs_amount * 0.6) : null },
              { label: 'Процентные расходы', value: lease ? (lease.ifrs_amount * 0.4) : null },
            ].map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-3">{item.label}</td>
                <td className="py-2 px-3 text-right font-medium">{formatCurrencyUZS(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      title: '5. Корректировки НСБУ → МСФО',
      content: (
        <div className="text-sm text-gray-700">
          <p>Подробная информация о корректировках доступна на вкладке <strong>«Корректировки МСФО»</strong>.</p>
          <p className="mt-2">Общее количество корректировок: <strong>{adjustments.length}</strong></p>
          {adjustments.length > 0 && (
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {adjustments.map((a, i) => (
                <li key={i}>
                  <span className="font-medium">{a.adjustment_type}</span>: разница {formatCurrencyUZS(a.difference)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
        <strong>IAS 1:</strong> Примечания являются неотъемлемой частью финансовой отчётности по МСФО
      </div>
      {sections.map((section, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection(idx)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-purple-50 transition text-left"
          >
            <span className="font-medium text-gray-800">{section.title}</span>
            {openSections.has(idx)
              ? <ChevronUp size={18} className="text-purple-600" />
              : <ChevronDown size={18} className="text-purple-600" />
            }
          </button>
          {openSections.has(idx) && (
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main IFRS Report with sub-tabs ──────────────────────────────────
function IfrsReport() {
  const [subTab, setSubTab] = useState<IfrsSubTab>('position');

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0]">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-100">
        {IFRS_SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              subTab === tab.key
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Sub-tab content */}
      <div className="p-6">
        {subTab === 'position' && <IfrsPositionReport />}
        {subTab === 'income' && <IfrsIncomeReport />}
        {subTab === 'cashflow' && <IfrsCashFlowReport />}
        {subTab === 'equity' && <IfrsEquityReport />}
        {subTab === 'notes' && <IfrsNotesReport />}
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

// ── Reconciliation НСБУ → МСФО ──────────────────────────────────────
interface ReconcProfitRow {
  label: string;
  nsbu: number | null;
  adjustment: number | null;
  ifrs: number | null;
  note?: string;
  isTotal?: boolean;
}

interface ReconcBalanceRow {
  label: string;
  nsbu: number;
  adjustment: number;
  ifrs: number;
  detail?: string;
}

interface ReconcDdsRow {
  label: string;
  nsbu: number;
  adjustment: number;
  ifrs: number;
  note?: string;
  isTotal?: boolean;
}

function ReconciliationReport() {
  const [profitRows, setProfitRows] = useState<ReconcProfitRow[]>([]);
  const [balanceRows, setBalanceRows] = useState<ReconcBalanceRow[]>([]);
  const [ddsRows, setDdsRows] = useState<ReconcDdsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    let mounted = true;
    fetch(`${apiBase}/api/v1/analytics/reconciliation`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!mounted) return;
        if (d?.profit_rows) setProfitRows(d.profit_rows);
        if (d?.balance_rows) setBalanceRows(d.balance_rows);
        if (d?.dds_rows) setDdsRows(d.dds_rows);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token, apiBase]);

  if (loading) return <LoadingCard rows={6} />;
  if (!profitRows.length && !balanceRows.length) return (
    <EmptyState icon={<span>---</span>} title="Нет данных для сверки" description="Загрузите данные из 1С для формирования сверки НСБУ → МСФО" />
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="p-6">
          <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
            <strong>Reconciliation НСБУ → МСФО:</strong> Сверка показателей национальной и международной отчётности с детализацией корректировок
          </div>

          <h4 className="font-semibold text-gray-800 mb-3 text-base">Сверка прибыли (P&L bridge)</h4>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white">
                  <th className="text-left py-3 px-4 rounded-tl-lg">Показатель</th>
                  <th className="text-right py-3 px-4">НСБУ</th>
                  <th className="text-right py-3 px-4">Корректировка</th>
                  <th className="text-right py-3 px-4">МСФО</th>
                  <th className="text-left py-3 px-4 rounded-tr-lg">Примечание</th>
                </tr>
              </thead>
              <tbody>
                {profitRows.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${
                    row.isTotal ? 'bg-indigo-50 font-bold' : 'hover:bg-gray-50'
                  }`}>
                    <td className="py-2 px-4">{row.label}</td>
                    <td className="py-2 px-4 text-right">
                      {row.nsbu !== null ? formatCurrencyUZS(row.nsbu) : ''}
                    </td>
                    <td className={`py-2 px-4 text-right font-medium ${
                      row.adjustment !== null && row.adjustment > 0 ? 'text-emerald-600' :
                      row.adjustment !== null && row.adjustment < 0 ? 'text-red-600' : ''
                    }`}>
                      {row.adjustment !== null ? (row.adjustment > 0 ? '+' : '') + formatCurrencyUZS(row.adjustment) : ''}
                    </td>
                    <td className="py-2 px-4 text-right font-semibold">
                      {row.ifrs !== null ? formatCurrencyUZS(row.ifrs) : ''}
                    </td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{row.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-gray-800 mb-3 text-base">Сверка баланса (Balance bridge)</h4>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white">
                  <th className="text-left py-3 px-4 rounded-tl-lg">Статья</th>
                  <th className="text-right py-3 px-4">НСБУ</th>
                  <th className="text-right py-3 px-4">Корректировка</th>
                  <th className="text-right py-3 px-4">МСФО</th>
                  <th className="text-left py-3 px-4 rounded-tr-lg">Детализация</th>
                </tr>
              </thead>
              <tbody>
                {balanceRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{row.label}</td>
                    <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.nsbu)}</td>
                    <td className={`py-2 px-4 text-right font-medium ${
                      row.adjustment > 0 ? 'text-emerald-600' : row.adjustment < 0 ? 'text-red-600' : ''
                    }`}>
                      {(row.adjustment > 0 ? '+' : '') + formatCurrencyUZS(row.adjustment)}
                    </td>
                    <td className="py-2 px-4 text-right font-semibold">{formatCurrencyUZS(row.ifrs)}</td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{row.detail || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DDS Reconciliation */}
          {ddsRows.length > 0 && (
            <>
              <h4 className="font-semibold text-gray-800 mb-3 text-base">Сверка ДДС (Cash Flow bridge)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white">
                      <th className="text-left py-3 px-4 rounded-tl-lg">Статья</th>
                      <th className="text-right py-3 px-4">НСБУ</th>
                      <th className="text-right py-3 px-4">Корректировка МСФО</th>
                      <th className="text-right py-3 px-4">МСФО</th>
                      <th className="text-left py-3 px-4 rounded-tr-lg">Примечание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ddsRows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${
                        row.isTotal ? 'bg-indigo-50 font-bold' : 'hover:bg-gray-50'
                      }`}>
                        <td className="py-2 px-4 font-medium">{row.label}</td>
                        <td className="py-2 px-4 text-right">{formatCurrencyUZS(row.nsbu)}</td>
                        <td className={`py-2 px-4 text-right font-medium ${
                          row.adjustment > 0 ? 'text-emerald-600' : row.adjustment < 0 ? 'text-red-600' : ''
                        }`}>
                          {row.adjustment !== 0 ? (row.adjustment > 0 ? '+' : '') + formatCurrencyUZS(row.adjustment) : '0'}
                        </td>
                        <td className="py-2 px-4 text-right font-semibold">{formatCurrencyUZS(row.ifrs)}</td>
                        <td className="py-2 px-4 text-gray-500 text-xs">{row.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
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
  const [needsReimport, setNeedsReimport] = useState(false);
  const [regForm, setRegForm] = useState<RegForm>(emptyForm);
  const [regSaving, setRegSaving] = useState(false);
  const [regFormOpen, setRegFormOpen] = useState(false);

  const { setActiveOrg, setPeriod, setActiveStandard, setNsbuReady, setIfrsReady } = useAnalytics();

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') || '' : '';

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  // Load company info on mount and auto-fill registration form (cache or DB fallback)
  useEffect(() => {
    fetch(`${apiBase}/api/v1/portfolios/company-info`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.company_info) {
          setCompanyInfo(d.company_info);
          setActiveOrg(d.company_info.inn || 'org', d.company_info.name || '');
          // Auto-fill registration form from cached/DB data
          setRegForm(prev => ({
            ...prev,
            name: d.company_info.name || prev.name,
            inn: d.company_info.inn || prev.inn,
            oked: d.company_info.activity || prev.oked,
            address: d.company_info.address || prev.address,
            director: d.company_info.director || prev.director,
            accountant: d.company_info.accountant || prev.accountant,
          }));
          // If data loaded from DB (not cache), show reload hint
          if (d.source === 'db' || d.needs_reimport) {
            setNeedsReimport(true);
            setImportStatus(d.message || 'Загрузите файл 1С для обновления данных');
          }
        } else {
          // No company info — auto-open the registration form
          setRegFormOpen(true);
        }
      })
      .catch(() => { setRegFormOpen(true); });
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
          // Auto-fill AnalyticsContext so ContextBar updates immediately
          const orgName = data.company_info.name || '';
          const orgInn = data.company_info.inn || '';
          if (orgName || orgInn) {
            setActiveOrg(orgInn || 'org', orgName);
          }
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
          // Auto-fill AnalyticsContext so ContextBar updates immediately
          const orgName = data.company_info.name || data.organization || '';
          const orgInn = data.company_info.inn || data.inn || '';
          if (orgName) {
            setActiveOrg(orgInn || 'org', orgName);
          }
        }
        // Auto-set period from 1C data
        if (data.period_from && data.period_to) {
          setPeriod(data.period_from, data.period_to);
        }
        // Mark NSBU as ready and set standard
        setActiveStandard('nsbu');
        setNsbuReady(true);
        setNeedsReimport(false);

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

      {/* Reimport banner when data loaded from DB but cache is empty */}
      {needsReimport && companyInfo?.name && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <strong>Данные организации восстановлены из базы.</strong>{' '}
          Загрузите файл 1С для обновления финансовых отчётов.
        </div>
      )}

      {/* Company card */}
      {companyInfo?.name && <CompanyCard info={companyInfo} />}

      {/* Registration / Edit form — always available, collapsed after import */}
      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <button
          onClick={() => setRegFormOpen(o => !o)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition rounded-xl"
        >
          <h3 className="font-semibold text-gray-800">
            {companyInfo?.name ? '✏️ Редактировать реквизиты' : '📋 Регистрация организации'}
          </h3>
          <span className="text-gray-400 text-lg">{regFormOpen ? '▲' : '▼'}</span>
        </button>
        {regFormOpen && (
          <div className="px-6 pb-6">
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
              {companyInfo?.name ? '💾 Сохранить реквизиты' : '💾 Зарегистрировать организацию'}
            </button>
          </div>
        )}
      </div>

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
        <div className="flex flex-wrap items-center gap-2">
          {(['nsbu', 'ifrs', 'diff', 'adjustments', 'reconciliation'] as ActiveTab[]).map(tab => {
            const labels: Record<ActiveTab, string> = { nsbu: '🇺🇿 НСБУ', ifrs: '🌍 МСФО (IAS 1)', diff: 'Δ Разница', adjustments: '🔄 Корректировки МСФО', reconciliation: '🔗 Reconciliation' };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? tab === 'nsbu' ? 'bg-blue-600 text-white'
                      : tab === 'ifrs' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                      : tab === 'adjustments' ? 'bg-indigo-600 text-white'
                      : tab === 'reconciliation' ? 'bg-indigo-700 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {labels[tab]}
              </button>
            );
          })}
          <div className="ml-auto">
            <ExportFullReportButton portfolioId={0} />
          </div>
        </div>
      </div>

      {activeTab === 'nsbu' && <NsbuReport />}
      {activeTab === 'ifrs' && <IfrsReport />}
      {activeTab === 'diff' && <DiffReport />}
      {activeTab === 'adjustments' && (
        <IfrsAdjustmentsPanel portfolioId={1} periodFrom="2025-01-01" periodTo="2025-12-31" />
      )}
      {activeTab === 'reconciliation' && <ReconciliationReport />}

      <NextStepBanner
        label="Перейти к Аналитике KPI →"
        href="/analytics/analytics"
        description="Финансовые коэффициенты и DCF-оценка"
      />
    </div>
  );
}
