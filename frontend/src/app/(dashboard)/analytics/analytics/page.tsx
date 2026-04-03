'use client';
import { useState, useEffect } from 'react';
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

interface KpiMetric {
  key: string;
  label: string;
  value: number | null;
  formula: string;
  norm: string;
  status: 'ok' | 'warn' | 'bad';
  standard: 'nsbu' | 'ifrs' | 'both';
}

interface KpiGroup {
  title: string;
  icon: string;
  metrics: KpiMetric[];
}

interface DcfResult {
  wacc: number;
  fcff_year1: number;
  fcff_year2: number;
  fcff_year3: number;
  terminal_value: number;
  pv_fcff: number;
  enterprise_value: number;
  equity_value: number;
  intrinsic_value_per_share: number;
  market_value?: number;
  upside_pct?: number;
}

function fmtUZS(n: number | null | undefined): string {
  if (n === null || n === undefined) return '---';
  return new Intl.NumberFormat('ru-UZ', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' UZS';
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  const statusColor = {
    ok: 'border-emerald-300 bg-emerald-50',
    warn: 'border-yellow-300 bg-yellow-50',
    bad: 'border-red-300 bg-red-50',
  }[metric.status];
  const valueColor = {
    ok: 'text-emerald-700',
    warn: 'text-yellow-700',
    bad: 'text-red-700',
  }[metric.status];

  return (
    <div className={`rounded-xl border-2 p-4 ${statusColor}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{metric.label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>
        {metric.value !== null && metric.value !== undefined
          ? (metric.key.includes('margin') || metric.key.includes('roe') || metric.key.includes('roa')
            ? `${(metric.value * 100).toFixed(1)}%`
            : metric.value.toFixed(2) + (metric.key.includes('ratio') ? 'x' : ''))
          : '---'}
      </p>
      <p className="text-xs text-gray-400 mt-1">Норма: {metric.norm}</p>
      <p className="text-xs text-gray-300 mt-0.5 font-mono truncate">{metric.formula}</p>
    </div>
  );
}

interface AiConclusion {
  category: string;
  status: 'ok' | 'warn' | 'bad';
  text: string;
}

function AiAnalysisBlock() {
  const [conclusions, setConclusions] = useState<AiConclusion[]>([]);
  const [overall, setOverall] = useState('');
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/ai-analysis`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setConclusions(d.conclusions || []);
          setOverall(d.overall || '');
          setScore(d.score || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const statusStyle = {
    ok: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600' },
    warn: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: 'text-yellow-600' },
    bad: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: 'text-red-600' },
  };
  const statusLabel = { ok: 'OK', warn: 'ВНИМАНИЕ', bad: 'КРИТИЧНО' };
  const statusIcon = { ok: '\u2705', warn: '\u26a0\ufe0f', bad: '\u274c' };

  if (loading) return <div className="text-center py-4 text-gray-400">AI-анализ загружается...</div>;
  if (!conclusions.length) return null;

  const overallColor = score >= 70 ? 'from-emerald-500 to-green-600' : score >= 40 ? 'from-yellow-500 to-amber-600' : 'from-red-500 to-rose-600';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${overallColor} flex items-center justify-center text-white text-lg`}>
            AI
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">AI-анализ финансового состояния</h3>
            <p className="text-sm text-gray-500">{overall}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            score >= 70 ? 'bg-emerald-100 text-emerald-700' : score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }`}>
            {score.toFixed(0)}% в норме
          </span>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-3">
          {conclusions.map((c, i) => {
            const s = statusStyle[c.status] || statusStyle.warn;
            return (
              <div key={i} className={`rounded-xl border p-4 ${s.bg}`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{statusIcon[c.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{c.category}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.badge}`}>
                        {statusLabel[c.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DcfBlock() {
  const [dcf, setDcf] = useState<DcfResult | null>(null);
  const [wacc, setWacc] = useState('');
  const [growthRate, setGrowthRate] = useState('');
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  async function runDcf() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/dcf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            wacc: parseFloat(wacc) / 100,
            growth_rate: parseFloat(growthRate) / 100,
          }),
        }
      );
      if (res.ok) setDcf(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h3 className="text-white font-bold text-lg mb-4">💰 DCF-оценка (Discounted Cash Flow)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-slate-400 text-xs block mb-1">WACC (%)</label>
          <input type="number" value={wacc} onChange={e => setWacc(e.target.value)}
            placeholder="15.0"
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm" />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Темп роста (%)</label>
          <input type="number" value={growthRate} onChange={e => setGrowthRate(e.target.value)}
            placeholder="5.0"
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-white text-sm" />
        </div>
        <div className="flex items-end">
          <button onClick={runDcf} disabled={loading || !wacc || !growthRate}
            className="w-full bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl px-4 py-2 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40">
            {loading ? '⏳' : '▶️ Рассчитать DCF'}
          </button>
        </div>
      </div>
      {dcf && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'WACC', value: `${(dcf.wacc * 100).toFixed(1)}%` },
            { label: 'EV (Enterprise Value)', value: fmtUZS(dcf.enterprise_value) },
            { label: 'Equity Value', value: fmtUZS(dcf.equity_value) },
            { label: 'Intrinsic Value / акция', value: fmtUZS(dcf.intrinsic_value_per_share) },
            { label: 'PV of FCFF', value: fmtUZS(dcf.pv_fcff) },
            { label: 'Terminal Value', value: fmtUZS(dcf.terminal_value) },
            {
              label: 'Upside / Downside',
              value: dcf.upside_pct != null ? `${dcf.upside_pct > 0 ? '+' : ''}${dcf.upside_pct.toFixed(1)}%` : '---',
              special: dcf.upside_pct,
            },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${
                'special' in item && item.special != null
                  ? (item.special > 0 ? 'text-emerald-400' : 'text-red-400')
                  : 'text-white'
              }`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MultipliersBlock() {
  const [data, setData] = useState<Record<string, number | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/multiples`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const multiples = [
    { key: 'pe', label: 'P/E', bench: '< 15x', desc: 'Цена / Прибыль', suffix: 'x' },
    { key: 'pb', label: 'P/B', bench: '< 2x', desc: 'Цена / Балансовая стоимость', suffix: 'x' },
    { key: 'ev_ebitda', label: 'EV/EBITDA', bench: '< 8x', desc: 'Стоимость / EBITDA', suffix: 'x' },
    { key: 'ev_revenue', label: 'EV/Выручка', bench: '< 3x', desc: 'Стоимость / Выручка', suffix: 'x' },
    { key: 'ps', label: 'P/S', bench: '< 2x', desc: 'Цена / Выручка', suffix: 'x' },
    { key: 'dividend_yield', label: 'Div Yield', bench: '> 3%', desc: 'Дивидендная доходность', suffix: '%' },
  ];

  if (loading) return <div className="text-center py-4 text-gray-400">⏳ Загружаем мультипликаторы...</div>;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Рыночные мультипликаторы</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {multiples.map(m => {
          const val = data?.[m.key];
          return (
            <div key={m.key}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 hover:shadow-md transition-all">
              <p className="text-xs text-gray-400 mb-1">{m.desc}</p>
              <p className="text-2xl font-bold text-gray-900">
                {val != null ? val.toFixed(1) + m.suffix : '---'}
              </p>
              <p className="text-lg font-semibold text-blue-600 mt-1">{m.label}</p>
              <p className="text-xs text-gray-400 mt-1">Норма: {m.bench}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsAnalyticsPage() {
  const [kpiGroups, setKpiGroups] = useState<KpiGroup[]>([]);
  const [activeStandard, setActiveStandard] = useState<'nsbu' | 'ifrs'>('nsbu');
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/kpi?standard=${activeStandard}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.groups) setKpiGroups(d.groups); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeStandard, token]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">📈 Финансовые коэффициенты (32 KPI)</h2>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button onClick={() => setActiveStandard('nsbu')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeStandard === 'nsbu' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}>
            🇺🇿 НСБУ
          </button>
          <button onClick={() => setActiveStandard('ifrs')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeStandard === 'ifrs' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}>
            🌍 МСФО
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">⏳ Рассчитываем коэффициенты...</div>
      ) : kpiGroups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-500 font-medium">Коэффициенты рассчитываются автоматически</p>
          <p className="text-sm text-gray-400 mt-1">Сначала загрузите финансовые данные в разделе «Портфели»</p>
        </div>
      ) : (
        kpiGroups.map((group, gi) => (
          <div key={gi}>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{group.icon} {group.title}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.metrics.map((m, mi) => <KpiCard key={mi} metric={m} />)}
            </div>
          </div>
        ))
      )}

      <AiAnalysisBlock />
      <DcfBlock />
      <MultipliersBlock />

      <div className="flex justify-end">
        <ExportFullReportButton portfolioId={0} />
      </div>
    </div>
  );
}
