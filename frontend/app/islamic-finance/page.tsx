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

/* в”Ђв”Ђв”Ђ Types в”Ђв”Ђв”Ђ */
interface ScreeningResult { success: boolean; data: unknown; }

type TabId = 'screening' | 'zakat' | 'reference' | 'products' | 'purification' | 'posc' | 'ssb' | 'glossary' | 'p2p';

/* в”Ђв”Ђв”Ђ Status badge colors в”Ђв”Ђв”Ђ */
const complianceColors: Record<string, { bg: string; text: string; label: string }> = {
  compliant:      { bg: colors.success[50],  text: colors.success[700], label: 'РҐР°Р»СЏР»СЊ' },
  non_compliant:  { bg: colors.error[50],    text: colors.error[700],   label: 'РҐР°СЂР°Рј' },
  doubtful:       { bg: colors.warning[50],  text: colors.warning[700], label: 'РЎРѕРјРЅРёС‚РµР»СЊРЅС‹Р№' },
  not_screened:   { bg: colors.neutral[100], text: colors.neutral[600], label: 'РќРµ РїСЂРѕРІРµСЂРµРЅРѕ' },
};

/* в”Ђв”Ђв”Ђ Styles в”Ђв”Ђв”Ђ */
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

/* в”Ђв”Ђв”Ђ Main Component в”Ђв”Ђв”Ђ */
export default function IslamicFinancePage() {
  const router = useRouter();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('screening');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'screening',    label: 'РЁР°СЂРёР°С‚-СЃРєСЂРёРЅРёРЅРі',    icon: 'рџ›ЎпёЏ' },
    { id: 'zakat',        label: 'РљР°Р»СЊРєСѓР»СЏС‚РѕСЂ Р·Р°РєСЏС‚Р°',  icon: 'рџ§®' },
    { id: 'products',     label: 'РџСЂРѕРґСѓРєС‚С‹',           icon: 'рџ“¦' },
    { id: 'purification', label: 'РћС‡РёСЃС‚РєР° РґРѕС…РѕРґР°',      icon: 'рџ§№' },
    { id: 'posc',         label: 'PoSC',                icon: 'рџ“‹' },
    { id: 'ssb',          label: 'SSB / Р¤Р°С‚РІС‹',         icon: 'вљ–пёЏ' },
    { id: 'glossary',     label: 'Р“Р»РѕСЃСЃР°СЂРёР№',           icon: 'рџ“–' },
    { id: 'p2p',          label: 'P2P РСЃР»Р°РјСЃРєРёРµ',       icon: 'рџ¤ќ' },
    { id: 'reference',    label: 'РЎРїСЂР°РІРѕС‡РЅРёРєРё',         icon: 'рџ“љ' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: spacing[6] }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[6], textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: spacing[3] }}>вЄ</div>
        <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[2] }}>РСЃР»Р°РјСЃРєРёРµ С„РёРЅР°РЅСЃС‹</h1>
        <p style={{ color: semantic.textSecondary, fontSize: typography.fontSize.md }}>РЁР°СЂРёР°С‚-СЃРєСЂРёРЅРёРЅРі, Р·Р°РєСЏС‚, РїСЂРѕРґСѓРєС‚С‹, РѕС‡РёСЃС‚РєР° В· AAOIFI / DJIM / S&P Shariah</p>
      </div>

      {/* Tab navigation */}
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

      {/* Tab content */}
      {activeTab === 'screening'    && <ScreeningTab />}
      {activeTab === 'zakat'        && <ZakatTab />}
      {activeTab === 'products'     && <ProductsTab />}
      {activeTab === 'purification' && <PurificationTab />}
      {activeTab === 'posc'         && <PoSCTab />}
      {activeTab === 'ssb'          && <SSBTab />}
      {activeTab === 'glossary'     && <GlossaryTab />}
      {activeTab === 'p2p'          && <P2PTab />}
      {activeTab === 'reference'    && <ReferenceTab />}
    </div>
  );
}

/* ======= TAB 1: Screening ======= */
function ScreeningTab() {
  const [mode, setMode] = useState<'industry' | 'financial' | 'full'>('full');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [haramRevenue, setHaramRevenue] = useState('');

  const handleScreening = async () => {
    if (!companyName) return;
    setLoading(true); setResult(null);
    try {
      const endpoint = '/islamic-finance/screening';
      const body: any = {
        company_name: companyName, ticker: '', standard: 'ALL',
        total_assets: parseFloat(totalAssets) || 0,
        total_debt: parseFloat(totalDebt) || 0,
        total_revenue: parseFloat(totalRevenue) || 0,
        haram_revenue: parseFloat(haramRevenue) || 0,
        market_cap: parseFloat(totalAssets) || 0,
        interest_bearing_securities: 0, cash_and_interest: 0, receivables: 0,
      };
      const res = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setResult(res);
    } catch { setResult({ error: 'РћС€РёР±РєР° РїСЂРё СЃРєСЂРёРЅРёРЅРіРµ' }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3 style={sectionTitle}>РўРёРї СЃРєСЂРёРЅРёРЅРіР°</h3>
      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[5] }}>
        {[
          { id: 'full' as const, label: 'РљРѕРјРїР»РµРєСЃРЅС‹Р№', desc: 'РћС‚СЂР°СЃР»СЊ + С„РёРЅР°РЅСЃС‹' },
          { id: 'industry' as const, label: 'РћС‚СЂР°СЃР»РµРІРѕР№', desc: 'РўРѕР»СЊРєРѕ С…Р°СЂР°Рј-РёРЅРґСѓСЃС‚СЂРёРё' },
          { id: 'financial' as const, label: 'Р¤РёРЅР°РЅСЃРѕРІС‹Р№', desc: 'РџРѕСЂРѕРіРё AAOIFI' },
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

      <h3 style={sectionTitle}>Р”Р°РЅРЅС‹Рµ РєРѕРјРїР°РЅРёРё</h3>
      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>РќР°Р·РІР°РЅРёРµ РєРѕРјРїР°РЅРёРё *</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Uzpromstroybank" style={inputStyle} />
          </div>
          {(mode === 'full' || mode === 'industry') && <>
            <div><label style={labelStyle}>РћС‚СЂР°СЃР»СЊ</label><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Banking" style={inputStyle} /></div>
            <div><label style={labelStyle}>РћРїРёСЃР°РЅРёРµ</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="РљСЂР°С‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ" style={inputStyle} /></div>
          </>}
          {(mode === 'full' || mode === 'financial') && <>
            <div><label style={labelStyle}>РћР±С‰РёРµ Р°РєС‚РёРІС‹ (USD)</label><input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>РћР±С‰РёР№ РґРѕР»Рі (USD)</label><input type="number" value={totalDebt} onChange={e => setTotalDebt(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>РћР±С‰РёР№ РґРѕС…РѕРґ (USD)</label><input type="number" value={totalRevenue} onChange={e => setTotalRevenue(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>РҐР°СЂР°Рј РґРѕС…РѕРґ (USD)</label><input type="number" value={haramRevenue} onChange={e => setHaramRevenue(e.target.value)} style={inputStyle} /></div>
          </>}
        </div>
        <button onClick={handleScreening} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4], opacity: loading ? 0.6 : 1 }}>
          {loading ? 'РђРЅР°Р»РёР·...' : 'Р—Р°РїСѓСЃС‚РёС‚СЊ СЃРєСЂРёРЅРёРЅРі'}
        </button>
      </div>

      {result && !result.error && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Р РµР·СѓР»СЊС‚Р°С‚ СЃРєСЂРёРЅРёРЅРіР°</h3>
          {result.is_compliant ? 'compliant' : 'non_compliant' && <StatusBadge status={result.is_compliant ? 'compliant' : 'non_compliant'} />}
          {result.standards?.flatMap((s: any) => s.ratios || []) && (
            <div style={{ marginTop: spacing[4] }}>
              <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>Р¤РёРЅР°РЅСЃРѕРІС‹Рµ РїРѕРєР°Р·Р°С‚РµР»Рё (AAOIFI)</h4>
              {result.standards?.flatMap((s: any) => s.ratios || []).map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: spacing[3], borderBottom: `1px solid ${semantic.border}` }}>
                  <span>{c.passed ? 'вњ…' : 'вќЊ'}</span>
                  <div><div style={{ fontWeight: typography.fontWeight.semibold }}>{c.ratio_name}</div><div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{`${c.value}% / ${c.threshold}%`}</div></div>
                </div>
              ))}
            </div>
          )}
          {result.recommendations?.length > 0 && (
            <div style={{ marginTop: spacing[4] }}>
              <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>Р РµРєРѕРјРµРЅРґР°С†РёРё</h4>
              {result.recommendations.map((r: string, i: number) => <div key={i} style={{ padding: spacing[2], color: semantic.textSecondary }}>вЂў {r}</div>)}
            </div>
          )}
        </div>
      )}
      {result?.error && <div style={{ ...cardStyle, color: colors.error[600] }}>{result.error}</div>}
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

  useEffect(() => { fetchNisab(currency); }, [currency]);
  const fetchNisab = async (c: string) => {
    try { const r = await apiRequest(`/islamic-finance/zakat/nisab?currency=${c}`); setNisab(r.data); } catch {}
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
        method: 'POST', body: JSON.stringify({
          assets, liabilities: Object.keys(liabilities).length ? liabilities : null,
          currency, gold_grams: parseFloat(goldGrams) || 0, silver_grams: parseFloat(silverGrams) || 0,
        }),
      });
      setResult(r);
    } catch { setResult({ error: 'РћС€РёР±РєР° СЂР°СЃС‡С‘С‚Р°' }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {nisab && (
        <div style={{ ...cardStyle, display: 'flex', gap: spacing[6], justifyContent: 'center' }}>
          <div><div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>РќРёСЃР°Р± (Р·РѕР»РѕС‚Рѕ 85Рі)</div><div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>{nisab.nisab_gold?.display}</div></div>
          <div><div style={{ color: semantic.textSecondary, fontSize: typography.fontSize.sm }}>РќРёСЃР°Р± (СЃРµСЂРµР±СЂРѕ 595Рі)</div><div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg }}>{nisab.nisab_silver?.display}</div></div>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Р Р°СЃС‡С‘С‚ Р·Р°РєСЏС‚Р°</h3>
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

        <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md }}>РђРєС‚РёРІС‹</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РќР°Р»РёС‡РЅС‹Рµ ({currency})</label><input type="number" value={cash} onChange={e => setCash(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РРЅРІРµСЃС‚РёС†РёРё ({currency})</label><input type="number" value={investments} onChange={e => setInvestments(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РўРѕРІР°СЂРЅС‹Рµ Р·Р°РїР°СЃС‹ ({currency})</label><input type="number" value={businessInv} onChange={e => setBusinessInv(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Р—РѕР»РѕС‚Рѕ (РіСЂР°РјРјС‹)</label><input type="number" value={goldGrams} onChange={e => setGoldGrams(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РЎРµСЂРµР±СЂРѕ (РіСЂР°РјРјС‹)</label><input type="number" value={silverGrams} onChange={e => setSilverGrams(e.target.value)} style={inputStyle} /></div>
        </div>

        <h4 style={{ ...sectionTitle, fontSize: typography.fontSize.md, marginTop: spacing[4] }}>РћР±СЏР·Р°С‚РµР»СЊСЃС‚РІР°</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РљСЂРµРґРёС‚С‹ ({currency})</label><input type="number" value={loans} onChange={e => setLoans(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РџСЂРѕС‡РёРµ РґРѕР»РіРё ({currency})</label><input type="number" value={debts} onChange={e => setDebts(e.target.value)} style={inputStyle} /></div>
        </div>

        <button onClick={calculate} disabled={loading} style={{ ...btnPrimary, marginTop: spacing[4], opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Р Р°СЃС‡С‘С‚...' : 'Р Р°СЃСЃС‡РёС‚Р°С‚СЊ Р·Р°РєСЏС‚'}
        </button>
      </div>

      {result && !result.error && (
        <div style={{ ...cardStyle, textAlign: 'center', marginTop: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: result.zakat_amount > 0 ? colors.success[600] : semantic.textSecondary }}>
            {`${result.zakat_amount?.toLocaleString()} ${result.currency || ''}`}
          </div>
          <div style={{ color: semantic.textSecondary, marginTop: spacing[2] }}>
            {result.zakat_amount > 0 ? 'Р—Р°РєСЏС‚ РѕР±СЏР·Р°С‚РµР»РµРЅ' : 'РќРёР¶Рµ РЅРёСЃР°Р±Р° вЂ” Р·Р°РєСЏС‚ РЅРµ РѕР±СЏР·Р°С‚РµР»РµРЅ'}
          </div>
        </div>
      )}
      {result?.error && <div style={{ ...cardStyle, color: colors.error[600] }}>{result.error}</div>}
    </div>
  );
}

/* ======= TAB 3: Products (Murabaha, Ijara, etc.) ======= */
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
        <h3 style={sectionTitle}>РЎРѕР·РґР°С‚СЊ РїСЂРѕРґСѓРєС‚</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РќР°Р·РІР°РЅРёРµ</label><input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РўРёРї</label>
            <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
              <option value="murabaha">РњСѓСЂР°Р±Р°С…Р°</option><option value="ijara">РРґР¶Р°СЂР°</option>
              <option value="musharaka">РњСѓС€Р°СЂР°РєР°</option><option value="mudaraba">РњСѓРґР°СЂР°Р±Р°</option>
              <option value="sukuk">РЎСѓРєСѓРє</option><option value="takaful">РўР°РєР°С„СѓР»</option>
            </select>
          </div>
          <div><label style={labelStyle}>РЎСѓРјРјР°</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РЎС‚Р°РІРєР°</label><input type="number" value={form.rate} onChange={e => set('rate', e.target.value)} placeholder="0.05" style={inputStyle} /></div>
          <div><label style={labelStyle}>РџРµСЂРёРѕРґС‹</label><input type="number" value={form.periods} onChange={e => set('periods', e.target.value)} placeholder="12" style={inputStyle} /></div>
        </div>
        <button onClick={onSubmit} style={{ ...btnPrimary, marginTop: spacing[4] }}>РЎРѕР·РґР°С‚СЊ</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div> :
        data.length === 0 ? <div style={{ ...cardStyle, textAlign: 'center', color: semantic.textSecondary }}>РќРµС‚ РїСЂРѕРґСѓРєС‚РѕРІ</div> :
        data.map((p: any) => (
          <div key={p.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: typography.fontWeight.semibold }}>{p.title || p.product_type}</span>
              <span style={{ fontSize: typography.fontSize.xs, padding: `${spacing[1]} ${spacing[2]}`, borderRadius: radius.lg, backgroundColor: colors.primary[50], color: colors.primary[700] }}>{p.product_type}</span>
            </div>
            {p.params && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[2] }}>РЎСѓРјРјР°: {p.params.amount?.toLocaleString()} | РЎС‚Р°РІРєР°: {p.params.rate} | РџРµСЂРёРѕРґС‹: {p.params.periods}</div>}
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
      const r = await apiRequest('/islamic-finance/purification', {
        method: 'POST', body: JSON.stringify({ total_income: parseFloat(totalIncome) || 0, haram_percentage: parseFloat(haramPct) || 0 }),
      });
      setResult(r); load();
    } catch {}
  };

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Р Р°СЃС‡С‘С‚ РѕС‡РёСЃС‚РєРё РґРѕС…РѕРґР°</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РћР±С‰РёР№ РґРѕС…РѕРґ</label><input type="number" value={totalIncome} onChange={e => setTotalIncome(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Р”РѕР»СЏ С…Р°СЂР°Рј (%)</label><input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="5" style={inputStyle} /></div>
        </div>
        <button onClick={calculate} style={{ ...btnPrimary, marginTop: spacing[4] }}>Р Р°СЃСЃС‡РёС‚Р°С‚СЊ</button>
        {result && <div style={{ marginTop: spacing[4], padding: spacing[4], backgroundColor: colors.warning[50], borderRadius: radius.lg }}>
          <div style={{ fontWeight: typography.fontWeight.bold }}>РЎСѓРјРјР° Рє РѕС‡РёСЃС‚РєРµ: {result.purification_amount}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[2] }}>РќР°РїСЂР°РІРёС‚СЊ РЅР° Р±Р»Р°РіРѕС‚РІРѕСЂРёС‚РµР»СЊРЅРѕСЃС‚СЊ (sadaqah)</div>
        </div>}
      </div>

      {data.length > 0 && <h3 style={sectionTitle}>РСЃС‚РѕСЂРёСЏ РѕС‡РёСЃС‚РѕРє</h3>}
      {data.map((r: any) => (
        <div key={r.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Р”РѕС…РѕРґ: {r.total_income?.toLocaleString()}</span>
            <span style={{ color: colors.warning[600] }}>РћС‡РёСЃС‚РєР°: {r.purification_amount?.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ======= TAB 5: PoSC (Product of Shariah Compliance) ======= */
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
        <h3 style={sectionTitle}>РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ PoSC</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РќР°Р·РІР°РЅРёРµ РѕР±СЉРµРєС‚Р°</label><input value={targetName} onChange={e => setTargetName(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РўРёРї</label>
            <select value={targetType} onChange={e => setTargetType(e.target.value)} style={inputStyle}>
              <option value="product">РџСЂРѕРґСѓРєС‚</option><option value="portfolio">РџРѕСЂС‚С„РµР»СЊ</option><option value="company">РљРѕРјРїР°РЅРёСЏ</option>
            </select>
          </div>
        </div>
        <button onClick={generate} style={{ ...btnPrimary, marginTop: spacing[4] }}>РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div> :
        data.map((r: any) => (
          <div key={r.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
              <span style={{ fontWeight: typography.fontWeight.semibold }}>{r.target_name}</span>
              <StatusBadge status={r.compliance_status || 'not_screened'} />
            </div>
            {r.score && <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
              РЎС‚Р°РЅРґР°СЂС‚: {r.status} | РЎРєРѕСЂ: {r.score}
            </div>}
          </div>
        ))
      }
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
      const [m, f] = await Promise.all([
        apiRequest('/islamic-finance/ssb/members'),
        apiRequest('/islamic-finance/ssb/fatwas'),
      ]);
      setMembers(toArray(m)); setFatwas(toArray(f));
    } catch {}
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div>;

  return (
    <div>
      <h3 style={sectionTitle}>Р§Р»РµРЅС‹ РЁР°СЂРёР°С‚СЃРєРѕРіРѕ СЃРѕРІРµС‚Р° (SSB)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3], marginBottom: spacing[6] }}>
        {members.map((m: any) => (
          <div key={m.id} style={cardStyle}>
            <div style={{ fontWeight: typography.fontWeight.semibold }}>{m.full_name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{m.qualifications} В· {(m.is_active ? 'Active' : 'Inactive')}</div>
          </div>
        ))}
        {members.length === 0 && <div style={{ color: semantic.textSecondary }}>РќРµС‚ РґР°РЅРЅС‹С…</div>}
      </div>

      <h3 style={sectionTitle}>Р¤Р°С‚РІС‹</h3>
      {fatwas.map((f: any) => (
        <div key={f.id} style={cardStyle}>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>{f.subject}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginTop: spacing[1] }}>{f.product_type} В· {f.decision}</div>
          {f.reasoning && <div style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>{f.reasoning}</div>}
        </div>
      ))}
      {fatwas.length === 0 && <div style={{ ...cardStyle, color: semantic.textSecondary }}>РќРµС‚ С„Р°С‚РІ</div>}
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

  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div>;

  return (
    <div>
      <h3 style={sectionTitle}>Р“Р»РѕСЃСЃР°СЂРёР№ РёСЃР»Р°РјСЃРєРёС… С„РёРЅР°РЅСЃРѕРІ</h3>
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
      {data.length === 0 && <div style={{ ...cardStyle, textAlign: 'center', color: semantic.textSecondary }}>Р“Р»РѕСЃСЃР°СЂРёР№ РїСѓСЃС‚</div>}
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
        <h3 style={sectionTitle}>РЎРѕР·РґР°С‚СЊ P2P РїСЂРѕРµРєС‚</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
          <div><label style={labelStyle}>РќР°Р·РІР°РЅРёРµ</label><input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Р¦РµР»РµРІР°СЏ СЃСѓРјРјР°</label><input type="number" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>РўРёРї</label>
            <select value={form.product_type} onChange={e => set('product_type', e.target.value)} style={inputStyle}>
              <option value="mudaraba">РњСѓРґР°СЂР°Р±Р°</option><option value="musharaka">РњСѓС€Р°СЂР°РєР°</option>
            </select>
          </div>
          <div><label style={labelStyle}>РџСЂРѕРїРѕСЂС†РёСЏ РїСЂРёР±С‹Р»Рё</label><input value={form.profit_sharing_ratio} onChange={e => set('profit_sharing_ratio', e.target.value)} placeholder="60:40" style={inputStyle} /></div>
        </div>
        <button onClick={create} style={{ ...btnPrimary, marginTop: spacing[4] }}>РЎРѕР·РґР°С‚СЊ РїСЂРѕРµРєС‚</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div> :
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

  if (loading) return <div style={{ textAlign: 'center', padding: spacing[6], color: semantic.textSecondary }}>Р—Р°РіСЂСѓР·РєР°...</div>;

  return (
    <div>
      <h3 style={sectionTitle}>Р—Р°РїСЂРµС‰С‘РЅРЅС‹Рµ РѕС‚СЂР°СЃР»Рё (РҐР°СЂР°Рј)</h3>
      <div style={cardStyle}>
        {haramList.map((item: any, i: number) => (
          <div key={i} style={{ padding: spacing[2], borderBottom: i < haramList.length - 1 ? `1px solid ${semantic.border}` : 'none' }}>
            <span>рџљ« {item.name_ru}</span> <span style={{ color: semantic.textSecondary }}>({item.name_uz})</span>
            {item.reason && <div style={{ fontSize: typography.fontSize.xs, color: semantic.textSecondary }}>{item.reason}</div>}
          </div>
        ))}
        {haramList.length === 0 && <div style={{ color: semantic.textSecondary }}>РќРµС‚ РґР°РЅРЅС‹С…</div>}
      </div>

      <h3 style={sectionTitle}>Р¤РёРЅР°РЅСЃРѕРІС‹Рµ РїРѕСЂРѕРіРё AAOIFI</h3>
      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `2px solid ${semantic.border}` }}>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>РљСЂРёС‚РµСЂРёР№</th>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>РњР°РєСЃРёРјСѓРј</th>
            <th style={{ textAlign: 'left', padding: spacing[2] }}>РЎС‚Р°РЅРґР°СЂС‚</th>
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

      <h3 style={sectionTitle}>РЁР°СЂРёР°С‚СЃРєРёРµ РёРЅРґРµРєСЃС‹</h3>
      {indices.map((item: any, i: number) => (
        <div key={i} style={cardStyle}>
          <div style={{ fontWeight: typography.fontWeight.semibold }}>{item.name}</div>
          <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>{item.provider} В· {item.description}</div>
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



