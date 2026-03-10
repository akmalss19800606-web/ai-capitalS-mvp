'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, componentStyles,
} from '@/lib/design-tokens';
import { useLocale } from '@/lib/i18n';

/* ─── Types ─── */
interface ScreeningResult {
  success: boolean;
  data: any;
}

/* ─── Tab type ─── */
type TabId = 'screening' | 'zakat' | 'reference';

/* ─── Status badge colors ─── */
const complianceColors: Record<string, { bg: string; text: string; label: string }> = {
  compliant:     { bg: colors.success[50],  text: colors.success[700], label: 'Халяль' },
  non_compliant: { bg: colors.error[50],    text: colors.error[700],   label: 'Харам' },
  doubtful:      { bg: colors.warning[50],  text: colors.warning[700], label: 'Сомнительный' },
  not_screened:  { bg: colors.neutral[100], text: colors.neutral[600], label: 'Не проверено' },
};

/* ─── Styles ─── */
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

/* ─── Main Component ─── */
export default function IslamicFinancePage() {
  const router = useRouter();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('screening');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'screening', label: 'Шариат-скрининг', icon: '🛡️' },
    { id: 'zakat',     label: 'Калькулятор закята', icon: '🧮' },
    { id: 'reference', label: 'Справочники', icon: '📚' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing[6] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <div style={{
            width: 44, height: 44, borderRadius: radius.xl,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}>
            ☪
          </div>
          <div>
            <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>
              Исламские финансы
            </h1>
            <p style={{ color: semantic.textSecondary, fontSize: typography.fontSize.md }}>
              Шариат-скрининг и калькулятор закята · AAOIFI / DJIM / S&P Shariah
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
      {activeTab === 'screening' && <ScreeningTab />}
      {activeTab === 'zakat' && <ZakatTab />}
      {activeTab === 'reference' && <ReferenceTab />}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1: Шариат-скрининг
   ═══════════════════════════════════════════════════════════════════════════ */
function ScreeningTab() {
  const [mode, setMode] = useState<'industry' | 'financial' | 'full'>('full');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [haramRevenue, setHaramRevenue] = useState('');

  const handleScreening = async () => {
    if (!companyName) return;
    setLoading(true);
    setResult(null);

    try {
      let endpoint = '/islamic-finance/screening/full';
      const body: any = { company_name: companyName, industry, description };

      if (mode === 'industry') {
        endpoint = '/islamic-finance/screening/industry';
      } else if (mode === 'financial') {
        endpoint = '/islamic-finance/screening/financial';
        body.total_assets = parseFloat(totalAssets) || 0;
        body.total_debt = parseFloat(totalDebt) || 0;
        body.total_revenue = parseFloat(totalRevenue) || 0;
        body.haram_revenue = parseFloat(haramRevenue) || 0;
      } else {
        body.total_assets = parseFloat(totalAssets) || 0;
        body.total_debt = parseFloat(totalDebt) || 0;
        body.total_revenue = parseFloat(totalRevenue) || 0;
        body.haram_revenue = parseFloat(haramRevenue) || 0;
      }

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResult(res.data);
    } catch (e) {
      setResult({ error: 'Ошибка при выполнении скрининга' });
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (status: string) => complianceColors[status] || complianceColors.not_screened;

  return (
    <div>
      {/* Mode selector */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Тип скрининга</h3>
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
          {[
            { id: 'full' as const, label: 'Комплексный', desc: 'Отрасль + финансы' },
            { id: 'industry' as const, label: 'Отраслевой', desc: 'Только харам-индустрии' },
            { id: 'financial' as const, label: 'Финансовый', desc: 'Пороги AAOIFI' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); }}
              style={{
                flex: '1 1 180px',
                padding: spacing[4],
                borderRadius: radius.xl,
                border: mode === m.id ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
                backgroundColor: mode === m.id ? colors.primary[50] : semantic.bgCard,
                cursor: 'pointer',
                textAlign: 'left',
                transition: transitions.normal,
              }}
            >
              <div style={{ fontWeight: typography.fontWeight.semibold, color: mode === m.id ? colors.primary[700] : semantic.textPrimary, fontSize: typography.fontSize.md }}>
                {m.label}
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginTop: '2px' }}>
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input form */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Данные компании</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[4] }}>
          <div>
            <span style={labelStyle}>Название компании *</span>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Например: Uzpromstroybank"
              style={inputStyle}
            />
          </div>

          {(mode === 'full' || mode === 'industry') && (
            <>
              <div>
                <span style={labelStyle}>Отрасль / Сектор</span>
                <input
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="Например: Banking, IT, Agriculture"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: 'span 1' }}>
                <span style={labelStyle}>Описание деятельности</span>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Краткое описание"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {(mode === 'full' || mode === 'financial') && (
            <>
              <div>
                <span style={labelStyle}>Общие активы (USD)</span>
                <input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Общий долг (USD)</span>
                <input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Общий доход (USD)</span>
                <input type="number" value={totalRevenue} onChange={e => setTotalRevenue(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Запрещённый доход (USD)</span>
                <input type="number" value={haramRevenue} onChange={e => setHaramRevenue(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: spacing[5] }}>
          <button
            onClick={handleScreening}
            disabled={loading || !companyName}
            style={{ ...btnPrimary, opacity: loading || !companyName ? 0.6 : 1 }}
          >
            {loading ? 'Анализ...' : 'Запустить скрининг'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && !result.error && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[5] }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Результат скрининга</h3>
            <StatusBadge status={result.overall_status || result.status} />
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[5] }}>
            <SummaryCard label="Компания" value={result.company_name || companyName} color={colors.primary[600]} bg={colors.primary[50]} />
            <SummaryCard
              label="Статус"
              value={getStatus(result.overall_status || result.status).label}
              color={getStatus(result.overall_status || result.status).text}
              bg={getStatus(result.overall_status || result.status).bg}
            />
            {result.industry_screening && (
              <SummaryCard
                label="Отраслевой скрининг"
                value={result.industry_screening.violations_count > 0 ? `${result.industry_screening.violations_count} нарушений` : 'Чисто'}
                color={result.industry_screening.violations_count > 0 ? colors.error[600] : colors.success[600]}
                bg={result.industry_screening.violations_count > 0 ? colors.error[50] : colors.success[50]}
              />
            )}
            {result.financial_screening && result.financial_screening.checks && (
              <SummaryCard
                label="Финансовые проверки"
                value={`${result.financial_screening.checks_count - result.financial_screening.violations_count} / ${result.financial_screening.checks_count} пройдено`}
                color={result.financial_screening.violations_count > 0 ? colors.warning[600] : colors.success[600]}
                bg={result.financial_screening.violations_count > 0 ? colors.warning[50] : colors.success[50]}
              />
            )}
          </div>

          {/* Financial checks detail */}
          {result.financial_screening && result.financial_screening.checks && (
            <div style={{ marginBottom: spacing[5] }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                Финансовые показатели (AAOIFI)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {result.financial_screening.checks.map((check: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: `${spacing[3]} ${spacing[4]}`,
                    backgroundColor: check.passed ? colors.success[50] : colors.error[50],
                    borderRadius: radius.lg,
                    border: `1px solid ${check.passed ? colors.success[200] : colors.error[200]}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                      <span style={{ fontSize: '16px' }}>{check.passed ? '✅' : '❌'}</span>
                      <div>
                        <div style={{ fontWeight: typography.fontWeight.medium, color: semantic.textPrimary, fontSize: typography.fontSize.md }}>
                          {check.name_ru}
                        </div>
                        <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>
                          {check.standard}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontWeight: typography.fontWeight.semibold,
                      color: check.passed ? colors.success[700] : colors.error[700],
                      fontSize: typography.fontSize.md,
                    }}>
                      {check.display}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry violations */}
          {result.industry_screening && result.industry_screening.violations && result.industry_screening.violations.length > 0 && (
            <div style={{ marginBottom: spacing[5] }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.error[700], marginBottom: spacing[3] }}>
                Нарушения отраслевых ограничений
              </h4>
              {result.industry_screening.violations.map((v: any, i: number) => (
                <div key={i} style={{
                  padding: `${spacing[3]} ${spacing[4]}`,
                  backgroundColor: colors.error[50],
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.error[200]}`,
                  marginBottom: spacing[2],
                }}>
                  <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.error[700] }}>
                    ❌ {v.category_name_ru} ({v.category_name_en})
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: '2px' }}>
                    {v.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div style={{
              padding: spacing[4],
              backgroundColor: colors.primary[50],
              borderRadius: radius.xl,
              border: `1px solid ${colors.primary[200]}`,
            }}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[3] }}>
                Рекомендации
              </h4>
              {result.recommendations.map((rec: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2] }}>
                  <span style={{ color: colors.primary[500] }}>•</span>
                  <span style={{ fontSize: typography.fontSize.md, color: semantic.textPrimary }}>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result && result.error && (
        <div style={{ ...cardStyle, backgroundColor: colors.error[50], borderColor: colors.error[200] }}>
          <p style={{ color: colors.error[700] }}>{result.error}</p>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2: Калькулятор закята
   ═══════════════════════════════════════════════════════════════════════════ */
function ZakatTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nisab, setNisab] = useState<any>(null);
  const [guide, setGuide] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Form
  const [currency, setCurrency] = useState('UZS');
  const [cash, setCash] = useState('');
  const [investments, setInvestments] = useState('');
  const [businessInv, setBusinessInv] = useState('');
  const [receivables, setReceivables] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [loans, setLoans] = useState('');
  const [debts, setDebts] = useState('');
  const [hawlStart, setHawlStart] = useState('');

  // Load nisab on mount
  useEffect(() => {
    fetchNisab(currency);
  }, [currency]);

  const fetchNisab = async (curr: string) => {
    try {
      const res = await apiRequest(`/islamic-finance/zakat/nisab?currency=${curr}`);
      setNisab(res.data);
    } catch (e) { /* ignore */ }
  };

  const loadGuide = async () => {
    if (guide) { setShowGuide(!showGuide); return; }
    try {
      const res = await apiRequest('/islamic-finance/zakat/guide');
      setGuide(res.data);
      setShowGuide(true);
    } catch (e) { /* ignore */ }
  };

  const calculateZakat = async () => {
    setLoading(true);
    setResult(null);

    const assets: Record<string, number> = {};
    if (cash) assets.cash = parseFloat(cash);
    if (investments) assets.investments = parseFloat(investments);
    if (businessInv) assets.business_inventory = parseFloat(businessInv);
    if (receivables) assets.receivables = parseFloat(receivables);

    const liabilities: Record<string, number> = {};
    if (loans) liabilities.loans = parseFloat(loans);
    if (debts) liabilities.debts = parseFloat(debts);

    try {
      const res = await apiRequest('/islamic-finance/zakat/calculate', {
        method: 'POST',
        body: JSON.stringify({
          assets,
          liabilities: Object.keys(liabilities).length > 0 ? liabilities : null,
          currency,
          gold_grams: parseFloat(goldGrams) || 0,
          silver_grams: parseFloat(silverGrams) || 0,
          hijri_year_start: hawlStart || null,
        }),
      });
      setResult(res.data);
    } catch (e) {
      setResult({ error: 'Ошибка расчёта закята' });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (n: number) => n?.toLocaleString('ru-RU') || '0';

  return (
    <div>
      {/* Nisab info */}
      {nisab && (
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
          borderColor: colors.success[200],
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing[3] }}>
            <div>
              <h3 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.success[800], marginBottom: spacing[1] }}>
                Текущий нисаб
              </h3>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.success[600] }}>
                Минимальный порог для обязательности закята
              </p>
            </div>
            <div style={{ display: 'flex', gap: spacing[5], flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.success[600] }}>Золото (85г)</div>
                <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.success[800] }}>
                  {nisab.nisab_gold.display}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.success[600] }}>Серебро (595г)</div>
                <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.success[800] }}>
                  {nisab.nisab_silver.display}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input form */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Расчёт закята</h3>
          <button onClick={loadGuide} style={{
            padding: `${spacing[2]} ${spacing[4]}`,
            borderRadius: radius.lg,
            border: `1px solid ${semantic.border}`,
            backgroundColor: 'transparent',
            color: semantic.textSecondary,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
          }}>
            {showGuide ? 'Скрыть руководство' : '📖 Руководство по закяту'}
          </button>
        </div>

        {/* Guide section */}
        {showGuide && guide && (
          <div style={{
            padding: spacing[4], marginBottom: spacing[4],
            backgroundColor: colors.primary[50], borderRadius: radius.xl,
            border: `1px solid ${colors.primary[200]}`,
          }}>
            {guide.sections.map((section: any, i: number) => (
              <div key={i} style={{ marginBottom: spacing[3] }}>
                <h4 style={{ fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[1] }}>
                  {section.title}
                </h4>
                {section.content && (
                  <p style={{ fontSize: typography.fontSize.md, color: semantic.textSecondary, lineHeight: 1.6 }}>
                    {section.content}
                  </p>
                )}
                {section.categories && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] }}>
                    {section.categories.map((cat: string, j: number) => (
                      <span key={j} style={{
                        padding: `${spacing[1]} ${spacing[3]}`,
                        backgroundColor: colors.primary[100],
                        borderRadius: radius.full,
                        fontSize: typography.fontSize.sm,
                        color: colors.primary[700],
                      }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, fontStyle: 'italic', marginTop: spacing[3] }}>
              {guide.disclaimer}
            </p>
          </div>
        )}

        {/* Currency selector */}
        <div style={{ marginBottom: spacing[4] }}>
          <span style={labelStyle}>Валюта расчёта</span>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {['UZS', 'USD', 'EUR', 'RUB'].map(curr => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  borderRadius: radius.lg,
                  border: currency === curr ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
                  backgroundColor: currency === curr ? colors.primary[50] : 'transparent',
                  color: currency === curr ? colors.primary[700] : semantic.textSecondary,
                  fontWeight: typography.fontWeight.semibold,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.md,
                }}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Assets */}
        <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
          Активы
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[4] }}>
          <div>
            <span style={labelStyle}>Наличные и вклады ({currency})</span>
            <input type="number" value={cash} onChange={e => setCash(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Инвестиции ({currency})</span>
            <input type="number" value={investments} onChange={e => setInvestments(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Товарные запасы ({currency})</span>
            <input type="number" value={businessInv} onChange={e => setBusinessInv(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Дебиторская задолженность ({currency})</span>
            <input type="number" value={receivables} onChange={e => setReceivables(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Золото (граммы)</span>
            <input type="number" value={goldGrams} onChange={e => setGoldGrams(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Серебро (граммы)</span>
            <input type="number" value={silverGrams} onChange={e => setSilverGrams(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        {/* Liabilities */}
        <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
          Обязательства (вычитаются)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[4] }}>
          <div>
            <span style={labelStyle}>Кредиты ({currency})</span>
            <input type="number" value={loans} onChange={e => setLoans(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Прочие долги ({currency})</span>
            <input type="number" value={debts} onChange={e => setDebts(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Начало хауля (лунного года)</span>
            <input type="date" value={hawlStart} onChange={e => setHawlStart(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button
          onClick={calculateZakat}
          disabled={loading}
          style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Расчёт...' : 'Рассчитать закят'}
        </button>
      </div>

      {/* Results */}
      {result && !result.error && (
        <div>
          {/* Main result */}
          <div style={{
            ...cardStyle,
            background: result.meets_nisab
              ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
              : 'linear-gradient(135deg, #fefce8, #fef9c3)',
            borderColor: result.meets_nisab ? colors.success[300] : colors.warning[300],
          }}>
            <div style={{ textAlign: 'center', padding: spacing[4] }}>
              <div style={{ fontSize: typography.fontSize.sm, color: result.meets_nisab ? colors.success[600] : colors.warning[600], marginBottom: spacing[2] }}>
                {result.meets_nisab ? 'Закят обязателен' : 'Закят не обязателен (ниже нисаба)'}
              </div>
              <div style={{
                fontSize: '36px', fontWeight: typography.fontWeight.bold,
                color: result.meets_nisab ? colors.success[800] : colors.warning[800],
              }}>
                {result.zakat_display}
              </div>
              <div style={{ fontSize: typography.fontSize.md, color: result.meets_nisab ? colors.success[600] : colors.warning[600], marginTop: spacing[2] }}>
                Ставка: {result.zakat_rate} от чистых активов
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[5] }}>
            <SummaryCard label="Общие активы" value={`${formatNumber(result.total_assets)} ${currency}`} color={colors.primary[600]} bg={colors.primary[50]} />
            <SummaryCard label="Общие обязательства" value={`${formatNumber(result.total_liabilities)} ${currency}`} color={colors.error[600]} bg={colors.error[50]} />
            <SummaryCard label="Чистые активы" value={result.net_assets_display} color={colors.success[600]} bg={colors.success[50]} />
            <SummaryCard label="Порог нисаба" value={result.nisab_display} color={colors.warning[600]} bg={colors.warning[50]} />
          </div>

          {/* Hawl info */}
          {result.hawl && !result.hawl.error && (
            <div style={cardStyle}>
              <h4 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>
                Хауль (лунный год)
              </h4>
              <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap' }}>
                <div style={{ padding: spacing[3], backgroundColor: semantic.bgHover, borderRadius: radius.lg }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>До хауля</div>
                  <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>
                    {result.hawl.days_remaining} дней
                  </div>
                </div>
                <div style={{ padding: spacing[3], backgroundColor: semantic.bgHover, borderRadius: radius.lg }}>
                  <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>Статус</div>
                  <div style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: result.hawl.completed ? colors.success[600] : colors.primary[600] }}>
                    {result.hawl.completed ? 'Завершён — закят обязателен' : 'В процессе'}
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      )}

      {result && result.error && (
        <div style={{ ...cardStyle, backgroundColor: colors.error[50], borderColor: colors.error[200] }}>
          <p style={{ color: colors.error[700] }}>{result.error}</p>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   TAB 3: Справочники
   ═══════════════════════════════════════════════════════════════════════════ */
function ReferenceTab() {
  const [haramList, setHaramList] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [h, t, ind] = await Promise.all([
        apiRequest('/islamic-finance/reference/haram-industries'),
        apiRequest('/islamic-finance/reference/financial-thresholds'),
        apiRequest('/islamic-finance/reference/shariah-indices'),
      ]);
      setHaramList(h.data || []);
      setThresholds(t.data || []);
      setIndices(ind.data || []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[10] }}>
        <p style={{ color: semantic.textMuted }}>Загрузка справочников...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Haram industries */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Запрещённые отрасли (Харам)</h3>
        <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[4] }}>
          По стандартам AAOIFI Shariah Standard No. 21 и DJIM Methodology
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[3] }}>
          {haramList.map((item: any, i: number) => (
            <div key={i} style={{
              padding: spacing[4],
              backgroundColor: colors.error[50],
              borderRadius: radius.xl,
              border: `1px solid ${colors.error[200]}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                <span style={{ fontSize: '18px' }}>🚫</span>
                <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.error[700], fontSize: typography.fontSize.md }}>
                  {item.name_ru}
                </span>
                <span style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>
                  ({item.name_en})
                </span>
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Financial thresholds */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Финансовые пороги AAOIFI</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${semantic.border}` }}>
                <th style={{ textAlign: 'left', padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: typography.fontWeight.semibold }}>Критерий</th>
                <th style={{ textAlign: 'center', padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: typography.fontWeight.semibold }}>Максимум</th>
                <th style={{ textAlign: 'left', padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.fontSize.sm, color: semantic.textMuted, fontWeight: typography.fontWeight.semibold }}>Стандарт</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${semantic.borderLight}` }}>
                  <td style={{ padding: `${spacing[3]} ${spacing[4]}` }}>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: semantic.textPrimary, fontSize: typography.fontSize.md }}>{item.name_ru}</div>
                    <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted }}>{item.description}</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: `${spacing[3]} ${spacing[4]}` }}>
                    <span style={{
                      padding: `${spacing[1]} ${spacing[3]}`,
                      backgroundColor: colors.warning[100],
                      borderRadius: radius.full,
                      fontWeight: typography.fontWeight.bold,
                      color: colors.warning[700],
                      fontSize: typography.fontSize.md,
                    }}>
                      {item.max_percentage}
                    </span>
                  </td>
                  <td style={{ padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
                    {item.standard}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shariah indices */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Шариатские индексы</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[3] }}>
          {indices.map((item: any, i: number) => (
            <div key={i} style={{
              padding: spacing[4],
              backgroundColor: colors.primary[50],
              borderRadius: radius.xl,
              border: `1px solid ${colors.primary[200]}`,
            }}>
              <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.primary[700], fontSize: typography.fontSize.md, marginBottom: spacing[1] }}>
                {item.name}
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[2] }}>
                {item.provider}
              </div>
              <p style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginBottom: spacing[2] }}>
                {item.description}
              </p>
              <a href={item.methodology_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: typography.fontSize.sm, color: colors.primary[600], textDecoration: 'none' }}>
                Методология →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   Helper Components
   ═══════════════════════════════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const s = complianceColors[status] || complianceColors.not_screened;
  return (
    <span style={{
      padding: `${spacing[1]} ${spacing[4]}`,
      borderRadius: radius.full,
      backgroundColor: s.bg,
      color: s.text,
      fontWeight: typography.fontWeight.bold,
      fontSize: typography.fontSize.sm,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  );
}

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
