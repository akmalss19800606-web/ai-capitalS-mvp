'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, componentStyles,
} from '@/lib/design-tokens';
import { useLocale } from '@/lib/i18n';
const toArray = (r: any): any[] => Array.isArray(r) ? r : (r?.data && Array.isArray(r.data) ? r.data : []);
/* Types */
interface ScreeningResult { success: boolean; data: unknown; }
type TabId = 'screening' | 'zakat' | 'reference' | 'products' | 'purification' | 'posc' | 'ssb' | 'glossary' | 'p2p';
const complianceColors: Record<string, { bg: string; text: string; label: string }> = {
  compliant:    { bg: colors.success[50], text: colors.success[700], label: '\u0425\u0430\u043b\u044f\u043b\u044c' },
  non_compliant:{ bg: colors.error[50],   text: colors.error[700],   label: '\u0425\u0430\u0440\u0430\u043c' },
  doubtful:     { bg: colors.warning[50], text: colors.warning[700], label: '\u0421\u043e\u043c\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0439' },
  not_screened: { bg: colors.neutral[100], text: colors.neutral[600], label: '\u041d\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u0435\u043d\u043e' },
};
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
const btnSecondary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: radius.lg, backgroundColor: colors.neutral[100],
  color: semantic.textPrimary, border: `1px solid ${semantic.border}`, fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.medium, cursor: 'pointer',
};
const sectionTitle: React.CSSProperties = {
  fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold,
  color: semantic.textPrimary, marginBottom: spacing[4],
};
const STANDARDS = ['ALL','AAOIFI','DJIM','SP','FTSE','MSCI'];
/* Main Component */
export default function IslamicFinancePage() {
  const router = useRouter();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('screening');
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'screening', label: '\u0428\u0430\u0440\u0438\u0430\u0442-\u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433', icon: '\ud83d\udee1\ufe0f' },
    { id: 'zakat', label: '\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440 \u0437\u0430\u043a\u044f\u0442\u0430', icon: '\ud83e\uddee' },
    { id: 'products', label: '\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b', icon: '\ud83d\udce6' },
    { id: 'purification', label: '\u041e\u0447\u0438\u0441\u0442\u043a\u0430 \u0434\u043e\u0445\u043e\u0434\u0430', icon: '\ud83e\uddf9' },
    { id: 'posc', label: 'PoSC', icon: '\ud83d\udccb' },
    { id: 'ssb', label: 'SSB / \u0424\u0430\u0442\u0432\u044b', icon: '\u2696\ufe0f' },
    { id: 'glossary', label: '\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439', icon: '\ud83d\udcd6' },
    { id: 'p2p', label: 'P2P \u0418\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0435', icon: '\ud83e\udd1d' },
    { id: 'reference', label: '\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u0438\u043a\u0438', icon: '\ud83d\udcda' },
  ];
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: spacing[6] }}>
    <div style={{ marginBottom: spacing[6], textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: spacing[3] }}>\u262a</div>
      <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[2] }}>\u0418\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u044b</h1>
      <p style={{ color: semantic.textSecondary, fontSize: typography.fontSize.md }}>\u0428\u0430\u0440\u0438\u0430\u0442-\u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433, \u0437\u0430\u043a\u044f\u0442, \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u044b, \u043e\u0447\u0438\u0441\u0442\u043a\u0430 \u00b7 AAOIFI / DJIM / S&P Shariah</p>
    </div>
    <div style={{ display: 'flex', borderBottom: `1px solid ${semantic.border}`, marginBottom: spacing[6], overflowX: 'auto', gap: spacing[1] }}>
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
/* ======= TAB 1: Enhanced Screening ======= */
function ScreeningTab() {
  const [mode, setMode] = useState<'industry' | 'financial' | 'full'>('full');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [ticker, setTicker] = useState('');
  const [standard, setStandard] = useState('ALL');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [haramRevenue, setHaramRevenue] = useState('');
  const [marketCap, setMarketCap] = useState('');
  const [interestBearingSec, setInterestBearingSec] = useState('');
  const [cashAndInterest, setCashAndInterest] = useState('');
  const [receivables, setReceivables] = useState('');
  useEffect(() => { loadHistory(); }, []);
  const loadHistory = async () => {
    try { const r = await apiRequest('/islamic-finance/screening'); setHistory(toArray(r)); } catch {}
  };
  const handleScreening = async () => {
    if (!companyName) return;
    setLoading(true); setResult(null);
    try {
      const body: any = { company_name: companyName, ticker: ticker || undefined, standard, industry, description };
      if (mode !== 'industry') {
        body.total_assets = parseFloat(totalAssets) || 0;
        body.total_debt = parseFloat(totalDebt) || 0;
        body.total_revenue = parseFloat(totalRevenue) || 0;
        body.haram_revenue = parseFloat(haramRevenue) || 0;
        body.market_cap = parseFloat(marketCap) || 0;
        body.interest_bearing_securities = parseFloat(interestBearingSec) || 0;
        body.cash_and_interest = parseFloat(cashAndInterest) || 0;
        body.receivables = parseFloat(receivables) || 0;
      }
      const res = await apiRequest('/islamic-finance/screening', { method: 'POST', body: JSON.stringify(body) });
      setResult(res); loadHistory();
    } catch { setResult({ error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0435' }); }
    finally { setLoading(false); }
  };
  return (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
      <h3 style={sectionTitle}>\u0422\u0438\u043f \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430</h3>
      <button onClick={() => setShowHistory(!showHistory)} style={btnSecondary}>{showHistory ? '\u0421\u043a\u0440\u044b\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e' : `\u0418\u0441\u0442\u043e\u0440\u0438\u044f (${history.length})`}</button>
    </div>
    <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[5] }}>
    {[
      { id: 'full' as const, label: '\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0441\u043d\u044b\u0439', desc: '\u041e\u0442\u0440\u0430\u0441\u043b\u044c + \u0444\u0438\u043d\u0430\u043d\u0441\u044b' },
      { id: 'industry' as const, label: '\u041e\u0442\u0440\u0430\u0441\u043b\u0435\u0432\u043e\u0439', desc: '\u0422\u043e\u043b\u044c\u043a\u043e \u0445\u0430\u0440\u0430\u043c-\u0438\u043d\u0434\u0443\u0441\u0442\u0440\u0438\u0438' },
      { id: 'financial' as const, label: '\u0424\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0439', desc: '\u041f\u043e\u0440\u043e\u0433\u0438 AAOIFI' },
    ].map(m => (
      <div key={m.id} onClick={() => { setMode(m.id); setResult(null); }} style={{
        flex: '1 1 180px', padding: spacing[4], borderRadius: radius.xl,
        border: mode === m.id ? `2px solid ${colors.primary[500]}` : `1px solid ${semantic.border}`,
        backgroundColor: mode === m.id ? colors.primary[50] : semantic.bgCard,
        cursor: 'pointer', textAlign: 'left',
      }}>
      <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{m.label}</div>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{m.desc}</div>
      </div>
    ))}
    </div>
    <h3 style={sectionTitle}>\u0414\u0430\u043d\u043d\u044b\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438</h3>
    <div style={cardStyle}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={labelStyle}>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 *</label>
        <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Uzpromstroybank" style={inputStyle} />
      </div>
      <div><label style={labelStyle}>Ticker</label><input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="UZPS" style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442</label>
        <select value={standard} onChange={e => setStandard(e.target.value)} style={inputStyle}>
          {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {(mode === 'full' || mode === 'industry') && <>
      <div><label style={labelStyle}>\u041e\u0442\u0440\u0430\u0441\u043b\u044c</label><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Banking" style={inputStyle} /></div>
      <div><label style={labelStyle}>\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435" style={inputStyle} /></div>
      </>}
      {(mode === 'full' || mode === 'financial') && <>
      <div><label style={labelStyle}>\u041e\u0431\u0449\u0438\u0435 \u0430\u043a\u0442\u0438\u0432\u044b (USD)</label><input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u041e\u0431\u0449\u0438\u0439 \u0434\u043e\u043b\u0433 (USD)</label><input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u041e\u0431\u0449\u0438\u0439 \u0434\u043e\u0445\u043e\u0434 (USD)</label><input type="number" value={totalRevenue} onChange={e => setTotalRevenue(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0425\u0430\u0440\u0430\u043c \u0434\u043e\u0445\u043e\u0434 (USD)</label><input type="number" value={haramRevenue} onChange={e => setHaramRevenue(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0420\u044b\u043d. \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f (USD)</label><input type="number" value={marketCap} onChange={e => setMarketCap(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>%-\u043d\u044b\u0435 \u0446\u0435\u043d\u043d\u044b\u0435 \u0431\u0443\u043c\u0430\u0433\u0438</label><input type="number" value={interestBearingSec} onChange={e => setInterestBearingSec(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0414\u0435\u043d\u044c\u0433\u0438 + % \u0434\u0435\u043f\u043e\u0437\u0438\u0442\u044b</label><input type="number" value={cashAndInterest} onChange={e => setCashAndInterest(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0414\u0435\u0431\u0438\u0442\u043e\u0440\u043a\u0430</label><input type="number" value={receivables} onChange={e => setReceivables(e.target.value)} style={inputStyle} /></div>
      </>}
    </div>
    <button onClick={handleScreening} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4], opacity: loading ? 0.6 : 1 }}>
      {loading ? '\u0410\u043d\u0430\u043b\u0438\u0437...' : '\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433'}
    </button>
    </div>
    {result && !result.error && (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
        <StatusBadge status={result.is_compliant ? 'compliant' : 'non_compliant'} />
        {result.standard && <span style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>Standard: {result.standard}</span>}
      </div>
      {result.standards?.flatMap((s: any) => s.ratios || []).length > 0 && (
      <div style={{ marginTop: spacing[4] }}>
        <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>\u0424\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0435 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438 (AAOIFI)</h4>
        {result.standards?.flatMap((s: any) => s.ratios || []).map((c: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderBottom: `1px solid ${semantic.border}` }}>
          <span>{c.passed ? '\u2705' : '\u274c'}</span>
          <div><div style={{ fontWeight: typography.fontWeight.semibold }}>{c.ratio_name}</div><div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{`${c.value}% / ${c.threshold}%`}</div></div>
        </div>
        ))}
      </div>
      )}
      {result.recommendations?.length > 0 && (
      <div style={{ marginTop: spacing[4] }}>
        <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438</h4>
        {result.recommendations.map((r: string, i: number) => <div key={i} style={{ padding: spacing[2], color: semantic.textSecondary }}>\u2022 {r}</div>)}
      </div>
      )}
    </div>
    )}
    {result?.error && <div style={{ ...cardStyle, color: colors.error[600] }}>{result.error}</div>}
    {/* Screening History */}
    {showHistory && history.length > 0 && (
    <div style={{ marginTop: spacing[4] }}>
      <h3 style={sectionTitle}>\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u043e\u0432</h3>
      {history.map((h: any) => (
      <div key={h.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>{h.company_name}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{h.industry} | {h.standard} | {new Date(h.created_at).toLocaleDateString()}</div>
        </div>
        <StatusBadge status={h.is_compliant ? 'compliant' : h.is_compliant === false ? 'non_compliant' : 'not_screened'} />
      </div>
      ))}
    </div>
    )}
  </div>
  );
}
/* ======= TAB 2: Zakat Calculator with History ======= */
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
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => { fetchNisab(currency); loadHistory(); }, [currency]);
  const fetchNisab = async (c: string) => {
    try { const r = await apiRequest(`/islamic-finance/zakat/nisab?currency=${c}`); setNisab(r.data); } catch {}
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
      const r = await apiRequest('/islamic-finance/zakat/calculate', {
        method: 'POST', body: JSON.stringify({
          assets, liabilities: Object.keys(liabilities).length ? liabilities : null,
          currency, gold_grams: parseFloat(goldGrams) || 0, silver_grams: parseFloat(silverGrams) || 0,
        }),
      });
      setResult(r); loadHistory();
    } catch { setResult({ error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0440\u0430\u0441\u0447\u0451\u0442\u0430' }); }
    finally { setLoading(false); }
  };
  return (
  <div>
    {nisab && (
    <div style={{ ...cardStyle, display: 'flex', gap: spacing[6], justifyContent: 'center' }}>
      <div><div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>\u041d\u0438\u0441\u0430\u0431 (\u0437\u043e\u043b\u043e\u0442\u043e 85\u0433)</div><div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>{nisab.nisab_gold?.display}</div></div>
      <div><div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>\u041d\u0438\u0441\u0430\u0431 (\u0441\u0435\u0440\u0435\u0431\u0440\u043e 595\u0433)</div><div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>{nisab.nisab_silver?.display}</div></div>
    </div>
    )}
    <div style={cardStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={sectionTitle}>\u0420\u0430\u0441\u0447\u0451\u0442 \u0437\u0430\u043a\u044f\u0442\u0430</h3>
      <button onClick={() => setShowHistory(!showHistory)} style={btnSecondary}>{showHistory ? '\u0421\u043a\u0440\u044b\u0442\u044c' : `\u0418\u0441\u0442\u043e\u0440\u0438\u044f (${history.length})`}</button>
    </div>
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
    <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>\u0410\u043a\u0442\u0438\u0432\u044b</h4>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041d\u0430\u043b\u0438\u0447\u043d\u044b\u0435 ({currency})</label><input type="number" value={cash} onChange={e => setCash(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0418\u043d\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u0438 ({currency})</label><input type="number" value={investments} onChange={e => setInvestments(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0422\u043e\u0432\u0430\u0440\u043d\u044b\u0435 \u0437\u0430\u043f\u0430\u0441\u044b ({currency})</label><input type="number" value={businessInv} onChange={e => setBusinessInv(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0417\u043e\u043b\u043e\u0442\u043e (\u0433\u0440\u0430\u043c\u043c\u044b)</label><input type="number" value={goldGrams} onChange={e => setGoldGrams(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0421\u0435\u0440\u0435\u0431\u0440\u043e (\u0433\u0440\u0430\u043c\u043c\u044b)</label><input type="number" value={silverGrams} onChange={e => setSilverGrams(e.target.value)} style={inputStyle} /></div>
    </div>
    <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md, marginTop: spacing[4] }}>\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430</h4>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041a\u0440\u0435\u0434\u0438\u0442\u044b ({currency})</label><input type="number" value={loans} onChange={e => setLoans(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u041f\u0440\u043e\u0447\u0438\u0435 \u0434\u043e\u043b\u0433\u0438 ({currency})</label><input type="number" value={debts} onChange={e => setDebts(e.target.value)} style={inputStyle} /></div>
    </div>
    <button onClick={calculate} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4], opacity: loading ? 0.6 : 1 }}>
      {loading ? '\u0420\u0430\u0441\u0447\u0451\u0442...' : '\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044c \u0437\u0430\u043a\u044f\u0442'}
    </button>
    </div>
    {result && !result.error && (
    <div style={{ ...cardStyle, textAlign: 'center', marginTop: spacing[4] }}>
      <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: result.zakat_amount > 0 ? colors.success[600] : semantic.textSecondary }}>
        {`${result.zakat_amount?.toLocaleString()} ${result.currency || ''}`}
      </div>
      <div style={{ color: semantic.textSecondary, marginTop: spacing[2] }}>
        {result.zakat_amount > 0 ? '\u0417\u0430\u043a\u044f\u0442 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d' : '\u041d\u0438\u0436\u0435 \u043d\u0438\u0441\u0430\u0431\u0430'}
      </div>
    </div>
    )}
    {result?.error && <div style={{ ...cardStyle, color: colors.error[600] }}>{result.error}</div>}
    {showHistory && history.length > 0 && (
    <div style={{ marginTop: spacing[4] }}>
      <h3 style={sectionTitle}>\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u043e\u0432</h3>
      {history.map((h: any) => (
      <div key={h.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between' }}>
        <span>{h.currency} | {new Date(h.created_at).toLocaleDateString()}</span>
        <span style={{ fontWeight: typography.fontWeight.bold, color: colors.success[600] }}>{h.zakat_amount?.toLocaleString()}</span>
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
  const load = async () => {
    try { const r = await apiRequest('/islamic-finance/products'); setData(toArray(r)); } catch {}
    setLoading(false);
  };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const onSubmit = async () => {
    try {
      await apiRequest('/islamic-finance/products', {
        method: 'POST', body: JSON.stringify({
          product_type: form.product_type, title: form.title,
          params: { amount: parseFloat(form.amount) || 0, rate: parseFloat(form.rate) || 0.05, periods: parseInt(form.periods) || 12 },
        }),
      });
      load();
    } catch {}
  };
  return (
  <div>
    <div style={cardStyle}>
    <h3 style={sectionTitle}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0434\u0443\u043a\u0442</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</label><input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0422\u0438\u043f</label>
        <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
          <option value="murabaha">\u041c\u0443\u0440\u0430\u0431\u0430\u0445\u0430</option><option value="ijara">\u0418\u0434\u0436\u0430\u0440\u0430</option>
          <option value="musharaka">\u041c\u0443\u0448\u0430\u0440\u0430\u043a\u0430</option><option value="mudaraba">\u041c\u0443\u0434\u0430\u0440\u0430\u0431\u0430</option>
          <option value="sukuk">\u0421\u0443\u043a\u0443\u043a</option><option value="takaful">\u0422\u0430\u043a\u0430\u0444\u0443\u043b</option>
        </select>
      </div>
      <div><label style={labelStyle}>\u0421\u0443\u043c\u043c\u0430</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0421\u0442\u0430\u0432\u043a\u0430</label><input type="number" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.05" style={inputStyle} /></div>
      <div><label style={labelStyle}>\u041f\u0435\u0440\u0438\u043e\u0434\u044b</label><input type="number" value={form.periods} onChange={e => set('periods', e.target.value)} placeholder="12" style={inputStyle} /></div>
    </div>
    <button onClick={onSubmit} style={{ ...btnPrimary, marginTop: spacing[4] }}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c</button>
    </div>
    {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div> :
    data.length === 0 ? <div style={{ ...cardStyle, textAlign: 'center', color: semantic.textSecondary }}>\u041d\u0435\u0442 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432</div> :
    data.map((p: any) => (
    <div key={p.id} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: typography.fontWeight.semibold }}>{p.title || p.product_type}</span>
        <span style={{ fontSize: typography.fontSize.xs, padding: `${spacing[1]} ${spacing[2]}`, borderRadius: radius.lg, backgroundColor: colors.primary[50], color: colors.primary[700] }}>{p.product_type}</span>
      </div>
      {p.params && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[2] }}>\u0421\u0443\u043c\u043c\u0430: {p.params.amount?.toLocaleString()} | \u0421\u0442\u0430\u0432\u043a\u0430: {p.params.rate} | \u041f\u0435\u0440\u0438\u043e\u0434\u044b: {p.params.periods}</div>}
    </div>
    ))
    }
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
  const load = async () => {
    try { const r = await apiRequest('/islamic-finance/purification'); setData(toArray(r)); } catch {}
    setLoading(false);
  };
  const calculate = async () => {
    try {
      const r = await apiRequest('/islamic-finance/purification/calculate', {
        method: 'POST', body: JSON.stringify({ total_income: parseFloat(totalIncome) || 0, haram_percentage: parseFloat(haramPct) || 0 }),
      });
      setResult(r); load();
    } catch {}
  };
  return (
  <div>
    <div style={cardStyle}>
    <h3 style={sectionTitle}>\u0420\u0430\u0441\u0447\u0451\u0442 \u043e\u0447\u0438\u0441\u0442\u043a\u0438 \u0434\u043e\u0445\u043e\u0434\u0430</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041e\u0431\u0449\u0438\u0439 \u0434\u043e\u0445\u043e\u0434</label><input type="number" value={totalIncome} onChange={e => setTotalIncome(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0414\u043e\u043b\u044f \u0445\u0430\u0440\u0430\u043c (%)</label><input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="5" style={inputStyle} /></div>
    </div>
    <button onClick={calculate} style={{ ...btnPrimary, marginTop: spacing[4] }}>\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044c</button>
    {result && <div style={{ marginTop: spacing[4], padding: spacing[4], backgroundColor: colors.warning[50], borderRadius: radius.lg }}>
      <div style={{ fontWeight: typography.fontWeight.bold }}>\u0421\u0443\u043c\u043c\u0430 \u043a \u043e\u0447\u0438\u0441\u0442\u043a\u0435: {result.purification_amount_display || result.purification_amount}</div>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[2] }}>\u041d\u0430\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0430 \u0431\u043b\u0430\u0433\u043e\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c (sadaqah)</div>
    </div>}
    </div>
    {data.length > 0 && <h3 style={sectionTitle}>\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0447\u0438\u0441\u0442\u043e\u043a</h3>}
    {data.map((r: any) => (
    <div key={r.id} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>\u0414\u043e\u0445\u043e\u0434: {r.total_income?.toLocaleString()}</span>
        <span style={{ color: colors.warning[600] }}>\u041e\u0447\u0438\u0441\u0442\u043a\u0430: {r.purification_amount?.toLocaleString()}</span>
      </div>
    </div>
    ))}
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
  const load = async () => {
    try { const r = await apiRequest('/islamic-finance/posc'); setData(toArray(r)); } catch {}
    setLoading(false);
  };
  const generate = async () => {
    try {
      await apiRequest('/islamic-finance/posc', {
        method: 'POST', body: JSON.stringify({ target_name: targetName, target_type: targetType }),
      });
      load();
    } catch {}
  };
  return (
  <div>
    <div style={cardStyle}>
    <h3 style={sectionTitle}>\u0421\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c PoSC</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043e\u0431\u044a\u0435\u043a\u0442\u0430</label><input value={targetName} onChange={e => setTargetName(e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0422\u0438\u043f</label>
        <select value={targetType} onChange={e => setTargetType(e.target.value)} style={inputStyle}>
          <option value="product">\u041f\u0440\u043e\u0434\u0443\u043a\u0442</option><option value="portfolio">\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c</option><option value="company">\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f</option>
        </select>
      </div>
    </div>
    <button onClick={generate} style={{ ...btnPrimary, marginTop: spacing[4] }}>\u0421\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c</button>
    </div>
    {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div> :
    data.map((r: any) => (
    <div key={r.id} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
        <span style={{ fontWeight: typography.fontWeight.semibold }}>{r.target_name}</span>
        <StatusBadge status={r.compliance_status || 'not_screened'} />
      </div>
      {r.report_json && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
        \u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442: {r.report_json.standard} | \u0421\u043a\u043e\u0440: {r.report_json.score}
      </div>}
    </div>
    ))
    }
  </div>
  );
}
/* ======= TAB 6: SSB / Fatwas (enhanced) ======= */
function SSBTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [fatwas, setFatwas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatwaForm, setFatwaForm] = useState({ title: '', topic: '', summary: '' });
  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [m, f] = await Promise.all([
        apiRequest('/islamic-finance/ssb/members'),
        apiRequest('/islamic-finance/ssb/fatwas'),
      ]);
      setMembers(toArray(m)); setFatwas(toArray(f));
    } catch {}
    setLoading(false);
  };
  const createFatwa = async () => {
    try {
      await apiRequest('/islamic-finance/ssb/fatwas', {
        method: 'POST', body: JSON.stringify(fatwaForm),
      });
      setFatwaForm({ title: '', topic: '', summary: '' }); load();
    } catch {}
  };
  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>;
  return (
  <div>
    <h3 style={sectionTitle}>\u0427\u043b\u0435\u043d\u044b \u0428\u0430\u0440\u0438\u0430\u0442\u0441\u043a\u043e\u0433\u043e \u0441\u043e\u0432\u0435\u0442\u0430 (SSB)</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3], marginBottom: spacing[6] }}>
    {members.map((m: any) => (
      <div key={m.id} style={cardStyle}>
        <div style={{ fontWeight: typography.fontWeight.semibold }}>{m.full_name}</div>
        <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{m.title} \u00b7 {m.specialization}</div>
      </div>
    ))}
    {members.length === 0 && <div style={{ color: semantic.textSecondary }}>\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</div>}
    </div>
    <div style={cardStyle}>
      <h3 style={sectionTitle}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0444\u0430\u0442\u0432\u0443</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
        <div><label style={labelStyle}>\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a</label><input value={fatwaForm.title} onChange={e => setFatwaForm({...fatwaForm, title: e.target.value})} style={inputStyle} /></div>
        <div><label style={labelStyle}>\u0422\u0435\u043c\u0430</label><input value={fatwaForm.topic} onChange={e => setFatwaForm({...fatwaForm, topic: e.target.value})} style={inputStyle} /></div>
        <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</label><input value={fatwaForm.summary} onChange={e => setFatwaForm({...fatwaForm, summary: e.target.value})} style={inputStyle} /></div>
      </div>
      <button onClick={createFatwa} style={{ ...btnPrimary, marginTop: spacing[4] }}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c</button>
    </div>
    <h3 style={sectionTitle}>\u0424\u0430\u0442\u0432\u044b</h3>
    {fatwas.map((f: any) => (
    <div key={f.id} style={cardStyle}>
      <div style={{ fontWeight: typography.fontWeight.semibold }}>{f.title}</div>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>{f.topic} \u00b7 {f.status}</div>
      {f.summary && <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>{f.summary}</div>}
    </div>
    ))}
    {fatwas.length === 0 && <div style={{ ...cardStyle, color: semantic.textSecondary }}>\u041d\u0435\u0442 \u0444\u0430\u0442\u0432</div>}
  </div>
  );
}
/* ======= TAB 7: Glossary ======= */
function GlossaryTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await apiRequest('/islamic-finance/glossary'); setData(toArray(r)); } catch {}
    setLoading(false);
  };
  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>;
  return (
  <div>
    <h3 style={sectionTitle}>\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439 \u0438\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0445 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
    {data.map((r: any) => (
      <div key={r.id} style={cardStyle}>
        <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>
          {r.term_arabic} <span style={{ color: semantic.textSecondary, fontWeight: typography.fontWeight.medium }}>{r.transliteration}</span>
        </div>
        {r.term_ru && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{r.term_ru}</div>}
        {r.definition && <div style={{ fontSize: typography.fontSize.xs, color: semantic.textSecondary, marginTop: spacing[1] }}>{r.definition}</div>}
      </div>
    ))}
    </div>
    {data.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: semantic.textSecondary }}>\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439 \u043f\u0443\u0441\u0442</div>}
  </div>
  );
}
/* ======= TAB 8: P2P Islamic ======= */
function P2PTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', target_amount: '', product_type: 'mudaraba', profit_sharing_ratio: '' });
  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await apiRequest('/islamic-finance/p2p'); setData(toArray(r)); } catch {}
    setLoading(false);
  };
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const create = async () => {
    try {
      await apiRequest('/islamic-finance/p2p', {
        method: 'POST', body: JSON.stringify({
          title: form.title, target_amount: parseFloat(form.target_amount) || 0,
          product_type: form.product_type, profit_sharing_ratio: form.profit_sharing_ratio || '60:40',
        }),
      });
      load();
    } catch {}
  };
  return (
  <div>
    <div style={cardStyle}>
    <h3 style={sectionTitle}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c P2P \u043f\u0440\u043e\u0435\u043a\u0442</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
      <div><label style={labelStyle}>\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</label><input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0426\u0435\u043b\u0435\u0432\u0430\u044f \u0441\u0443\u043c\u043c\u0430</label><input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} style={inputStyle} /></div>
      <div><label style={labelStyle}>\u0422\u0438\u043f</label>
        <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
          <option value="mudaraba">\u041c\u0443\u0434\u0430\u0440\u0430\u0431\u0430</option><option value="musharaka">\u041c\u0443\u0448\u0430\u0440\u0430\u043a\u0430</option>
        </select>
      </div>
      <div><label style={labelStyle}>\u041f\u0440\u043e\u043f\u043e\u0440\u0446\u0438\u044f \u043f\u0440\u0438\u0431\u044b\u043b\u0438</label><input value={form.profit_sharing_ratio} onChange={e => set('profit_sharing_ratio', e.target.value)} placeholder="60:40" style={inputStyle} /></div>
    </div>
    <button onClick={create} style={{ ...btnPrimary, marginTop: spacing[4] }}>\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0435\u043a\u0442</button>
    </div>
    {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div> :
    data.map((p: any) => (
    <div key={p.id} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: typography.fontWeight.semibold }}>{p.title}</span>
        <span style={{ fontSize: typography.fontSize.xs, padding: `${spacing[1]} ${spacing[2]}`, borderRadius: radius.lg,
          backgroundColor: p.status === 'active' ? colors.success[50] : colors.neutral[100],
          color: p.status === 'active' ? colors.success[700] : semantic.textSecondary }}>{p.status}</span>
      </div>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>
        {Number(p.collected_amount).toLocaleString()} / {Number(p.target_amount).toLocaleString()} | {p.product_type} | {p.profit_sharing_ratio}
      </div>
    </div>
    ))
    }
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
      setHaramList(toArray(h)); setThresholds(toArray(t)); setIndices(toArray(i));
    } catch {}
    setLoading(false);
  };
  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>;
  return (
  <div>
    <h3 style={sectionTitle}>\u0417\u0430\u043f\u0440\u0435\u0449\u0451\u043d\u043d\u044b\u0435 \u043e\u0442\u0440\u0430\u0441\u043b\u0438 (\u0425\u0430\u0440\u0430\u043c)</h3>
    <div style={cardStyle}>
    {haramList.map((item: any, i: number) => (
      <div key={i} style={{ padding: spacing[2], borderBottom: i < haramList.length - 1 ? `1px solid ${semantic.border}` : 'none' }}>
        <span>\ud83d\udeab {item.name_ru}</span> <span style={{ color: semantic.textSecondary }}>({item.name_en})</span>
        {item.description && <div style={{ fontSize: typography.fontSize.xs, color: semantic.textSecondary }}>{item.description}</div>}
      </div>
    ))}
    {haramList.length === 0 && <div style={{ color: semantic.textSecondary }}>\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</div>}
    </div>
    <h3 style={sectionTitle}>\u0424\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0435 \u043f\u043e\u0440\u043e\u0433\u0438 AAOIFI</h3>
    <div style={cardStyle}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ borderBottom: `2px solid ${semantic.border}` }}>
        <th style={{ textAlign: 'left', padding: spacing[2] }}>\u041a\u0440\u0438\u0442\u0435\u0440\u0438\u0439</th>
        <th style={{ textAlign: 'left', padding: spacing[2] }}>\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c</th>
        <th style={{ textAlign: 'left', padding: spacing[2] }}>\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442</th>
      </tr></thead>
      <tbody>{thresholds.map((t: any, i: number) => (
        <tr key={i} style={{ borderBottom: `1px solid ${semantic.border}` }}>
          <td style={{ padding: spacing[2] }}>{t.name_ru}</td>
          <td style={{ padding: spacing[2] }}>{t.max_percentage}</td>
          <td style={{ padding: spacing[2] }}>{t.standard}</td>
        </tr>
      ))}</tbody>
    </table>
    </div>
    <h3 style={sectionTitle}>\u0428\u0430\u0440\u0438\u0430\u0442\u0441\u043a\u0438\u0435 \u0438\u043d\u0434\u0435\u043a\u0441\u044b</h3>
    {indices.map((item: any, i: number) => (
    <div key={i} style={cardStyle}>
      <div style={{ fontWeight: typography.fontWeight.semibold }}>{item.name}</div>
      <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{item.provider} \u00b7 {item.description}</div>
    </div>
    ))}
  </div>
  );
}
/* ======= Helper Components ======= */
function StatusBadge({ status }: { status: string }) {
  const s = complianceColors[status] || complianceColors.not_screened;
  return <span style={{ display: 'inline-block', padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.lg, backgroundColor: s.bg, color: s.text, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold }}>{s.label}</span>;
}
