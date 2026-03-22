'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, componentStyles,
} from '@/lib/design-tokens';
import { useLocale } from '@/lib/i18n';

/* Helper: normalize API response */
const toArray = (r: any): any[] => Array.isArray(r) ? r : (r?.data && Array.isArray(r.data) ? r.data : []);

/* --- Types --- */
interface ScreeningResult { success: boolean; data: unknown; }

type TabId = 'screening' | 'zakat' | 'reference' | 'products' | 'purification' | 'posc' | 'ssb' | 'glossary' | 'p2p';

/* --- Status badge colors --- */
const complianceColors: Record<string, { bg: string; text: string; label: string }> = {
  compliant:      { bg: colors.success[50],  text: colors.success[700], label: 'Халяль' },
  non_compliant:  { bg: colors.error[50],    text: colors.error[700],   label: 'Харам' },
  doubtful:       { bg: colors.warning[50],  text: colors.warning[700], label: 'Сомнительный' },
  not_screened:   { bg: colors.neutral[100], text: colors.neutral[600], label: 'Не проверено' },
};

/* --- Styles --- */
const cardStyle: React.CSSProperties = { ...componentStyles.card, marginBottom: spacing[5] };
const inputStyle: React.CSSProperties = {
  ...componentStyles.input, width: '100%', padding: '10px 14px',
  fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, color: semantic.textPrimary,
};
const labelStyle: React.CSSProperties = {
  fontSize: typography.fontSize.sm, color: semantic.textSecondary,
  fontWeight: typography.fontWeight.medium, display: 'block', marginBottom: '6px',
};
const btnPrimary: React.CSSProperties = {
  padding: '11px 28px', borderRadius: radius.lg, backgroundColor: colors.primary[600],
  color: '#fff', border: 'none', fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold, cursor: 'pointer', transition: transitions.color,
};
const sectionTitle: React.CSSProperties = {
  fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold,
  color: semantic.textPrimary, marginBottom: spacing[4],
};

/* --- Main Component --- */
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
    { id: 'zakat', label: 'Калькулятор закята', icon: '🧮' },
    { id: 'products', label: 'Продукты', icon: '📦' },
    { id: 'purification', label: 'Очистка дохода', icon: '🧹' },
    { id: 'posc', label: 'PoSC', icon: '📋' },
    { id: 'ssb', label: 'SSB / Фатвы', icon: '⚖️' },
    { id: 'glossary', label: 'Глоссарий', icon: '📖' },
    { id: 'p2p', label: 'P2P Исламские', icon: '🤝' },
    { id: 'reference', label: 'Справочники', icon: '📚' },
  ];

  return (
    <div style={{ padding: spacing[6], maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[6] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
          <span style={{ fontSize: '28px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>⬅</span>
          <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, margin: 0 }}>
            Исламские финансы
          </h1>
        </div>
        <p style={{ color: semantic.textSecondary, margin: 0, fontSize: typography.fontSize.md }}>
          Шариат-скрининг, закят, продукты, очистка &middot; AAOIFI / DJIM / S&amp;P Shariah
        </p>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: spacing[1], borderBottom: `1px solid ${semantic.border}`, marginBottom: spacing[5], overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: `${spacing[3]} ${spacing[4]}`, border: 'none',
            borderBottom: activeTab === tab.id ? `2px solid ${colors.primary[600]}` : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === tab.id ? colors.primary[700] : semantic.textSecondary,
            fontWeight: activeTab === tab.id ? typography.fontWeight.semibold : typography.fontWeight.medium,
            fontSize: typography.fontSize.sm, cursor: 'pointer', transition: transitions.color,
            marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: spacing[1], whiteSpace: 'nowrap',
          }}>
            <span>{tab.icon}</span> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'screening' && <ScreeningTab />}
      {activeTab === 'zakat' && <ZakatTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'purification' && <PurificationTab />}
      {activeTab === 'posc' && <PoSCTab />}
      {activeTab === 'ssb' && <SSBTab />}
      {activeTab === 'glossary' && <GlossaryTab />}
      {activeTab === 'p2p' && <P2PTab />}
      {activeTab === 'reference' && <ReferenceTab />}
    </div>
  );
}

/* ======= TAB 1: Screening ======= */
function ScreeningTab() {
  const [mode, setMode] = useState<'industry' | 'financial' | 'full'>('full');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [ticker, setTicker] = useState('');
  const [industry, setIndustry] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [haramRevenue, setHaramRevenue] = useState('');
  const [marketCap, setMarketCap] = useState('');
  const [interestSec, setInterestSec] = useState('');
  const [cashInterest, setCashInterest] = useState('');
  const [receivables, setReceivables] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { loadHistory(); }, []);
  const loadHistory = async () => {
    try { const r = await apiRequest('/islamic-finance/screening'); setHistory(toArray(r)); } catch {}
  };

  const handleScreening = async () => {
    if (!companyName) return;
    setLoading(true); setResult(null);
    try {
      const res = await apiRequest('/islamic-finance/screening', {
        method: 'POST',
        body: JSON.stringify({
          company_name: companyName, ticker: ticker || '',
          standard: 'ALL',
          total_assets: parseFloat(totalAssets) || 0,
          total_debt: parseFloat(totalDebt) || 0,
          total_revenue: parseFloat(totalRevenue) || 0,
          haram_revenue: parseFloat(haramRevenue) || 0,
          market_cap: parseFloat(marketCap || totalAssets) || 0,
          interest_bearing_securities: parseFloat(interestSec) || 0,
          cash_and_interest: parseFloat(cashInterest) || 0,
          receivables: parseFloat(receivables) || 0,
        }),
      });
      setResult(res);
      loadHistory();
    } catch { setResult({ error: 'Ошибка при скрининге' }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Тип скрининга</h3>
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[4] }}>
          {[
            { id: 'full' as const, label: 'Комплексный', desc: 'Отрасль + финансы' },
            { id: 'industry' as const, label: 'Отраслевой', desc: 'Харам-индустрии' },
            { id: 'financial' as const, label: 'Финансовый', desc: 'Пороги AAOIFI' },
          ].map(m => (
            <div key={m.id} onClick={() => { setMode(m.id); setResult(null); }} style={{
              flex: '1 1 160px', padding: spacing[4], borderRadius: radius.xl,
              border: mode === m.id ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
              backgroundColor: mode === m.id ? colors.primary[50] : semantic.bgCard,
              cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{m.label}</div>
              <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{m.desc}</div>
            </div>
          ))}
        </div>

        <h3 style={sectionTitle}>Данные компании</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: spacing[4] }}>
          <div>
            <label style={labelStyle}>Название компании *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Uzpromstroybank" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Ticker</label>
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="UZPS" style={inputStyle} />
          </div>
          {(mode === 'full' || mode === 'financial') && (
            <>
              <div><label style={labelStyle}>Общие активы (USD)</label><input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Общий долг (USD)</label><input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Общий доход (USD)</label><input type="number" value={totalRevenue} onChange={e => setTotalRevenue(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Харам доход (USD)</label><input type="number" value={haramRevenue} onChange={e => setHaramRevenue(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Рыночная кап. (USD)</label><input type="number" value={marketCap} onChange={e => setMarketCap(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Проц. ценн. бум. (USD)</label><input type="number" value={interestSec} onChange={e => setInterestSec(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Нал. + проц. деп. (USD)</label><input type="number" value={cashInterest} onChange={e => setCashInterest(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Дебитор. задолж. (USD)</label><input type="number" value={receivables} onChange={e => setReceivables(e.target.value)} style={inputStyle} /></div>
            </>
          )}
        </div>

        <button onClick={handleScreening} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4] }}>
          {loading ? 'Анализ...' : 'Запустить скрининг'}
        </button>
      </div>

      {result && !result.error && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Результат скрининга</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
            <StatusBadge status={result.is_compliant ? 'compliant' : 'non_compliant'} />
            <span style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
              {result.overall_score ?? result.score ?? '-'}%
            </span>
            <span style={{ color: semantic.textSecondary }}>{result.company_name}</span>
          </div>
          {(result.result_json || result.standards || []).map((s: any, i: number) => (
            <div key={i} style={{ marginBottom: spacing[4] }}>
              <div style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[2], color: colors.primary[700] }}>
                {s.standard}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: spacing[2] }}>
                {(s.ratios || []).map((r: any, j: number) => (
                  <div key={j} style={{
                    padding: spacing[3], borderRadius: radius.lg,
                    backgroundColor: r.passed ? colors.success[50] : colors.error[50],
                    border: `1px solid ${r.passed ? colors.success[200] : colors.error[200]}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: typography.fontWeight.medium }}>{r.ratio_name}</span>
                      <span>{r.passed ? '✅' : '❌'}</span>
                    </div>
                    <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
                      {r.value}% / {r.threshold}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {result?.error && <div style={{ color: colors.error[600], padding: spacing[4] }}>{result.error}</div>}

      {history.length > 0 && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>История скринингов</h3>
          {history.slice(0, 5).map((h: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}` }}>
              <StatusBadge status={h.is_compliant ? 'compliant' : 'non_compliant'} />
              <span style={{ fontWeight: typography.fontWeight.medium }}>{h.company_name}</span>
              <span style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>{h.standard}</span>
              <span style={{ marginLeft: 'auto', fontWeight: typography.fontWeight.semibold }}>{h.overall_score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======= TAB 2: Zakat Calculator ======= */
function ZakatTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nisab, setNisab] = useState<any>(null);
  const [currency, setCurrency] = useState('UZS');
  const [cash, setCash] = useState('');
  const [investments, setInvestments] = useState('');
  const [businessInv, setBusinessInv] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [loans, setLoans] = useState('');
  const [debts, setDebts] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { fetchNisab(currency); loadHistory(); }, [currency]);

  const fetchNisab = async (c: string) => {
    try { const r = await apiRequest(`/islamic-finance/zakat/nisab?currency=${c}`); setNisab(r.data ?? r); } catch {}
  };
  const loadHistory = async () => {
    try { const r = await apiRequest('/islamic-finance/zakat'); setHistory(toArray(r)); } catch {}
  };

  const calculate = async () => {
    setLoading(true); setResult(null);
    const assets: any = {};
    if (cash) assets.cash = parseFloat(cash);
    if (investments) assets.investments = parseFloat(investments);
    if (businessInv) assets.business_inventory = parseFloat(businessInv);
    const liabilities: any = {};
    if (loans) liabilities.loans = parseFloat(loans);
    if (debts) liabilities.debts = parseFloat(debts);
    try {
      const r = await apiRequest('/islamic-finance/zakat', {
        method: 'POST',
        body: JSON.stringify({
          assets, liabilities: Object.keys(liabilities).length ? liabilities : null,
          currency,
          gold_grams: parseFloat(goldGrams) || 0,
          silver_grams: parseFloat(silverGrams) || 0,
          mode: 'personal', madhab: 'hanafi', nisab_type: 'gold',
        }),
      });
      setResult(r.data ?? r); loadHistory();
    } catch { setResult({ error: 'Ошибка расчёта' }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {nisab && (
        <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
          <div style={{ padding: spacing[4], borderRadius: radius.xl, backgroundColor: colors.warning[50], border: `1px solid ${colors.warning[200]}` }}>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>Нисаб (золото 85г)</div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.warning[700] }}>
              {nisab.nisab_gold?.display ?? nisab.nisab_gold}
            </div>
          </div>
          <div style={{ padding: spacing[4], borderRadius: radius.xl, backgroundColor: colors.neutral[50], border: `1px solid ${semantic.border}` }}>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>Нисаб (серебро 595г)</div>
            <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>
              {nisab.nisab_silver?.display ?? nisab.nisab_silver}
            </div>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Расчёт закята</h3>
        <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
          {['UZS','USD','EUR','RUB'].map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={{
              padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.lg,
              border: currency === c ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
              backgroundColor: currency === c ? colors.primary[50] : 'transparent',
              color: currency === c ? colors.primary[700] : semantic.textSecondary,
              fontWeight: typography.fontWeight.semibold, cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: spacing[4] }}>
          <div>
            <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>Активы</h4>
          </div>
          <div />
          <div><label style={labelStyle}>Наличные ({currency})</label><input type="number" value={cash} onChange={e => setCash(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Инвестиции ({currency})</label><input type="number" value={investments} onChange={e => setInvestments(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Товарные запасы ({currency})</label><input type="number" value={businessInv} onChange={e => setBusinessInv(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Золото (граммы)</label><input type="number" value={goldGrams} onChange={e => setGoldGrams(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Серебро (граммы)</label><input type="number" value={silverGrams} onChange={e => setSilverGrams(e.target.value)} style={inputStyle} /></div>
          <div>
            <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md, marginTop: spacing[3] }}>Обязательства</h4>
          </div>
          <div />
          <div><label style={labelStyle}>Кредиты ({currency})</label><input type="number" value={loans} onChange={e => setLoans(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Прочие долги ({currency})</label><input type="number" value={debts} onChange={e => setDebts(e.target.value)} style={inputStyle} /></div>
        </div>

        <button onClick={calculate} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4] }}>
          {loading ? 'Расчёт...' : 'Рассчитать закят'}
        </button>
      </div>

      {result && !result.error && (
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: spacing[4] }}>
            <div style={{ fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold,
              color: (result.zakat_amount ?? 0) > 0 ? colors.success[600] : semantic.textSecondary }}>
              {(result.zakat_amount ?? 0).toLocaleString()} {result.currency || currency}
            </div>
            <div style={{ color: semantic.textSecondary, marginTop: spacing[2] }}>
              {(result.zakat_amount ?? 0) > 0 ? 'Закят обязателен' : 'Ниже нисаба — закят не обязателен'}
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>
              Закятооблагаемая сумма: {(result.zakatable_amount ?? 0).toLocaleString()} {currency}
            </div>
          </div>
        </div>
      )}
      {result?.error && <div style={{ color: colors.error[600], padding: spacing[4] }}>{result.error}</div>}

      {history.length > 0 && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>История расчётов</h3>
          {history.slice(0, 5).map((h: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}` }}>
              <span style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>{new Date(h.created_at || '').toLocaleDateString()}</span>
              <span style={{ fontWeight: typography.fontWeight.semibold, color: (h.zakat_amount ?? 0) > 0 ? colors.success[600] : semantic.textSecondary }}>
                {(h.zakat_amount ?? 0).toLocaleString()} {h.currency}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ======= TAB 3: Products ======= */
function ProductsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', product_type: 'murabaha', amount: '', rate: '', periods: '' });
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await apiRequest('/islamic-finance/products'); setData(toArray(r)); } catch {} setLoading(false); };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const onSubmit = async () => {
    try {
      await apiRequest('/islamic-finance/products', { method: 'POST', body: JSON.stringify({
        product_type: form.product_type, title: form.title,
        params: { amount: parseFloat(form.amount) || 0, rate: parseFloat(form.rate) || 0.05, periods: parseInt(form.periods) || 12 },
      }) }); load();
    } catch {}
  };
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Создать продукт</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: spacing[4] }}>
          <div><label style={labelStyle}>Название</label><input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Тип</label>
            <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
              <option value="murabaha">Мурабаха</option><option value="ijara">Иджара</option>
              <option value="musharaka">Мушарака</option><option value="mudaraba">Мудараба</option>
              <option value="sukuk">Сукук</option><option value="takaful">Такафул</option>
            </select>
          </div>
          <div><label style={labelStyle}>Сумма</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Ставка</label><input type="number" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.05" style={inputStyle} /></div>
          <div><label style={labelStyle}>Периоды</label><input type="number" value={form.periods} onChange={e => set('periods', e.target.value)} placeholder="12" style={inputStyle} /></div>
        </div>
        <button onClick={onSubmit} style={{ ...btnPrimary, marginTop: spacing[4] }}>Создать</button>
      </div>
      {loading ? <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>
       : data.length === 0 ? <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Нет продуктов</div>
       : data.map((p: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div><span style={{ fontWeight: typography.fontWeight.semibold }}>{p.title || p.product_type}</span>
          <span style={{ marginLeft: spacing[2], color: colors.primary[600], fontSize: typography.fontSize.sm }}>{p.product_type}</span></div>
          {p.params_json && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>
            Сумма: {p.params_json.amount?.toLocaleString()} | Ставка: {p.params_json.rate} | Периоды: {p.params_json.periods}
          </div>}
          {p.result_json && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>
            Итого: {p.result_json.total?.toLocaleString()} | Ежемес. платёж: {p.result_json.monthly_payment?.toLocaleString()}
          </div>}
        </div>
       ))}
    </div>
  );
}

/* ======= TAB 4: Purification ======= */
function PurificationTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState('');
  const [haramPct, setHaramPct] = useState('');
  const [result, setResult] = useState<any>(null);
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await apiRequest('/islamic-finance/purification'); setData(toArray(r)); } catch {} setLoading(false); };
  const calculate = async () => {
    try {
      const r = await apiRequest('/islamic-finance/purification', { method: 'POST', body: JSON.stringify({
        position_name: 'Ручная очистка',
        haram_pct: parseFloat(haramPct) || 0,
        dividend_amount: parseFloat(totalIncome) || 0,
        method: 'dividend_cleansing'
      }) }); setResult(r.data ?? r); load();
    } catch {}
  };
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Расчёт очистки дохода</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: spacing[4] }}>
          <div><label style={labelStyle}>Общий доход</label><input type="number" value={totalIncome} onChange={e => setTotalIncome(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Доля харам (%)</label><input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="5" style={inputStyle} /></div>
        </div>
        <button onClick={calculate} style={{ ...btnPrimary, marginTop: spacing[4] }}>Рассчитать</button>
        {result && <div style={{ marginTop: spacing[4], padding: spacing[4], backgroundColor: colors.success[50], borderRadius: radius.lg, border: `1px solid ${colors.success[200]}` }}>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>Сумма к очистке: {result.purification_amount?.toLocaleString()}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>Направить на благотворительность (sadaqah)</div>
        </div>}
      </div>
      {data.length > 0 && <div style={cardStyle}>
        <h3 style={sectionTitle}>История очисток</h3>
        {data.map((r: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}` }}>
            <span>{r.position_name}</span>
            <span style={{ fontWeight: typography.fontWeight.semibold }}>Доход: {r.dividend_amount?.toLocaleString()} | Очистка: {r.purification_amount?.toLocaleString()}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

/* ======= TAB 5: PoSC ======= */
function PoSCTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetName, setTargetName] = useState('');
  const [targetType, setTargetType] = useState('product');
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await apiRequest('/islamic-finance/posc'); setData(toArray(r)); } catch {} setLoading(false); };
  const generate = async () => {
    try { await apiRequest('/islamic-finance/posc', { method: 'POST', body: JSON.stringify({ target_name: targetName, target_type: targetType }) }); load(); } catch {}
  };
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Сгенерировать PoSC</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: spacing[4] }}>
          <div><label style={labelStyle}>Название объекта</label><input value={targetName} onChange={e => setTargetName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Тип</label>
            <select value={targetType} onChange={e => setTargetType(e.target.value)} style={inputStyle}>
              <option value="product">Продукт</option><option value="portfolio">Портфель</option><option value="company">Компания</option>
            </select>
          </div>
        </div>
        <button onClick={generate} style={{ ...btnPrimary, marginTop: spacing[4] }}>Сгенерировать</button>
      </div>
      {loading ? <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>
       : data.map((r: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>{r.target_name}</div>
          {r.score != null && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>
            Статус: {r.status} | Скор: {r.score}
          </div>}
          {r.category_scores_json && <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[2], flexWrap: 'wrap' }}>
            {Object.entries(r.category_scores_json).map(([k, v]: any) => (
              <span key={k} style={{ padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.lg, backgroundColor: colors.primary[50], fontSize: typography.fontSize.sm }}>
                {k}: {v}
              </span>
            ))}
          </div>}
        </div>
       ))}
    </div>
  );
}

/* ======= TAB 6: SSB / Fatwas ======= */
function SSBTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [fatwas, setFatwas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [m, f] = await Promise.all([apiRequest('/islamic-finance/ssb/members'), apiRequest('/islamic-finance/ssb/fatwas')]);
      setMembers(toArray(m)); setFatwas(toArray(f));
    } catch {} setLoading(false);
  };
  if (loading) return <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>;
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Члены Шариатского совета (SSB)</h3>
        {members.map((m: any, i: number) => (
          <div key={i} style={{ padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}` }}>
            <div style={{ fontWeight: typography.fontWeight.semibold }}>{m.full_name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{m.qualifications} &middot; {m.is_active ? 'Active' : 'Inactive'}</div>
          </div>
        ))}
        {members.length === 0 && <div style={{ color: semantic.textSecondary }}>Нет данных</div>}
      </div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Фатвы</h3>
        {fatwas.map((f: any, i: number) => (
          <div key={i} style={{ padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}` }}>
            <div style={{ fontWeight: typography.fontWeight.semibold }}>{f.subject}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{f.product_type} &middot; {f.decision}</div>
            {f.reasoning && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>{f.reasoning}</div>}
          </div>
        ))}
        {fatwas.length === 0 && <div style={{ color: semantic.textSecondary }}>Нет фатв</div>}
      </div>
    </div>
  );
}

/* ======= TAB 7: Glossary ======= */
function GlossaryTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await apiRequest('/islamic-finance/glossary'); setData(toArray(r)); } catch {} setLoading(false); };
  if (loading) return <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>;
  const filtered = search ? data.filter((r: any) => [r.term_arabic, r.transliteration, r.term_ru, r.term_uz].some(v => v?.toLowerCase().includes(search.toLowerCase()))) : data;
  return (
    <div>
      <div style={{ marginBottom: spacing[4] }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск термина..." style={inputStyle} />
      </div>
      {filtered.map((r: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div>
            <span style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>{r.term_arabic}</span>
            <span style={{ marginLeft: spacing[2], color: colors.primary[600] }}>{r.transliteration}</span>
          </div>
          {r.term_ru && <div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>{r.term_ru}</div>}
          {r.definition && <div style={{ marginTop: spacing[1], fontSize: typography.fontSize.sm }}>{r.definition}</div>}
        </div>
      ))}
      {filtered.length === 0 && <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Глоссарий пуст</div>}
    </div>
  );
}


/* ======= TAB 8: P2P Islamic ======= */
function P2PTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', target_amount: '', product_type: 'mudaraba', profit_sharing_ratio: '' });
  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await apiRequest('/islamic-finance/p2p'); setData(toArray(r)); } catch {} setLoading(false); };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const create = async () => {
    try {
      await apiRequest('/islamic-finance/p2p', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          target_amount: parseFloat(form.target_amount) || 0,
          product_type: form.product_type,
          profit_sharing_ratio: form.profit_sharing_ratio || '60:40',
        }),
      });
      load();
    } catch {}
  };
  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Создать P2P проект</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div>
            <label style={labelStyle}>Название</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Целевая сумма</label>
            <input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Тип</label>
            <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
              <option value="mudaraba">Мудараба</option><option value="musharaka">Мушарака</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Пропорция прибыли</label>
            <input value={form.profit_sharing_ratio} onChange={e => set('profit_sharing_ratio', e.target.value)} placeholder="60:40" style={inputStyle} />
          </div>
        </div>
        <button onClick={create} style={{ ...btnPrimary, marginTop: spacing[4] }}>Создать проект</button>
      </div>
      {loading ? <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>
      : data.map((p: any) => (
        <div key={p.id} style={cardStyle}>
          <div><strong>{p.title}</strong> &nbsp; <span style={{ color: colors.primary[600] }}>{p.status}</span></div>
          <div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm, marginTop: spacing[1] }}>
            {Number(p.collected_amount).toLocaleString()} / {Number(p.target_amount).toLocaleString()} | {p.product_type} | {p.profit_sharing_ratio}
          </div>
        </div>
      )) }
    </div>
  );
}

/* ======= TAB 9: Reference ======= */
function ReferenceTab() {
  const [haramList, setHaramList] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [h, t, i] = await Promise.all([
        apiRequest('/islamic-finance/haram-industries'),
        apiRequest('/islamic-finance/financial-thresholds'),
        apiRequest('/islamic-finance/shariah-indices'),
      ]);
      setHaramList(toArray(h));
      setThresholds(toArray(t));
      setIndices(toArray(i));
    } catch {}
    setLoading(false);
  };
  if (loading) return <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Загрузка...</div>;
  return (
    <div>
      <h3 style={sectionTitle}>Запрещённые отрасли (Харам)</h3>
      {haramList.map((item: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div>🚭 <strong>{item.name_ru}</strong> &nbsp; <span style={{ color: semantic.textSecondary }}>({item.name_uz})</span></div>
          {item.reason && <div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm, marginTop: spacing[1] }}>{item.reason}</div>}
        </div>
      ))}
      {haramList.length === 0 && <div style={{ padding: spacing[4], color: semantic.textSecondary }}>Нет данных</div>}

      <h3 style={{ ...sectionTitle, marginTop: spacing[6] }}>Финансовые пороги AAOIFI</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${semantic.border}` }}>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>Критерий</th>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>Максимум</th>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>Стандарт</th>
          </tr>
        </thead>
        <tbody>
          {thresholds.map((t: any, i: number) => (
            <tr key={i} style={{ borderBottom: `1px solid ${semantic.border}` }}>
              <td style={{ padding: spacing[2] }}>{t.name_ru}</td>
              <td style={{ padding: spacing[2] }}>{t.max_percentage}</td>
              <td style={{ padding: spacing[2] }}>{t.standard}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ ...sectionTitle, marginTop: spacing[6] }}>Шариатские индексы</h3>
      {indices.map((item: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>{item.name}</div>
          <div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>{item.provider} · {item.description}</div>
        </div>
      ))}
    </div>
  );
}

/* ======= Helper Components ======= */
function StatusBadge({ status }: { status: string }) {
  const s = complianceColors[status] || complianceColors.not_screened;
  return <span style={{ padding: '4px 12px', borderRadius: radius.lg, backgroundColor: s.bg, color: s.text, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>{s.label}</span>;
}
