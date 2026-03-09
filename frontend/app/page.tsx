'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboard, portfolios as portfoliosApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';

/* ─── Types ─── */
interface DashboardData {
  total_portfolio_value: number;
  portfolio_count: number;
  total_decisions: number;
  active_decisions: number;
  total_investment_value: number;
  high_priority_count: number;
  status_counts: Record<string, number>;
  type_counts: Record<string, number>;
  recent_decisions: RecentDecision[];
  portfolios: { id: number; name: string; total_value: number }[];
}

interface RecentDecision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: number;
  price: number;
  total_value: number;
  status: string;
  priority: string;
  created_at: string;
}

interface CurrencyRate {
  code: string;
  name_ru: string;
  rate: number;
  diff: number;
  date?: string;
}

interface StockMarketData {
  total_issuers: number;
  total_trades: number;
  total_volume: number;
  total_turnover: number;
  last_trade_date?: string;
  top_issuers: { code: string; name: string; trades: number; turnover: number }[];
}

interface CpiData {
  headline_value?: number;
  headline_period?: string;
  headline_comparison?: string;
  categories_count: number;
  data_points: number;
  latest_year?: number;
}

interface CompanyData {
  total_cached: number;
  sources: string[];
}

interface MacroData {
  gdp_total?: number;
  gdp_growth_pct?: number;
  inflation_pct?: number;
  population_mln?: number;
  industrial_growth_pct?: number;
  data_year?: number;
}

interface RealData {
  currencies: CurrencyRate[];
  stock_market: StockMarketData;
  cpi: CpiData;
  companies: CompanyData;
  macro: MacroData;
  data_freshness?: string;
}

/* ─── Constants ─── */
const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', review: 'На проверке', approved: 'Одобрено',
  in_progress: 'В работе', completed: 'Завершено', rejected: 'Отклонено',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#64748b' },
  review: { bg: '#fef3c7', text: '#b45309' },
  approved: { bg: '#dcfce7', text: '#15803d' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8' },
  completed: { bg: '#ede9fe', text: '#6d28d9' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
};
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  BUY: { label: 'Покупка', color: '#15803d' },
  SELL: { label: 'Продажа', color: '#b91c1c' },
  HOLD: { label: 'Удержание', color: '#b45309' },
};

/* ─── Helpers ─── */
function formatUZS(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} млрд UZS`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн UZS`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} тыс UZS`;
  return `${v.toLocaleString('ru-RU')} UZS`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function formatNumber(v: number, dec: number = 0): string {
  return v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/* ─── SVG Icons ─── */
function SvgIcon({ d, size = 18, sw = 1.8 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Reusable Components ─── */
function KpiCard({ title, value, sub, accent, icon }: {
  title: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
      border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, lineHeight: 1.3 }}>{title}</span>
        <div style={{
          width: '34px', height: '34px', borderRadius: '8px',
          backgroundColor: `${accent}12`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0,
        }}>{icon}</div>
      </div>
      <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</span>
      {sub && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{sub}</span>}
    </div>
  );
}

function Section({ title, action, badge, children }: {
  title: string; action?: { label: string; onClick: () => void }; badge?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{title}</span>
          {badge && (
            <span style={{
              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
              backgroundColor: '#dcfce7', color: '#15803d',
            }}>{badge}</span>
          )}
        </div>
        {action && (
          <button onClick={action.onClick} style={{
            fontSize: '12px', color: '#2563eb', background: 'none', border: 'none',
            cursor: 'pointer', fontWeight: 500,
          }}>{action.label}</button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Currency Widget ─── */
function CurrencyWidget({ rates, loading }: { rates: CurrencyRate[]; loading: boolean }) {
  return (
    <Section title="Курсы валют ЦБ" badge="live">
      <div style={{ padding: '4px 0' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Загрузка курсов...
          </div>
        ) : rates.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Нет данных
          </div>
        ) : rates.map((r, i) => {
          const isUp = r.diff > 0;
          const isDown = r.diff < 0;
          return (
            <div key={r.code} style={{
              display: 'flex', alignItems: 'center', padding: '10px 20px',
              borderBottom: i < rates.length - 1 ? '1px solid #f9fafb' : 'none',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                backgroundColor: '#f3f4f6', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: '11px', fontWeight: 700, color: '#374151',
              }}>{r.code}</div>
              <div style={{ flex: 1, marginLeft: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{r.name_ru}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                  {formatNumber(r.rate, 2)}
                </div>
                {r.diff !== 0 && (
                  <div style={{
                    fontSize: '11px', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                    color: isUp ? '#15803d' : isDown ? '#b91c1c' : '#6b7280',
                  }}>
                    {isUp ? '+' : ''}{r.diff.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ─── Stock Market Widget ─── */
function StockWidget({ data, onClick }: { data: StockMarketData; onClick: () => void }) {
  const hasData = data.total_issuers > 0;
  return (
    <Section title="Биржа UZSE" action={{ label: 'Подробнее →', onClick }}>
      {!hasData ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Данные не загружены</p>
          <button onClick={onClick} style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none',
            backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>Перейти и синхронизировать</button>
        </div>
      ) : (
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Эмитенты</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{data.total_issuers}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Сделки</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{formatNumber(data.total_trades)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Объём (шт)</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatNumber(data.total_volume)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Оборот (UZS)</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{formatUZS(data.total_turnover)}</div>
            </div>
          </div>
          {data.top_issuers.length > 0 && (
            <>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Лидеры по обороту
              </div>
              {data.top_issuers.slice(0, 3).map((issuer, i) => (
                <div key={issuer.code} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0',
                  borderBottom: i < Math.min(data.top_issuers.length, 3) - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {issuer.name}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                    {formatUZS(issuer.turnover)}
                  </div>
                </div>
              ))}
            </>
          )}
          {data.last_trade_date && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '10px' }}>
              Последняя сделка: {data.last_trade_date}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

/* ─── CPI / Inflation Widget ─── */
function CpiWidget({ data, onClick }: { data: CpiData; onClick: () => void }) {
  const hasData = data.data_points > 0;
  return (
    <Section title="Инфляция (ИПЦ)" action={{ label: 'Подробнее →', onClick }}>
      {!hasData ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>Данные не загружены</p>
          <button onClick={onClick} style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none',
            backgroundColor: '#7c3aed', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
          }}>Перейти и синхронизировать</button>
        </div>
      ) : (
        <div style={{ padding: '16px 20px' }}>
          {data.headline_value && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                ИПЦ {data.headline_period || ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                  {data.headline_value.toFixed(1)}%
                </span>
                {data.headline_comparison && (
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    ({data.headline_comparison})
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Индикаторов</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{data.categories_count}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Записей</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{formatNumber(data.data_points)}</div>
            </div>
            {data.latest_year && (
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Период</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>до {data.latest_year}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ─── Company Search Mini Widget ─── */
function CompanyWidget({ data, onClick }: { data: CompanyData; onClick: () => void }) {
  return (
    <Section title="Поиск компаний" action={{ label: 'Открыть →', onClick }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>По ИНН или названию</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              {data.total_cached > 0 ? `${data.total_cached} компаний в кэше` : 'soliq.uz, orginfo.uz'}
            </div>
          </div>
        </div>
        <button onClick={onClick} style={{
          width: '100%', padding: '10px 16px', borderRadius: '8px',
          border: '1px solid #e5e7eb', backgroundColor: '#fafafa',
          color: '#6b7280', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#b45309'; e.currentTarget.style.backgroundColor = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = '#fafafa'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          Введите ИНН (9 цифр) или название...
        </button>
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════ */
export default function OverviewDashboard() {
  const router = useRouter();
  const { t } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [realData, setRealData] = useState<RealData | null>(null);
  const [loading, setLoading] = useState(true);
  const [realLoading, setRealLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    loadData();
    loadRealData();
  }, []);

  /* Load portfolio/decision summary */
  const loadData = async () => {
    setLoading(true);
    try {
      const sum = await dashboard.summary();
      setData(sum);
    } catch {
      try {
        const pList = await portfoliosApi.list();
        setData({
          total_portfolio_value: (pList || []).reduce((a: number, p: any) => a + (p.total_value || 0), 0),
          portfolio_count: (pList || []).length,
          total_decisions: 0, active_decisions: 0,
          total_investment_value: 0, high_priority_count: 0,
          status_counts: {}, type_counts: {},
          recent_decisions: [],
          portfolios: (pList || []).map((p: any) => ({ id: p.id, name: p.name, total_value: p.total_value || 0 })),
        });
      } catch { /* empty state */ }
    } finally { setLoading(false); }
  };

  /* Load real-data dashboard (currencies, stock, CPI, etc.) */
  const loadRealData = async () => {
    setRealLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/dashboard/realdata', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setRealData(json);
      }
    } catch {
      // Fallback: at least load currencies directly from cbu.uz
      try {
        const res = await fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/json/');
        if (res.ok) {
          const all = await res.json();
          const keyCodes = ['USD', 'EUR', 'GBP', 'RUB', 'CNY'];
          const currencies = all
            .filter((r: any) => keyCodes.includes(r.Ccy))
            .map((r: any) => ({
              code: r.Ccy,
              name_ru: r.CcyNm_RU || r.CcyNm_EN || r.Ccy,
              rate: parseFloat(r.Rate),
              diff: parseFloat(r.Diff || '0'),
              date: r.Date,
            }));
          setRealData({
            currencies,
            stock_market: { total_issuers: 0, total_trades: 0, total_volume: 0, total_turnover: 0, top_issuers: [] },
            cpi: { categories_count: 0, data_points: 0 },
            companies: { total_cached: 0, sources: [] },
            macro: {},
          });
        }
      } catch { /* no data at all */ }
    } finally { setRealLoading(false); }
  };

  /* Current date/time */
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const currencies = realData?.currencies || [];
  const stockMarket = realData?.stock_market || { total_issuers: 0, total_trades: 0, total_volume: 0, total_turnover: 0, top_issuers: [] };
  const cpi = realData?.cpi || { categories_count: 0, data_points: 0 };
  const companies = realData?.companies || { total_cached: 0, sources: [] };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            {t.dashboardPage.title}
          </h1>
          <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/portfolios')} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb',
            backgroundColor: '#fff', color: '#374151', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
          >
            <SvgIcon d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" size={14} />
            {t.dashboardPage.portfolios}
          </button>
          <button onClick={() => router.push('/decisions')} style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'background-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            <SvgIcon d="M12 5v14M5 12h14" size={14} sw={2.2} />
            {t.dashboardPage.newDecision}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '14px', marginBottom: '24px',
      }}>
        <KpiCard
          title={t.dashboardPage.kpi.portfolioValue}
          value={loading ? '—' : formatUZS(data?.total_portfolio_value ?? 0)}
          sub={`${data?.portfolio_count ?? 0} ${t.dashboardPage.kpi.portfoliosCount}`}
          accent="#2563eb"
          icon={<SvgIcon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
        />
        <KpiCard
          title={t.dashboardPage.kpi.activeDecisions}
          value={loading ? '—' : String(data?.active_decisions ?? 0)}
          sub={`${t.dashboardPage.kpi.ofTotal} ${data?.total_decisions ?? 0}`}
          accent="#f59e0b"
          icon={<SvgIcon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />}
        />
        <KpiCard
          title={t.dashboardPage.kpi.investmentVolume}
          value={loading ? '—' : formatUZS(data?.total_investment_value ?? 0)}
          sub={t.dashboardPage.kpi.totalVolume}
          accent="#8b5cf6"
          icon={<SvgIcon d="M23 6l-9.5 9.5-5-5L1 18" />}
        />
        <KpiCard
          title={t.dashboardPage.kpi.highPriority}
          value={loading ? '—' : String(data?.high_priority_count ?? 0)}
          sub={t.dashboardPage.kpi.requireAttention}
          accent="#ef4444"
          icon={<SvgIcon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
        />
      </div>

      {/* ─── Main 2-column grid ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 360px',
        gap: '20px', alignItems: 'start',
      }} className="dashboard-grid">

        {/* LEFT column — market data + portfolio data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Market Overview — Stock + CPI side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="market-grid">
            <StockWidget data={stockMarket} onClick={() => router.push('/stock-exchange')} />
            <CpiWidget data={cpi} onClick={() => router.push('/cpi-uz')} />
          </div>

          {/* Company Search */}
          <CompanyWidget data={companies} onClick={() => router.push('/company-search')} />

          {/* Recent decisions */}
          <Section title={t.dashboardPage.recentDecisions} action={{ label: t.dashboardPage.allDecisions, onClick: () => router.push('/decisions') }}>
            <div style={{ minHeight: '120px' }}>
              {loading ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>{t.dashboardPage.loading}</div>
              ) : !data?.recent_decisions?.length ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>{t.dashboardPage.noDecisions}</p>
                  <p style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px' }}>{t.dashboardPage.createFirst}</p>
                </div>
              ) : data.recent_decisions.map((d, i) => {
                const typeInfo = TYPE_LABELS[d.decision_type] || { label: d.decision_type, color: '#6b7280' };
                const statusInfo = STATUS_COLORS[d.status] || { bg: '#f3f4f6', text: '#6b7280' };
                return (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px',
                    borderBottom: i < data.recent_decisions.length - 1 ? '1px solid #f9fafb' : 'none',
                  }}>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '8px',
                      backgroundColor: `${typeInfo.color}10`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: typeInfo.color }}>{typeInfo.label}</span>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.asset_name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({d.asset_symbol})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {formatUZS(d.total_value || d.price * d.amount)} · {d.amount} шт · {formatDate(d.created_at)}
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px',
                      backgroundColor: statusInfo.bg, color: statusInfo.text,
                      fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Portfolios */}
          <Section title={t.dashboardPage.portfoliosSection} action={{ label: t.dashboardPage.manage, onClick: () => router.push('/portfolios') }}>
            <div style={{ minHeight: '100px' }}>
              {loading ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>{t.dashboardPage.loading}</div>
              ) : !data?.portfolios?.length ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
                    <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>{t.dashboardPage.noPortfolios}</p>
                  <button onClick={() => router.push('/portfolios')} style={{
                    marginTop: '8px', padding: '6px 14px', borderRadius: '6px',
                    backgroundColor: '#2563eb', color: '#fff', border: 'none',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  }}>{t.dashboardPage.createPortfolio}</button>
                </div>
              ) : data.portfolios.map((p, i) => (
                <div key={p.id} onClick={() => router.push('/portfolios')} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 20px', cursor: 'pointer',
                  borderBottom: i < data.portfolios.length - 1 ? '1px solid #f9fafb' : 'none',
                  transition: 'background-color 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fafbfc')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0,
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                  </div>
                  <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {formatUZS(p.total_value)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT column — Currency rates + Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CurrencyWidget rates={currencies} loading={realLoading} />

          {/* Macro Summary */}
          {realData?.macro && (realData.macro.gdp_growth_pct != null || realData.macro.inflation_pct != null) && (
            <Section title="Макроэкономика" action={{ label: 'Подробнее →', onClick: () => router.push('/macro-uz') }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {realData.macro.gdp_growth_pct != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Рост ВВП</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: realData.macro.gdp_growth_pct >= 0 ? '#15803d' : '#b91c1c' }}>
                      {realData.macro.gdp_growth_pct >= 0 ? '+' : ''}{realData.macro.gdp_growth_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
                {realData.macro.inflation_pct != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Инфляция</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#b45309' }}>
                      {realData.macro.inflation_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
                {realData.macro.population_mln != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Население</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                      {realData.macro.population_mln.toFixed(1)} млн
                    </span>
                  </div>
                )}
                {realData.macro.data_year && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Данные за {realData.macro.data_year} г. | stat.uz
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Quick actions */}
          <Section title={t.dashboardPage.quickActions}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: t.dashboardPage.actions.dueDiligence, desc: t.dashboardPage.actions.ddDesc, path: '/due-diligence', color: '#111827' },
                { label: t.dashboardPage.actions.marketUz, desc: t.dashboardPage.actions.marketDesc, path: '/market-uz', color: '#2563eb' },
                { label: t.dashboardPage.actions.aiAnalytics, desc: t.dashboardPage.actions.aiDesc, path: '/ai-analytics', color: '#7c3aed' },
                { label: t.dashboardPage.actions.macroData, desc: t.dashboardPage.actions.macroDesc, path: '/macro-uz', color: '#16a34a' },
                { label: t.dashboardPage.actions.reports, desc: t.dashboardPage.actions.reportsDesc, path: '/report', color: '#b45309' },
              ].map((a) => (
                <button key={a.path} onClick={() => router.push(a.path)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', borderRadius: '8px', border: 'none',
                  backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: 'background-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: a.color, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>{a.label}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{a.desc}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </Section>

          {/* Data freshness indicator */}
          {realData?.data_freshness && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#15803d', flexShrink: 0 }} />
              {realData.data_freshness}
            </div>
          )}
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
          .market-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
