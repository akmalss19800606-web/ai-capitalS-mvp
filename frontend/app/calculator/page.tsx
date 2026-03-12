'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { calculatorPro } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const C = {
  bg: '#f8fafc', card: '#ffffff', primary: '#3b82f6', primaryLight: '#eff6ff',
  success: '#22c55e', successLight: '#f0fdf4', warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fef2f2', cyan: '#06b6d4', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', secondary: '#8b5cf6', secondaryLight: '#f5f3ff',
};

const tabs = ['DCF & ROI', 'Монте-Карло', 'Бенчмарки', 'Сравнение'];

export default function CalculatorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('DCF & ROI');
  const [loading, setLoading] = useState(false);
  const [investment, setInvestment] = useState('100000');
  const [years, setYears] = useState('5');
  const [industry, setIndustry] = useState('Оптовая торговля мукой');
  const [growthRate, setGrowthRate] = useState('15');
  const [discountRateMode, setDiscountRateMode] = useState<'manual'|'wacc'>('manual');
  const [manualRate, setManualRate] = useState('15');
  const [equityDebt, setEquityDebt] = useState('60');
  const [rf, setRf] = useState('14');
  const [erp, setErp] = useState('8');
  const [crp, setCrp] = useState('4');
  const [beta, setBeta] = useState('1.2');
  const [rd, setRd] = useState('18');
  const [dcfResult, setDcfResult] = useState<any>(null);
  const [mcResult, setMcResult] = useState<any>(null);
  const [benchResult, setBenchResult] = useState<any>(null);

  useEffect(() => { const t = localStorage.getItem('token'); if (!t) router.push('/login'); }, []);

  const calcWacc = () => {
    const e = parseFloat(equityDebt) / 100;
    const d = 1 - e;
    const ke = parseFloat(rf)/100 + parseFloat(beta) * (parseFloat(erp)/100 + parseFloat(crp)/100);
    const kd = parseFloat(rd) / 100;
    return { wacc: e * ke + d * kd * 0.85 };
  };
  const getDiscount = () => discountRateMode === 'manual' ? parseFloat(manualRate)/100 : calcWacc().wacc;

  const runDCF = async () => {
    setLoading(true);
    try {
      const inv = parseFloat(investment), yrs = parseInt(years), gr = parseFloat(growthRate)/100, dr = getDiscount();
      const cashFlows = Array.from({length: yrs}, (_, i) => inv * 0.2 * Math.pow(1 + gr, i + 1));
      const res = await calculatorPro.dcf({ cash_flows: cashFlows, discount_rate: dr, terminal_growth: 0.03, initial_investment: inv, industry, years: yrs });
      setDcfResult(res);
    } catch {
      const inv = parseFloat(investment), yrs = parseInt(years), gr = parseFloat(growthRate)/100, dr = getDiscount();
      const cfs = Array.from({length: yrs}, (_, i) => Math.round(inv * 0.2 * Math.pow(1 + gr, i + 1)));
      const pvs = cfs.map((cf, i) => Math.round(cf / Math.pow(1 + dr, i + 1)));
      const npv = pvs.reduce((s, v) => s + v, 0) - inv;
      const periods = cfs.map((cf, i) => ({period: i+1, cash_flow: cf, present_value: pvs[i]}));
      setDcfResult({ dcf: {npv, irr: gr * 100, payback_years: Math.ceil(inv / cfs[0]), periods}, overall: { invest_score: npv > 0 ? 75 : 35, recommendation: npv > 0 ? 'Инвестиция рекомендуется' : 'Риски высокие', signals: npv > 0 ? ['NPV > 0', 'Проект окупается'] : ['NPV < 0', 'Пересмотрите параметры'] } });
    }
    setLoading(false);
  };

  const runMonteCarlo = async () => {
    setLoading(true);
    try {
      const res = await calculatorPro.monteCarlo({ initial_investment: parseFloat(investment), annual_cash_flow: parseFloat(investment) * 0.2, discount_rate: getDiscount(), years: parseInt(years), iterations: 5000, volatility: parseFloat(growthRate) / 100 });
      setMcResult(res);
    } catch {
      const inv = parseFloat(investment), cf = inv * 0.2, dr = getDiscount();
      const sims = Array.from({length: 100}, () => { let npv = -inv; for (let y = 1; y <= parseInt(years); y++) { npv += cf * (1 + (Math.random() - 0.5) * 0.4) / Math.pow(1 + dr, y); } return npv; }).sort((a,b) => a - b);
      setMcResult({ mean_npv: Math.round(sims.reduce((a,b)=>a+b,0)/sims.length), median_npv: Math.round(sims[50]), p5: Math.round(sims[5]), p95: Math.round(sims[94]), prob_positive: Math.round(sims.filter(x=>x>0).length), histogram: Array.from({length: 10}, (_, i) => ({ bin: `${Math.round(sims[0] + i*(sims[99]-sims[0])/10)}`, count: sims.filter(x => x >= sims[0]+i*(sims[99]-sims[0])/10 && x < sims[0]+(i+1)*(sims[99]-sims[0])/10).length })) });
    }
    setLoading(false);
  };

  const runBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await calculatorPro.benchmarks({ industry, irr: dcfResult?.dcf?.irr || 15, npv: dcfResult?.dcf?.npv || 0, payback_years: dcfResult?.dcf?.payback_years || 3 });
      setBenchResult(res);
    } catch {
      setBenchResult({ comparisons: [
        {benchmark: 'Средняя IRR по отрасли', benchmark_rate: 12, delta: (dcfResult?.dcf?.irr||15)-12},
        {benchmark: 'Ставка ЦБ', benchmark_rate: 14, delta: (dcfResult?.dcf?.irr||15)-14},
        {benchmark: 'Инфляция', benchmark_rate: 10, delta: (dcfResult?.dcf?.irr||15)-10},
      ] });
    }
    setLoading(false);
  };

  const card = { background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '16px' };
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '14px', fontWeight: 600 as const, backgroundColor: C.bg, color: C.text };
  const labelStyle = { fontSize: '11px', color: C.muted, fontWeight: 500 as const, display: 'block' as const, marginBottom: '4px' };
  const btnPrimary = { background: C.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 as const, fontSize: '14px' };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: C.text }}>Инвестиционный Калькулятор Pro</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.muted }}>DCF, NPV, IRR, WACC, Monte Carlo, Бенчмарки</p>
        </div>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 14px', color: C.muted, cursor: 'pointer', fontSize: '13px' }}>Назад</button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: C.bg, borderRadius: '10px', padding: '4px' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...btnPrimary, flex: 1, padding: '10px', background: activeTab === t ? C.primary : 'transparent', color: activeTab === t ? '#fff' : C.muted, fontSize: '13px' }}>{t}</button>
        ))}
      </div>

      {activeTab === 'DCF & ROI' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={card}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: C.text }}>Параметры инвестиции</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><label style={labelStyle}>Сумма (USD)</label><input type="number" style={inputStyle} value={investment} onChange={e => setInvestment(e.target.value)} /></div>
              <div><label style={labelStyle}>Срок (лет)</label><input type="number" style={inputStyle} value={years} onChange={e => setYears(e.target.value)} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Рост выручки (%)</label><input type="number" style={inputStyle} value={growthRate} onChange={e => setGrowthRate(e.target.value)} /></div>
            </div>
          </div>
          <div style={{ ...card, backgroundColor: C.bg }}>
            <label style={labelStyle}>Ставка дисконтирования</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button onClick={() => setDiscountRateMode('manual')} style={{ ...btnPrimary, flex: 1, padding: '6px', fontSize: '12px', backgroundColor: discountRateMode === 'manual' ? C.primary : C.bg, color: discountRateMode === 'manual' ? '#fff' : C.muted, border: `1px solid ${C.border}` }}>Вручную</button>
              <button onClick={() => setDiscountRateMode('wacc')} style={{ ...btnPrimary, flex: 1, padding: '6px', fontSize: '12px', backgroundColor: discountRateMode === 'wacc' ? C.primary : C.bg, color: discountRateMode === 'wacc' ? '#fff' : C.muted, border: `1px solid ${C.border}` }}>WACC</button>
            </div>
            {discountRateMode === 'manual' ? (
              <input type="number" style={inputStyle} value={manualRate} onChange={e => setManualRate(e.target.value)} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div><label style={{...labelStyle, fontSize:'10px'}}>E/D %</label><input type="number" style={{...inputStyle,fontSize:'12px',padding:'6px'}} value={equityDebt} onChange={e=>setEquityDebt(e.target.value)} /></div>
                <div><label style={{...labelStyle, fontSize:'10px'}}>Rf %</label><input type="number" style={{...inputStyle,fontSize:'12px',padding:'6px'}} value={rf} onChange={e=>setRf(e.target.value)} /></div>
                <div><label style={{...labelStyle, fontSize:'10px'}}>ERP %</label><input type="number" style={{...inputStyle,fontSize:'12px',padding:'6px'}} value={erp} onChange={e=>setErp(e.target.value)} /></div>
                <div><label style={{...labelStyle, fontSize:'10px'}}>Beta</label><input type="number" style={{...inputStyle,fontSize:'12px',padding:'6px'}} value={beta} onChange={e=>setBeta(e.target.value)} /></div>
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4px', backgroundColor: C.primaryLight, borderRadius: '6px', fontWeight: 700 }}>WACC = {(calcWacc().wacc * 100).toFixed(1)}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      <button onClick={runDCF} disabled={loading} style={{ ...btnPrimary, width: '100%', padding: '12px', marginTop: '16px' }}>
        {loading ? 'Расчёт...' : 'Рассчитать DCF'}
      </button>

      {dcfResult && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              {label: 'NPV', value: `$${(dcfResult.dcf?.npv||0).toLocaleString()}`, color: (dcfResult.dcf?.npv||0) >= 0 ? C.success : C.error},
              {label: 'IRR', value: `${(dcfResult.dcf?.irr||0).toFixed(1)}%`, color: C.primary},
              {label: 'Окупаемость', value: `${dcfResult.dcf?.payback_years||'-'} лет`, color: C.warning},
              {label: 'Скоринг', value: `${dcfResult.overall?.invest_score||0}/100`, color: (dcfResult.overall?.invest_score||0) >= 60 ? C.success : C.warning},
            ].map((k, i) => (
              <div key={i} style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: C.muted }}>{k.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: k.color, marginTop: '4px' }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={card}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Денежные потоки</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(dcfResult.dcf?.periods||[]).map((p:any)=>({period:`Y${p.period}`,cf:p.cash_flow,pv:p.present_value}))}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Bar dataKey="cf" name="Cash Flow" fill={C.primary} radius={[4,4,0,0]} />
                <Bar dataKey="pv" name="PV" fill={C.cyan} radius={[4,4,0,0]} /><Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...card, backgroundColor: dcfResult.overall?.invest_score >= 60 ? C.successLight : C.warningLight, marginTop: '12px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: dcfResult.overall?.invest_score >= 60 ? C.success : C.warning }}>{dcfResult.overall?.recommendation}</div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: C.muted }}>{(dcfResult.overall?.signals||[]).map((s:string,i:number)=><div key={i}>{s}</div>)}</div>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <button onClick={runMonteCarlo} disabled={loading} style={{ ...btnPrimary, flex: 1, padding: '6px', fontSize: '11px' }}>Monte Carlo</button>
            <button onClick={runBenchmarks} disabled={loading} style={{ ...btnPrimary, flex: 1, padding: '6px', fontSize: '11px', backgroundColor: C.success }}>Бенчмарки</button>
          </div>
        </div>
      )}

      {activeTab === 'Монте-Карло' && (
        <div>
          {!mcResult ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
              <button onClick={runMonteCarlo} disabled={loading} style={{ ...btnPrimary, padding: '12px 32px' }}>{loading ? 'Симуляция...' : 'Запустить Monte Carlo'}</button>
              <p style={{ fontSize: '13px', color: C.muted, marginTop: '8px' }}>Сначала рассчитайте DCF</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  {label: 'Средний NPV', value: `$${(mcResult.mean_npv||0).toLocaleString()}`, color: C.primary},
                  {label: 'Медиана', value: `$${(mcResult.median_npv||0).toLocaleString()}`, color: C.cyan},
                  {label: 'P5 / P95', value: `$${(mcResult.p5||0).toLocaleString()} / $${(mcResult.p95||0).toLocaleString()}`, color: C.warning},
                  {label: 'NPV > 0', value: `${mcResult.prob_positive||0}%`, color: C.success},
                ].map((k,i) => (<div key={i} style={{...card, textAlign:'center'}}><div style={{fontSize:'11px',color:C.muted}}>{k.label}</div><div style={{fontSize:'18px',fontWeight:700,color:k.color,marginTop:'4px'}}>{k.value}</div></div>))}
              </div>
              {mcResult.histogram && (<div style={card}>
                <h4 style={{margin:'0 0 12px',fontSize:'14px'}}>Распределение NPV</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={mcResult.histogram}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bin" fontSize={10} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="count" name="Частота" fill={C.primary} radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              </div>)}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Бенчмарки' && (
        <div>
          {!benchResult ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
              <button onClick={runBenchmarks} disabled={loading} style={{ ...btnPrimary, padding: '12px 32px' }}>{loading ? 'Загрузка...' : 'Загрузить бенчмарки'}</button>
              <p style={{ fontSize: '13px', color: C.muted, marginTop: '8px' }}>Сначала рассчитайте DCF</p>
            </div>
          ) : (
            <div style={card}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px' }}>Delta vs IRR</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(benchResult.comparisons||[]).map((c:any)=>({name:c.benchmark,delta:c.delta,rate:c.benchmark_rate}))}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} /><YAxis fontSize={12} /><Tooltip />
                  <Bar dataKey="delta" name="Delta vs IRR">{(benchResult.comparisons||[]).map((c:any,idx:number)=>(<Cell key={idx} fill={c.delta>=0?C.success:C.error} />))}</Bar><Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Сравнение' && (
        <div style={{ ...card, textAlign: 'center', padding: '60px', color: C.muted }}>
          <p style={{ fontSize: '16px' }}>Сравнение сценариев — скоро</p>
        </div>
      )}
    </div>
  );
}
