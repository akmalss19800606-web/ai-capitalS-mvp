'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, componentStyles,
} from '@/lib/design-tokens';
import { useLocale } from '@/lib/i18n';

/* ─── Tab type ─── */
type TabId = 'dcf' | 'whatif' | 'montecarlo' | 'cases';

/* ─── Styles (matches Islamic Finance page) ─── */
const cardStyle: React.CSSProperties = {
  ...componentStyles.card,
  marginBottom: spacing[5],
};

const inputStyle: React.CSSProperties = {
  ...componentStyles.input,
  width: '100%',
  padding: '10px 14px',
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.medium,
  color: semantic.textPrimary,
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.fontSize.sm,
  color: semantic.textSecondary,
  fontWeight: typography.fontWeight.medium,
  display: 'block',
  marginBottom: '6px',
};

const btnPrimary: React.CSSProperties = {
  padding: '11px 28px',
  borderRadius: radius.lg,
  backgroundColor: colors.primary[600],
  color: '#fff',
  border: 'none',
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  cursor: 'pointer',
  transition: transitions.color,
};

const sectionTitle: React.CSSProperties = {
  fontSize: typography.fontSize.lg,
  fontWeight: typography.fontWeight.semibold,
  color: semantic.textPrimary,
  marginBottom: spacing[4],
};

/* ─── Helpers ─── */
const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '0';
const parseCFs = (s: string): number[] =>
  s.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

/* ─── Main Component ─── */
export default function PortfolioAnalyticsTab() {
  const router = useRouter();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('dcf');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dcf',        label: 'DCF / NPV / IRR', icon: '📈' },
    { id: 'whatif',      label: 'What-If анализ',  icon: '🔀' },
    { id: 'montecarlo',  label: 'Монте-Карло',     icon: '🎲' },
    { id: 'cases',       label: 'Бизнес-кейсы',    icon: '🏗️' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing[6] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <div style={{
            width: 44, height: 44, borderRadius: radius.xl,
            background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}>
            📊
          </div>
          <div>
            <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>
              Портфельная аналитика
            </h1>
            <p style={{ color: semantic.textSecondary, fontSize: typography.fontSize.md }}>
              DCF/NPV/IRR · What-If сценарии · Монте-Карло · Бизнес-кейсы Узбекистана
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: 'flex', gap: spacing[1], marginBottom: spacing[5],
        borderBottom: `2px solid ${semantic.borderLight}`, paddingBottom: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${colors.primary[600]}` : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? colors.primary[700] : semantic.textSecondary,
              fontWeight: activeTab === tab.id ? typography.fontWeight.semibold : typography.fontWeight.medium,
              fontSize: typography.fontSize.md,
              cursor: 'pointer',
              transition: transitions.color,
              marginBottom: '-2px',
              display: 'flex', alignItems: 'center', gap: spacing[2],
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dcf' && <DCFTab />}
      {activeTab === 'whatif' && <WhatIfTab />}
      {activeTab === 'montecarlo' && <MonteCarloTab />}
      {activeTab === 'cases' && <BusinessCasesTab />}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1: DCF / NPV / IRR
   ═══════════════════════════════════════════════════════════════════════════ */
function DCFTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const [cfText, setCfText] = useState('500, 600, 700, 800, 900');
  const [discountRate, setDiscountRate] = useState('0.18');
  const [termGrowth, setTermGrowth] = useState('0.03');
  const [investment, setInvestment] = useState('1000');
  const [currency, setCurrency] = useState('UZS');

  const handleCalc = async () => {
    const cfs = parseCFs(cfText);
    if (cfs.length === 0) { setError('Введите хотя бы один денежный поток'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await apiRequest('/portfolio-analytics/dcf', {
        method: 'POST',
        body: JSON.stringify({
          cash_flows: cfs,
          discount_rate: parseFloat(discountRate) || 0.18,
          terminal_growth: parseFloat(termGrowth) || 0.03,
          initial_investment: parseFloat(investment) || 0,
          currency,
        }),
      });
      setResult(res.data);
    } catch {
      setError('Ошибка при расчёте DCF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Параметры DCF-модели</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[4] }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Прогнозные денежные потоки по годам (млн UZS)</span>
            <textarea
              value={cfText}
              onChange={e => setCfText(e.target.value)}
              placeholder="500, 600, 700, 800, 900"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div>
            <span style={labelStyle}>Ставка дисконтирования (WACC)</span>
            <input type="number" step="0.01" value={discountRate} onChange={e => setDiscountRate(e.target.value)} placeholder="0.18" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Терминальный рост (Гордон)</span>
            <input type="number" step="0.01" value={termGrowth} onChange={e => setTermGrowth(e.target.value)} placeholder="0.03" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Начальная инвестиция (млн UZS)</span>
            <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="1000" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Валюта</span>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              {['UZS', 'USD'].map(c => (
                <button key={c} onClick={() => setCurrency(c)} style={{
                  padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
                  border: currency === c ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
                  backgroundColor: currency === c ? colors.primary[50] : 'transparent',
                  color: currency === c ? colors.primary[700] : semantic.textSecondary,
                  fontWeight: typography.fontWeight.semibold, cursor: 'pointer', fontSize: typography.fontSize.md,
                }}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: spacing[5] }}>
          <button onClick={handleCalc} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Расчёт...' : 'Рассчитать DCF'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, backgroundColor: colors.error[50], borderColor: colors.error[200] }}>
          <p style={{ color: colors.error[700] }}>{error}</p>
        </div>
      )}

      {result && <DCFResults result={result} />}
    </div>
  );
}

/* ─── DCF result display (reused by DCF tab and business cases) ─── */
function DCFResults({ result }: { result: unknown }) {
  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[5] }}>
        <SummaryCard label="NPV (чистая приведённая стоимость)" value={`${fmt(result.npv)} млн ${result.currency || 'UZS'}`} color={result.npv >= 0 ? colors.success[600] : colors.error[600]} bg={result.npv >= 0 ? colors.success[50] : colors.error[50]} />
        <SummaryCard label="IRR (внутренняя доходность)" value={result.irr_pct || 'N/A'} color={colors.primary[600]} bg={colors.primary[50]} />
        <SummaryCard label="Простой окупаемость (лет)" value={result.payback_simple != null ? `${result.payback_simple} лет` : 'Не окупается'} color={colors.warning[600]} bg={colors.warning[50]} />
        <SummaryCard label="Индекс рентабельности (PI)" value={result.profitability_index != null ? String(result.profitability_index) : 'N/A'} color={colors.primary[600]} bg={colors.primary[50]} />
      </div>

      {/* Terminal value */}
      {result.terminal_value > 0 && (
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderColor: colors.primary[200] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing[3] }}>
            <div>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>Терминальная стоимость (модель Гордона)</div>
              <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[800] }}>
                {fmt(result.terminal_value)} млн
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>PV терминальной стоимости</div>
              <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[800] }}>
                {fmt(result.terminal_value_pv)} млн
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yearly breakdown */}
      {result.yearly_breakdown && result.yearly_breakdown.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
            Годовая разбивка денежных потоков
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${semantic.border}` }}>
                  {['Год', 'Денежный поток', 'Коэфф. дисконт.', 'Приведённая стоимость'].map(h => (
                    <th key={h} style={{ textAlign: 'right', padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: typography.fontWeight.semibold }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.yearly_breakdown.map((row: unknown) => (
                  <tr key={row.year} style={{ borderBottom: `1px solid ${semantic.borderLight}` }}>
                    <td style={{ padding: `${spacing[3]} ${spacing[4]}`, textAlign: 'right', fontWeight: typography.fontWeight.medium, color: semantic.textPrimary }}>{row.year}</td>
                    <td style={{ padding: `${spacing[3]} ${spacing[4]}`, textAlign: 'right', color: row.cash_flow < 0 ? colors.error[600] : semantic.textPrimary }}>{fmt(row.cash_flow)}</td>
                    <td style={{ padding: `${spacing[3]} ${spacing[4]}`, textAlign: 'right', color: semantic.textSecondary }}>{row.discount_factor.toFixed(4)}</td>
                    <td style={{ padding: `${spacing[3]} ${spacing[4]}`, textAlign: 'right', fontWeight: typography.fontWeight.semibold, color: row.present_value < 0 ? colors.error[600] : colors.success[600] }}>{fmt(row.present_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sensitivity table */}
      {result.sensitivity_table && result.sensitivity_table.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
            Таблица чувствительности NPV к ставке дисконтирования
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
            {result.sensitivity_table.map((item: unknown) => {
              const isBase = Math.abs(item.discount_rate - result.discount_rate) < 0.001;
              const isPositive = item.npv >= 0;
              return (
                <div key={item.discount_rate_pct} style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  borderRadius: radius.lg,
                  backgroundColor: isBase ? colors.primary[100] : isPositive ? colors.success[50] : colors.error[50],
                  border: isBase ? `2px solid ${colors.primary[500]}` : `1px solid ${isPositive ? colors.success[200] : colors.error[200]}`,
                  textAlign: 'center', minWidth: '90px',
                }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: isBase ? typography.fontWeight.bold : typography.fontWeight.medium }}>
                    {item.discount_rate_pct}
                  </div>
                  <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: isPositive ? colors.success[700] : colors.error[700] }}>
                    {fmt(item.npv)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2: What-If сценарный анализ
   ═══════════════════════════════════════════════════════════════════════════ */
function WhatIfTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const [cfText, setCfText] = useState('500, 600, 700, 800, 900');
  const [discountRate, setDiscountRate] = useState('0.18');
  const [investment, setInvestment] = useState('1000');
  const [termGrowth, setTermGrowth] = useState('0.03');

  const handleCalc = async () => {
    const cfs = parseCFs(cfText);
    if (cfs.length === 0) { setError('Введите хотя бы один денежный поток'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await apiRequest('/portfolio-analytics/what-if', {
        method: 'POST',
        body: JSON.stringify({
          base_cash_flows: cfs,
          base_discount_rate: parseFloat(discountRate) || 0.18,
          initial_investment: parseFloat(investment) || 0,
          terminal_growth: parseFloat(termGrowth) || 0.03,
        }),
      });
      setResult(res.data);
    } catch {
      setError('Ошибка при What-If анализе');
    } finally {
      setLoading(false);
    }
  };

  const scenarioColors: Record<string, { bg: string; border: string; text: string }> = {
    base:        { bg: colors.neutral[50], border: colors.neutral[300], text: colors.neutral[700] },
    optimistic:  { bg: colors.success[50], border: colors.success[300], text: colors.success[700] },
    pessimistic: { bg: colors.error[50],   border: colors.error[300],   text: colors.error[700] },
    custom:      { bg: colors.primary[50], border: colors.primary[300], text: colors.primary[700] },
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Параметры What-If анализа</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[4] }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Базовые денежные потоки по годам (млн UZS)</span>
            <textarea value={cfText} onChange={e => setCfText(e.target.value)} placeholder="500, 600, 700, 800, 900" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <span style={labelStyle}>Ставка дисконтирования</span>
            <input type="number" step="0.01" value={discountRate} onChange={e => setDiscountRate(e.target.value)} placeholder="0.18" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Начальная инвестиция (млн UZS)</span>
            <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="1000" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Терминальный рост</span>
            <input type="number" step="0.01" value={termGrowth} onChange={e => setTermGrowth(e.target.value)} placeholder="0.03" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: spacing[5] }}>
          <button onClick={handleCalc} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Расчёт...' : 'Запустить What-If'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, backgroundColor: colors.error[50], borderColor: colors.error[200] }}>
          <p style={{ color: colors.error[700] }}>{error}</p>
        </div>
      )}

      {result && (
        <div>
          {/* Scenario cards */}
          <div style={cardStyle}>
            <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
              Сценарии
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: spacing[4] }}>
              {result.scenarios?.map((sc: unknown, i: number) => {
                const clr = scenarioColors[sc.name_en] || scenarioColors.custom;
                return (
                  <div key={i} style={{
                    padding: spacing[4], borderRadius: radius.xl,
                    backgroundColor: clr.bg, border: `1px solid ${clr.border}`,
                  }}>
                    <div style={{ fontWeight: typography.fontWeight.semibold, color: clr.text, fontSize: typography.fontSize.md, marginBottom: spacing[2] }}>
                      {sc.name}
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] }}>{sc.description}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[2] }}>
                      <div>
                        <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>NPV</div>
                        <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: sc.npv >= 0 ? colors.success[700] : colors.error[700] }}>
                          {fmt(sc.npv)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>IRR</div>
                        <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: clr.text }}>
                          {sc.irr_pct || 'N/A'}
                        </div>
                      </div>
                    </div>
                    {sc.npv_delta !== 0 && (
                      <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm, color: sc.npv_delta > 0 ? colors.success[600] : colors.error[600] }}>
                        {sc.npv_delta > 0 ? '+' : ''}{fmt(sc.npv_delta)} vs базовый
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tornado */}
          {result.tornado && result.tornado.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                Торнадо-диаграмма (чувствительность)
              </h4>
              {result.tornado.map((item: unknown, i: number) => {
                const varLabels: Record<string, string> = {
                  cash_flows: 'Денежные потоки',
                  discount_rate: 'Ставка дисконтирования',
                  terminal_growth: 'Терминальный рост',
                  initial_investment: 'Начальная инвестиция',
                };
                const maxSpread = Math.max(...result.tornado.map((t: unknown) => t.spread));
                const barPct = maxSpread > 0 ? (item.spread / maxSpread) * 100 : 0;
                return (
                  <div key={i} style={{ marginBottom: spacing[3] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: semantic.textPrimary }}>
                        {varLabels[item.variable] || item.variable}
                      </span>
                      <span style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>
                        Разброс: {fmt(item.spread)} млн
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.error[600], minWidth: '70px', textAlign: 'right' }}>
                        {fmt(item.low_npv)}
                      </span>
                      <div style={{ flex: 1, height: '24px', backgroundColor: colors.neutral[100], borderRadius: radius.lg, position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', left: `${50 - barPct / 2}%`, width: `${barPct}%`,
                          height: '100%', borderRadius: radius.lg,
                          background: `linear-gradient(90deg, ${colors.error[400]}, ${colors.success[400]})`,
                        }} />
                      </div>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.success[600], minWidth: '70px' }}>
                        {fmt(item.high_npv)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Breakeven */}
          {result.breakeven_pct && (
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #fefce8, #fef9c3)', borderColor: colors.warning[300] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                <span style={{ fontSize: '24px' }}>⚖️</span>
                <div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.warning[600] }}>Точка безубыточности (ставка при NPV = 0)</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.warning[800] }}>
                    {result.breakeven_pct}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3: Монте-Карло
   ═══════════════════════════════════════════════════════════════════════════ */
function MonteCarloTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');

  const [cfText, setCfText] = useState('500, 600, 700, 800, 900');
  const [discountRate, setDiscountRate] = useState('0.18');
  const [investment, setInvestment] = useState('1000');
  const [termGrowth, setTermGrowth] = useState('0.03');
  const [numSim, setNumSim] = useState('5000');
  const [volatility, setVolatility] = useState('0.25');
  const [discVol, setDiscVol] = useState('0.05');
  const [uzCalib, setUzCalib] = useState(true);

  const handleCalc = async () => {
    const cfs = parseCFs(cfText);
    if (cfs.length === 0) { setError('Введите хотя бы один денежный поток'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await apiRequest('/portfolio-analytics/monte-carlo', {
        method: 'POST',
        body: JSON.stringify({
          base_cash_flows: cfs,
          base_discount_rate: parseFloat(discountRate) || 0.18,
          initial_investment: parseFloat(investment) || 0,
          terminal_growth: parseFloat(termGrowth) || 0.03,
          num_simulations: parseInt(numSim) || 5000,
          volatility: parseFloat(volatility) || 0.25,
          discount_volatility: parseFloat(discVol) || 0.05,
          uz_calibration: uzCalib,
        }),
      });
      setResult(res.data);
    } catch {
      setError('Ошибка при симуляции Монте-Карло');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Параметры Монте-Карло</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[4] }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={labelStyle}>Базовые денежные потоки по годам (млн UZS)</span>
            <textarea value={cfText} onChange={e => setCfText(e.target.value)} placeholder="500, 600, 700, 800, 900" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <span style={labelStyle}>Ставка дисконтирования</span>
            <input type="number" step="0.01" value={discountRate} onChange={e => setDiscountRate(e.target.value)} placeholder="0.18" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Начальная инвестиция (млн UZS)</span>
            <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} placeholder="1000" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Терминальный рост</span>
            <input type="number" step="0.01" value={termGrowth} onChange={e => setTermGrowth(e.target.value)} placeholder="0.03" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Количество симуляций</span>
            <input type="number" min="100" max="50000" value={numSim} onChange={e => setNumSim(e.target.value)} placeholder="5000" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Волатильность CF (σ)</span>
            <input type="number" step="0.01" value={volatility} onChange={e => setVolatility(e.target.value)} placeholder="0.25" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Волатильность ставки</span>
            <input type="number" step="0.01" value={discVol} onChange={e => setDiscVol(e.target.value)} placeholder="0.05" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], paddingTop: '24px' }}>
            <input type="checkbox" id="uzCalib" checked={uzCalib} onChange={e => setUzCalib(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <label htmlFor="uzCalib" style={{ fontSize: typography.fontSize.md, color: semantic.textPrimary, cursor: 'pointer' }}>
              Калибровка под Узбекистан
            </label>
          </div>
        </div>
        <div style={{ marginTop: spacing[5] }}>
          <button onClick={handleCalc} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Расчёт...' : 'Запустить Монте-Карло'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, backgroundColor: colors.error[50], borderColor: colors.error[200] }}>
          <p style={{ color: colors.error[700] }}>{error}</p>
        </div>
      )}

      {result && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[5] }}>
            <SummaryCard label="Средний NPV" value={`${fmt(result.statistics?.mean)} млн`} color={colors.primary[600]} bg={colors.primary[50]} />
            <SummaryCard label="Медиана NPV" value={`${fmt(result.statistics?.median)} млн`} color={colors.primary[600]} bg={colors.primary[50]} />
            <SummaryCard label="Станд. отклонение" value={`${fmt(result.statistics?.std)} млн`} color={colors.warning[600]} bg={colors.warning[50]} />
            <SummaryCard label="Вероятность прибыли" value={result.probability_profit_pct || '0%'} color={colors.success[600]} bg={colors.success[50]} />
          </div>

          {/* VaR cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4], marginBottom: spacing[5] }}>
            <div style={{
              padding: spacing[4], borderRadius: radius.xl,
              backgroundColor: colors.error[50], border: `1px solid ${colors.error[200]}`,
            }}>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.error[600], marginBottom: spacing[1] }}>
                VaR 95% — максимальный убыток с 95% вероятностью
              </div>
              <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.error[700] }}>
                {fmt(result.var?.var_95)} млн
              </div>
            </div>
            <div style={{
              padding: spacing[4], borderRadius: radius.xl,
              backgroundColor: colors.error[50], border: `1px solid ${colors.error[200]}`,
            }}>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.error[600], marginBottom: spacing[1] }}>
                VaR 99% — максимальный убыток с 99% вероятностью
              </div>
              <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.error[700] }}>
                {fmt(result.var?.var_99)} млн
              </div>
            </div>
          </div>

          {/* Percentile badges */}
          {result.percentiles && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                Перцентили распределения NPV
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
                {Object.entries(result.percentiles).map(([key, val]) => {
                  const n = val as number;
                  return (
                    <div key={key} style={{
                      padding: `${spacing[2]} ${spacing[4]}`,
                      borderRadius: radius.lg,
                      backgroundColor: n >= 0 ? colors.success[50] : colors.error[50],
                      border: `1px solid ${n >= 0 ? colors.success[200] : colors.error[200]}`,
                      textAlign: 'center', minWidth: '100px',
                    }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: typography.fontWeight.semibold }}>{key}</div>
                      <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: n >= 0 ? colors.success[700] : colors.error[700] }}>
                        {fmt(n)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Histogram */}
          {result.histogram && result.histogram.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                Гистограмма распределения NPV ({result.num_simulations?.toLocaleString('ru-RU')} симуляций)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(() => {
                  const maxCount = Math.max(...result.histogram.map((b: unknown) => b.count));
                  return result.histogram.map((bin: unknown, i: number) => {
                    const pct = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
                    const isPositive = bin.bin_start >= 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <span style={{ fontSize: '11px', color: semantic.textMuted, minWidth: '130px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {fmt(bin.bin_start)} — {fmt(bin.bin_end)}
                        </span>
                        <div style={{ flex: 1, height: '18px', backgroundColor: colors.neutral[100], borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: '3px',
                            backgroundColor: isPositive ? colors.success[400] : colors.error[400],
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: semantic.textMuted, minWidth: '40px', fontFamily: 'monospace' }}>
                          {bin.count}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Calibration info */}
              {result.calibration?.uz_calibration && (
                <div style={{ marginTop: spacing[3], padding: spacing[3], backgroundColor: colors.primary[50], borderRadius: radius.lg, border: `1px solid ${colors.primary[200]}` }}>
                  <span style={{ fontSize: typography.fontSize.sm, color: colors.primary[700] }}>
                    🇺🇿 Калибровка Узбекистан: волатильность CF = {result.calibration.cf_volatility_used}, волатильность ставки = {result.calibration.discount_volatility_used}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 4: Бизнес-кейсы Узбекистана
   ═══════════════════════════════════════════════════════════════════════════ */
function BusinessCasesTab() {
  const [cases, setCases] = useState<unknown[]>([]);
  const [categories, setCategories] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');

  // Detail view state
  const [detailCase, setDetailCase] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customCalc, setCustomCalc] = useState(false);
  const [customResult, setCustomResult] = useState<unknown>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [cfMult, setCfMult] = useState('1.0');
  const [invMult, setInvMult] = useState('1.0');

  useEffect(() => { loadCases(); }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/portfolio-analytics/business-cases');
      setCases(res.data?.cases || []);
      setCategories(res.data?.categories || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const openDetail = async (caseId: string) => {
    setDetailLoading(true); setDetailCase(null); setCustomCalc(false); setCustomResult(null);
    try {
      const res = await apiRequest(`/portfolio-analytics/business-cases/${caseId}`);
      setDetailCase(res.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const runCustomCalc = async () => {
    if (!detailCase) return;
    setCustomLoading(true); setCustomResult(null);
    try {
      const res = await apiRequest(`/portfolio-analytics/business-cases/${detailCase.case.id}/calculate`, {
        method: 'POST',
        body: JSON.stringify({
          discount_rate: customRate ? parseFloat(customRate) : null,
          terminal_growth: 0.03,
          cf_multiplier: parseFloat(cfMult) || 1.0,
          investment_multiplier: parseFloat(invMult) || 1.0,
        }),
      });
      setCustomResult(res.data);
    } catch { /* ignore */ }
    setCustomLoading(false);
  };

  const riskLabels: Record<string, { label: string; color: string; bg: string }> = {
    low:    { label: 'Низкий',  color: colors.success[700], bg: colors.success[50] },
    medium: { label: 'Средний', color: colors.warning[700], bg: colors.warning[50] },
    high:   { label: 'Высокий', color: colors.error[700],   bg: colors.error[50] },
  };

  // Filter cases
  const filtered = cases.filter(c => {
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (selectedRisk && c.risk_level !== selectedRisk) return false;
    return true;
  });

  // Detail view
  if (detailCase || detailLoading) {
    return (
      <div>
        <button onClick={() => { setDetailCase(null); setCustomResult(null); }} style={{
          padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
          border: `1px solid ${semantic.border}`, backgroundColor: 'transparent',
          color: semantic.textSecondary, fontSize: typography.fontSize.md,
          cursor: 'pointer', marginBottom: spacing[4],
        }}>
          ← Назад к списку
        </button>

        {detailLoading && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[10] }}>
            <p style={{ color: semantic.textMuted }}>Загрузка кейса...</p>
          </div>
        )}

        {detailCase && (
          <>
            {/* Case info */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderColor: colors.primary[200] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing[3] }}>
                <div>
                  <h3 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[800], marginBottom: spacing[2] }}>
                    {detailCase.case.name}
                  </h3>
                  <p style={{ fontSize: typography.fontSize.md, color: semantic.textSecondary, marginBottom: spacing[2], maxWidth: '600px' }}>
                    {detailCase.case.description}
                  </p>
                  <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>📍 {detailCase.case.region}</span>
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>🏭 {detailCase.case.industry}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>Инвестиция</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[800] }}>
                    {fmt(detailCase.case.initial_investment)} млн
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[600], marginTop: spacing[1] }}>
                    Ставка: {((detailCase.case.discount_rate || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* DCF results */}
            {detailCase.dcf && !detailCase.dcf.error && <DCFResults result={detailCase.dcf} />}

            {/* Custom calculation */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: customCalc ? spacing[4] : 0 }}>
                <h4 style={{ ...sectionTitle, marginBottom: 0 }}>Рассчитать с параметрами</h4>
                <button onClick={() => setCustomCalc(!customCalc)} style={{
                  padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
                  border: `1px solid ${colors.primary[300]}`, backgroundColor: colors.primary[50],
                  color: colors.primary[700], fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold, cursor: 'pointer',
                }}>
                  {customCalc ? 'Скрыть' : '⚙️ Настроить'}
                </button>
              </div>

              {customCalc && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[4] }}>
                    <div>
                      <span style={labelStyle}>Ставка дисконтирования (пусто = из кейса)</span>
                      <input type="number" step="0.01" value={customRate} onChange={e => setCustomRate(e.target.value)} placeholder={String(detailCase.case.discount_rate)} style={inputStyle} />
                    </div>
                    <div>
                      <span style={labelStyle}>Множитель денежных потоков</span>
                      <input type="number" step="0.1" value={cfMult} onChange={e => setCfMult(e.target.value)} placeholder="1.0" style={inputStyle} />
                    </div>
                    <div>
                      <span style={labelStyle}>Множитель инвестиции</span>
                      <input type="number" step="0.1" value={invMult} onChange={e => setInvMult(e.target.value)} placeholder="1.0" style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={runCustomCalc} disabled={customLoading} style={{ ...btnPrimary, opacity: customLoading ? 0.6 : 1 }}>
                    {customLoading ? 'Расчёт...' : 'Запустить полный анализ'}
                  </button>
                </div>
              )}
            </div>

            {/* Custom calculation results */}
            {customResult && (
              <div>
                {customResult.dcf && !customResult.dcf.error && (
                  <>
                    <h3 style={sectionTitle}>DCF с пользовательскими параметрами</h3>
                    <DCFResults result={customResult.dcf} />
                  </>
                )}

                {/* What-If scenarios from custom */}
                {customResult.what_if && !customResult.what_if.error && customResult.what_if.scenarios && (
                  <div style={cardStyle}>
                    <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                      What-If сценарии
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[3] }}>
                      {customResult.what_if.scenarios.map((sc: unknown, i: number) => (
                        <div key={i} style={{
                          padding: spacing[3], borderRadius: radius.xl,
                          backgroundColor: sc.name_en === 'optimistic' ? colors.success[50] : sc.name_en === 'pessimistic' ? colors.error[50] : colors.neutral[50],
                          border: `1px solid ${sc.name_en === 'optimistic' ? colors.success[200] : sc.name_en === 'pessimistic' ? colors.error[200] : colors.neutral[200]}`,
                        }}>
                          <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: semantic.textPrimary }}>{sc.name}</div>
                          <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: sc.npv >= 0 ? colors.success[700] : colors.error[700], marginTop: spacing[1] }}>
                            {fmt(sc.npv)} млн
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monte Carlo summary from custom */}
                {customResult.monte_carlo && !customResult.monte_carlo.error && (
                  <div style={cardStyle}>
                    <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                      Монте-Карло ({customResult.monte_carlo.num_simulations?.toLocaleString('ru-RU')} симуляций)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing[3] }}>
                      <SummaryCard label="Средний NPV" value={`${fmt(customResult.monte_carlo.statistics?.mean)} млн`} color={colors.primary[600]} bg={colors.primary[50]} />
                      <SummaryCard label="Вероятность прибыли" value={customResult.monte_carlo.probability_profit_pct || '0%'} color={colors.success[600]} bg={colors.success[50]} />
                      <SummaryCard label="VaR 95%" value={`${fmt(customResult.monte_carlo.var?.var_95)} млн`} color={colors.error[600]} bg={colors.error[50]} />
                      <SummaryCard label="VaR 99%" value={`${fmt(customResult.monte_carlo.var?.var_99)} млн`} color={colors.error[600]} bg={colors.error[50]} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // List view
  if (loading) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[10] }}>
        <p style={{ color: semantic.textMuted }}>Загрузка бизнес-кейсов...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category filter */}
      <div style={{ marginBottom: spacing[4] }}>
        <span style={labelStyle}>Категория</span>
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
              border: !selectedCategory ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
              backgroundColor: !selectedCategory ? colors.primary[50] : 'transparent',
              color: !selectedCategory ? colors.primary[700] : semantic.textSecondary,
              fontWeight: typography.fontWeight.semibold, cursor: 'pointer', fontSize: typography.fontSize.sm,
            }}
          >
            Все ({cases.length})
          </button>
          {categories.map((cat: unknown) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category === selectedCategory ? '' : cat.category)}
              style={{
                padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
                border: selectedCategory === cat.category ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
                backgroundColor: selectedCategory === cat.category ? colors.primary[50] : 'transparent',
                color: selectedCategory === cat.category ? colors.primary[700] : semantic.textSecondary,
                fontWeight: typography.fontWeight.semibold, cursor: 'pointer', fontSize: typography.fontSize.sm,
              }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Risk filter */}
      <div style={{ marginBottom: spacing[5] }}>
        <span style={labelStyle}>Уровень риска</span>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          {[
            { key: '', label: 'Все' },
            { key: 'low', label: 'Низкий' },
            { key: 'medium', label: 'Средний' },
            { key: 'high', label: 'Высокий' },
          ].map(r => (
            <button
              key={r.key}
              onClick={() => setSelectedRisk(r.key === selectedRisk ? '' : r.key)}
              style={{
                padding: `${spacing[2]} ${spacing[3]}`, borderRadius: radius.lg,
                border: selectedRisk === r.key ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
                backgroundColor: selectedRisk === r.key ? colors.primary[50] : 'transparent',
                color: selectedRisk === r.key ? colors.primary[700] : semantic.textSecondary,
                fontWeight: typography.fontWeight.medium, cursor: 'pointer', fontSize: typography.fontSize.sm,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: spacing[4] }}>
        {filtered.map((c: unknown) => {
          const risk = riskLabels[c.risk_level] || riskLabels.medium;
          return (
            <div
              key={c.id}
              onClick={() => openDetail(c.id)}
              style={{
                ...componentStyles.card,
                cursor: 'pointer',
                transition: transitions.normal,
                border: `1px solid ${semantic.border}`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = colors.primary[300]; (e.currentTarget as HTMLElement).style.boxShadow = shadows.md; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = semantic.border; (e.currentTarget as HTMLElement).style.boxShadow = shadows.sm; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.primary[600], fontWeight: typography.fontWeight.medium }}>
                  {c.category_name}
                </div>
                <span style={{
                  padding: `2px ${spacing[3]}`, borderRadius: radius.full,
                  backgroundColor: risk.bg, color: risk.color,
                  fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold,
                }}>
                  {risk.label}
                </span>
              </div>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[1] }}>
                {c.name}
              </h4>
              <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3], lineHeight: 1.5 }}>
                {c.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] }}>
                <div>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Инвестиция</div>
                  <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>
                    {fmt(c.initial_investment_mln)} млн
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Окупаемость</div>
                  <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.primary[600] }}>
                    {c.typical_payback}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm, color: semantic.textMuted }}>
                📍 {c.region} · {c.years} лет
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[10] }}>
          <p style={{ color: semantic.textMuted }}>Нет кейсов по выбранным фильтрам</p>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════════════════════ */

function SummaryCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{
      padding: spacing[4],
      backgroundColor: bg,
      borderRadius: radius.xl,
      border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[1] }}>{label}</div>
      <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color }}>{value}</div>
    </div>
  );
}
