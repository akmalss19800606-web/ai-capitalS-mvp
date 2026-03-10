'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboard, portfolios as portfoliosApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, statusColors, componentStyles,
} from '@/lib/design-tokens';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Badge } from '@/components/ui/Badge';

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

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  BUY:  { label: 'Покупка',   color: colors.success[700] },
  SELL: { label: 'Продажа',   color: colors.error[700] },
  HOLD: { label: 'Удержание', color: colors.warning[700] },
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

/* ─── Section Card ─── */
function Section({ title, action, badge: badgeText, children }: {
  title: string; action?: { label: string; onClick: () => void }; badge?: string; children: React.ReactNode;
}) {
  return (
    <Card padding="0px" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: `${spacing[3]} ${spacing[5]}`,
        borderBottom: `1px solid ${semantic.borderLight}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <span style={{
            fontSize: typography.fontSize.md,
            fontWeight: typography.fontWeight.semibold,
            color: semantic.textPrimary,
          }}>{title}</span>
          {badgeText && (
            <Badge status="active" size="sm">{badgeText}</Badge>
          )}
        </div>
        {action && (
          <button onClick={action.onClick} style={{
            fontSize: typography.fontSize.sm,
            color: semantic.textLink,
            background: 'none', border: 'none',
            cursor: 'pointer',
            fontWeight: typography.fontWeight.medium,
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textLinkHover)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textLink)}
          >{action.label}</button>
        )}
      </div>
      {children}
    </Card>
  );
}

/* ─── Currency Widget ─── */
function CurrencyWidget({ rates, loading }: { rates: CurrencyRate[]; loading: boolean }) {
  return (
    <Section title="Курсы валют ЦБ" badge="live">
      <div style={{ padding: `${spacing[1]} 0` }}>
        {loading ? (
          <div style={{ padding: spacing[5], textAlign: 'center', color: semantic.textMuted, fontSize: typography.fontSize.base }}>
            Загрузка курсов...
          </div>
        ) : rates.length === 0 ? (
          <div style={{ padding: spacing[5], textAlign: 'center', color: semantic.textMuted, fontSize: typography.fontSize.base }}>
            Нет данных
          </div>
        ) : rates.map((r, i) => {
          const isUp = r.diff > 0;
          const isDown = r.diff < 0;
          return (
            <div key={r.code} style={{
              display: 'flex', alignItems: 'center', padding: `${spacing[2]} ${spacing[5]}`,
              borderBottom: i < rates.length - 1 ? `1px solid ${semantic.borderLight}` : 'none',
              transition: transitions.fast,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: radius.lg,
                backgroundColor: semantic.bgHover, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: semantic.textSecondary,
              }}>{r.code}</div>
              <div style={{ flex: 1, marginLeft: spacing[3] }}>
                <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: semantic.textPrimary }}>{r.name_ru}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold,
                  color: semantic.textPrimary, fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatNumber(r.rate, 2)}
                </div>
                {r.diff !== 0 && (
                  <div style={{
                    fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, fontVariantNumeric: 'tabular-nums',
                    color: isUp ? colors.success[700] : isDown ? colors.error[700] : semantic.textMuted,
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
    <Section title="Биржа UZSE" action={{ label: 'Подробнее \u2192', onClick }}>
      {!hasData ? (
        <div style={{ padding: spacing[5], textAlign: 'center' }}>
          <p style={{ fontSize: typography.fontSize.base, color: semantic.textMuted, marginBottom: spacing[2] }}>Данные не загружены</p>
          <button onClick={onClick} style={{
            padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.md, border: 'none',
            backgroundColor: semantic.accent, color: semantic.textInverse,
            fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, cursor: 'pointer',
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.accentHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = semantic.accent)}
          >Перейти и синхронизировать</button>
        </div>
      ) : (
        <div style={{ padding: `${spacing[4]} ${spacing[5]}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[4] }}>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Эмитенты</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>{data.total_issuers}</div>
            </div>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Сделки</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>{formatNumber(data.total_trades)}</div>
            </div>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Объём (шт)</div>
              <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{formatNumber(data.total_volume)}</div>
            </div>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Оборот (UZS)</div>
              <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{formatUZS(data.total_turnover)}</div>
            </div>
          </div>
          {data.top_issuers.length > 0 && (
            <>
              <div style={{
                fontSize: typography.fontSize.xs, color: semantic.textMuted,
                fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2],
                textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wider,
              }}>
                Лидеры по обороту
              </div>
              {data.top_issuers.slice(0, 3).map((issuer, i) => (
                <div key={issuer.code} style={{
                  display: 'flex', alignItems: 'center', gap: spacing[2], padding: `${spacing[1]} 0`,
                  borderBottom: i < Math.min(data.top_issuers.length, 3) - 1 ? `1px solid ${semantic.borderLight}` : 'none',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: radius.md,
                    background: colors.gradient.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: semantic.textInverse, fontSize: '10px', fontWeight: typography.fontWeight.bold, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
                      color: semantic.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {issuer.name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
                    color: semantic.textSecondary, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatUZS(issuer.turnover)}
                  </div>
                </div>
              ))}
            </>
          )}
          {data.last_trade_date && (
            <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginTop: spacing[2] }}>
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
    <Section title="Инфляция (ИПЦ)" action={{ label: 'Подробнее \u2192', onClick }}>
      {!hasData ? (
        <div style={{ padding: spacing[5], textAlign: 'center' }}>
          <p style={{ fontSize: typography.fontSize.base, color: semantic.textMuted, marginBottom: spacing[2] }}>Данные не загружены</p>
          <button onClick={onClick} style={{
            padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.md, border: 'none',
            backgroundColor: colors.primary[600], color: semantic.textInverse,
            fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, cursor: 'pointer',
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.primary[700])}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.primary[600])}
          >Перейти и синхронизировать</button>
        </div>
      ) : (
        <div style={{ padding: `${spacing[4]} ${spacing[5]}` }}>
          {data.headline_value && (
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>
                ИПЦ {data.headline_period || ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[1] }}>
                <span style={{
                  fontSize: '28px', fontWeight: typography.fontWeight.bold,
                  color: semantic.textPrimary, fontVariantNumeric: 'tabular-nums',
                }}>
                  {data.headline_value.toFixed(1)}%
                </span>
                {data.headline_comparison && (
                  <span style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
                    ({data.headline_comparison})
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: spacing[5] }}>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Индикаторов</div>
              <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{data.categories_count}</div>
            </div>
            <div>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Записей</div>
              <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{formatNumber(data.data_points)}</div>
            </div>
            {data.latest_year && (
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>Период</div>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>до {data.latest_year}</div>
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
    <Section title="Поиск компаний" action={{ label: 'Открыть \u2192', onClick }}>
      <div style={{ padding: `${spacing[4]} ${spacing[5]}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }}>
          <div style={{
            width: 40, height: 40, borderRadius: radius.xl,
            backgroundColor: colors.warning[100], display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.warning[700]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>По ИНН или названию</div>
            <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
              {data.total_cached > 0 ? `${data.total_cached} компаний в кэше` : 'soliq.uz, orginfo.uz'}
            </div>
          </div>
        </div>
        <button onClick={onClick} style={{
          width: '100%', padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
          border: `1px solid ${semantic.border}`, backgroundColor: semantic.bgHover,
          color: semantic.textMuted, fontSize: typography.fontSize.base, cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: spacing[2],
          transition: transitions.color,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.warning[700]; e.currentTarget.style.backgroundColor = semantic.bgCard; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = semantic.border; e.currentTarget.style.backgroundColor = semantic.bgHover; }}
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
          total_portfolio_value: (pList || []).reduce((a: number, p: unknown) => a + (p.total_value || 0), 0),
          portfolio_count: (pList || []).length,
          total_decisions: 0, active_decisions: 0,
          total_investment_value: 0, high_priority_count: 0,
          status_counts: {}, type_counts: {},
          recent_decisions: [],
          portfolios: (pList || []).map((p: Record<string, unknown>) => ({ id: p.id, name: p.name, total_value: p.total_value || 0 })),
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
            .filter((r: Record<string, unknown>) => keyCodes.includes(r.Ccy))
            .map((r: Record<string, unknown>) => ({
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
      <div style={{
        marginBottom: spacing[6], display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing[2],
      }}>
        <div>
          <h1 style={{
            fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold,
            color: semantic.textPrimary, letterSpacing: typography.letterSpacing.tight,
          }}>
            {t.dashboardPage.title}
          </h1>
          <p style={{ color: semantic.textMuted, marginTop: spacing[1], fontSize: typography.fontSize.base }}>
            {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/portfolios')} style={{
            padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
            border: `1px solid ${semantic.border}`,
            backgroundColor: semantic.bgCard, color: semantic.textSecondary,
            fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: spacing[1],
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = semantic.accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = semantic.border)}
          >
            <SvgIcon d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" size={14} />
            {t.dashboardPage.portfolios}
          </button>
          <button onClick={() => router.push('/decisions')} style={{
            padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg, border: 'none',
            backgroundColor: semantic.accent, color: semantic.textInverse,
            fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: spacing[1],
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.accentHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = semantic.accent)}
          >
            <SvgIcon d="M12 5v14M5 12h14" size={14} sw={2.2} />
            {t.dashboardPage.newDecision}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: spacing[3], marginBottom: spacing[6],
      }}>
        <KpiCard
          label={t.dashboardPage.kpi.portfolioValue}
          value={loading ? '\u2014' : formatUZS(data?.total_portfolio_value ?? 0)}
          subtitle={`${data?.portfolio_count ?? 0} ${t.dashboardPage.kpi.portfoliosCount}`}
          icon={<SvgIcon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
        />
        <KpiCard
          label={t.dashboardPage.kpi.activeDecisions}
          value={loading ? '\u2014' : String(data?.active_decisions ?? 0)}
          subtitle={`${t.dashboardPage.kpi.ofTotal} ${data?.total_decisions ?? 0}`}
          icon={<SvgIcon d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />}
        />
        <KpiCard
          label={t.dashboardPage.kpi.investmentVolume}
          value={loading ? '\u2014' : formatUZS(data?.total_investment_value ?? 0)}
          subtitle={t.dashboardPage.kpi.totalVolume}
          icon={<SvgIcon d="M23 6l-9.5 9.5-5-5L1 18" />}
        />
        <KpiCard
          label={t.dashboardPage.kpi.highPriority}
          value={loading ? '\u2014' : String(data?.high_priority_count ?? 0)}
          subtitle={t.dashboardPage.kpi.requireAttention}
          icon={<SvgIcon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
        />
      </div>

      {/* ─── Main 2-column grid ─── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 360px',
        gap: spacing[5], alignItems: 'start',
      }} className="dashboard-grid">

        {/* LEFT column — market data + portfolio data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>

          {/* Market Overview — Stock + CPI side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }} className="market-grid">
            <StockWidget data={stockMarket} onClick={() => router.push('/stock-exchange')} />
            <CpiWidget data={cpi} onClick={() => router.push('/cpi-uz')} />
          </div>

          {/* Company Search */}
          <CompanyWidget data={companies} onClick={() => router.push('/company-search')} />

          {/* Recent decisions */}
          <Section title={t.dashboardPage.recentDecisions} action={{ label: t.dashboardPage.allDecisions, onClick: () => router.push('/decisions') }}>
            <div style={{ minHeight: '120px' }}>
              {loading ? (
                <div style={{ padding: `${spacing[8]} ${spacing[5]}`, textAlign: 'center', color: semantic.textMuted, fontSize: typography.fontSize.base }}>{t.dashboardPage.loading}</div>
              ) : !data?.recent_decisions?.length ? (
                <div style={{ padding: `${spacing[8]} ${spacing[5]}`, textAlign: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={colors.neutral[300]} strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                  </svg>
                  <p style={{ fontSize: typography.fontSize.base, color: semantic.textMuted }}>{t.dashboardPage.noDecisions}</p>
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral[300], marginTop: spacing[1] }}>{t.dashboardPage.createFirst}</p>
                </div>
              ) : data.recent_decisions.map((d, i) => {
                const typeInfo = TYPE_LABELS[d.decision_type] || { label: d.decision_type, color: semantic.textMuted };
                const sc = statusColors[d.status] || { bg: semantic.bgHover, text: semantic.textMuted, border: semantic.border };
                return (
                  <div key={d.id} style={{
                    display: 'flex', alignItems: 'center', gap: spacing[3],
                    padding: `${spacing[3]} ${spacing[5]}`,
                    borderBottom: i < data.recent_decisions.length - 1 ? `1px solid ${semantic.borderLight}` : 'none',
                    transition: transitions.fast,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: radius.lg,
                      backgroundColor: `${typeInfo.color}10`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: typography.fontWeight.bold, color: typeInfo.color }}>{typeInfo.label}</span>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold,
                        color: semantic.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {d.asset_name} <span style={{ color: semantic.textMuted, fontWeight: typography.fontWeight.normal }}>({d.asset_symbol})</span>
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginTop: '2px' }}>
                        {formatUZS(d.total_value || d.price * d.amount)} · {d.amount} шт · {formatDate(d.created_at)}
                      </div>
                    </div>
                    <span style={{
                      padding: `3px ${spacing[2]}`, borderRadius: radius.full,
                      backgroundColor: sc.bg, color: sc.text,
                      border: `1px solid ${sc.border}`,
                      fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold,
                      whiteSpace: 'nowrap', flexShrink: 0,
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
                <div style={{ padding: `${spacing[8]} ${spacing[5]}`, textAlign: 'center', color: semantic.textMuted, fontSize: typography.fontSize.base }}>{t.dashboardPage.loading}</div>
              ) : !data?.portfolios?.length ? (
                <div style={{ padding: `${spacing[8]} ${spacing[5]}`, textAlign: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={colors.neutral[300]} strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
                    <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  </svg>
                  <p style={{ fontSize: typography.fontSize.base, color: semantic.textMuted }}>{t.dashboardPage.noPortfolios}</p>
                  <button onClick={() => router.push('/portfolios')} style={{
                    marginTop: spacing[2], padding: `${spacing[1]} ${spacing[3]}`,
                    borderRadius: radius.md, backgroundColor: semantic.accent, color: semantic.textInverse,
                    border: 'none', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, cursor: 'pointer',
                    transition: transitions.color,
                  }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.accentHover)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = semantic.accent)}
                  >{t.dashboardPage.createPortfolio}</button>
                </div>
              ) : data.portfolios.map((p, i) => (
                <div key={p.id} onClick={() => router.push('/portfolios')} style={{
                  display: 'flex', alignItems: 'center', gap: spacing[3],
                  padding: `${spacing[3]} ${spacing[5]}`, cursor: 'pointer',
                  borderBottom: i < data.portfolios.length - 1 ? `1px solid ${semantic.borderLight}` : 'none',
                  transition: transitions.fast,
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: radius.lg,
                    background: colors.gradient.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: semantic.textInverse, fontWeight: typography.fontWeight.bold,
                    fontSize: typography.fontSize.md, flexShrink: 0,
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold,
                      color: semantic.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p.name}
                    </div>
                  </div>
                  <div style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary,
                  }}>
                    {formatUZS(p.total_value)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* RIGHT column — Currency rates + Macro + Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>
          <CurrencyWidget rates={currencies} loading={realLoading} />

          {/* Macro Summary */}
          {realData?.macro && (realData.macro.gdp_growth_pct != null || realData.macro.inflation_pct != null) && (
            <Section title="Макроэкономика" action={{ label: 'Подробнее \u2192', onClick: () => router.push('/macro-uz') }}>
              <div style={{ padding: `${spacing[4]} ${spacing[5]}`, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {realData.macro.gdp_growth_pct != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Рост ВВП</span>
                    <span style={{
                      fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold,
                      color: realData.macro.gdp_growth_pct >= 0 ? colors.success[700] : colors.error[700],
                    }}>
                      {realData.macro.gdp_growth_pct >= 0 ? '+' : ''}{realData.macro.gdp_growth_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
                {realData.macro.inflation_pct != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Инфляция</span>
                    <span style={{
                      fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold,
                      color: colors.warning[700],
                    }}>
                      {realData.macro.inflation_pct.toFixed(1)}%
                    </span>
                  </div>
                )}
                {realData.macro.population_mln != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Население</span>
                    <span style={{
                      fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold,
                      color: semantic.textPrimary,
                    }}>
                      {realData.macro.population_mln.toFixed(1)} млн
                    </span>
                  </div>
                )}
                {realData.macro.data_year && (
                  <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginTop: spacing[1] }}>
                    Данные за {realData.macro.data_year} г. | stat.uz
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Quick actions */}
          <Section title={t.dashboardPage.quickActions}>
            <div style={{ padding: `${spacing[3]} ${spacing[4]}`, display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
              {[
                { label: t.dashboardPage.actions.dueDiligence, desc: t.dashboardPage.actions.ddDesc, path: '/due-diligence', color: semantic.textPrimary },
                { label: t.dashboardPage.actions.marketUz, desc: t.dashboardPage.actions.marketDesc, path: '/market-uz', color: semantic.accent },
                { label: t.dashboardPage.actions.aiAnalytics, desc: t.dashboardPage.actions.aiDesc, path: '/ai-analytics', color: colors.primary[600] },
                { label: t.dashboardPage.actions.macroData, desc: t.dashboardPage.actions.macroDesc, path: '/macro-uz', color: colors.success[600] },
                { label: t.dashboardPage.actions.reports, desc: t.dashboardPage.actions.reportsDesc, path: '/report', color: colors.warning[700] },
              ].map((a) => (
                <button key={a.path} onClick={() => router.push(a.path)} style={{
                  display: 'flex', alignItems: 'center', gap: spacing[3],
                  padding: `${spacing[2]} ${spacing[3]}`, borderRadius: radius.lg, border: 'none',
                  backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: transitions.fast,
                }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: radius.full,
                    backgroundColor: a.color, flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: semantic.textPrimary }}>{a.label}</div>
                    <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>{a.desc}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.neutral[300]}
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
              padding: `${spacing[3]} ${spacing[4]}`, borderRadius: radius.xl,
              backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`,
              fontSize: typography.fontSize.sm, color: colors.success[700],
              display: 'flex', alignItems: 'center', gap: spacing[2],
            }}>
              <div style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.success[700], flexShrink: 0 }} />
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
