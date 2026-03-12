'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const C = {
  bg: '#f8fafc', card: '#ffffff', primary: '#3b82f6', primaryLight: '#eff6ff',
  success: '#22c55e', successLight: '#f0fdf4', warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fef2f2', cyan: '#06b6d4', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', secondary: '#8b5cf6', secondaryLight: '#f5f3ff',
};

const tabs = ['DCF & ROI', 'Сравнение', 'Чувствительность', 'Монте-Карло', 'Бенчмарки'];

const UZ_INDUSTRIES = [
  'Оптовая торговля мукой', 'Розничная торговля продуктами', 'Текстильное производство',
  'Строительство жилых зданий', 'IT-услуги и разработка ПО', 'Фармацевтика',
  'Сельское хозяйство', 'Логистика и транспорт', 'Банковские услуги', 'Страхование',
  'Энергетика', 'Горнодобывающая промышленность', 'Пищевая промышленность',
  'Химическая промышленность', 'Металлургия', 'Туризм и гостиницы',
  'Образование', 'Здравоохранение', 'Телекоммуникации', 'Недвижимость',
  'Автомобильная отрасль', 'Электроника', 'Мебельное производство',
  'Легкая промышленность', 'Нефть и газ'
];

async function api(path: string, body?: any) {
  const token = localStorage.getItem('token');
  const opts: any = { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); }
  const r = await fetch(`${API}/api/v1/calculator${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

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
  const [taxRegime, setTaxRegime] = useState('general');
  const [currency, setCurrency] = useState('UZS');
  const [terminalGrowth, setTerminalGrowth] = useState('3');
  const [dcfResult, setDcfResult] = useState<any>(null);
  const [mcResult, setMcResult] = useState<any>(null);
  const [sensResult, setSensResult] = useState<any>(null);
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [compareScenarios, setCompareScenarios] = useState<any[]>([]);
  const [waccDefaults, setWaccDefaults] = useState<any>(null);
  const [taxRates, setTaxRates] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/benchmarks').then(setBenchmarks).catch(() => {});
    api('/wacc-defaults').then(setWaccDefaults).catch(() => {});
    api('/tax-rates').then(setTaxRates).catch(() => {});
  }, []);

  const buildCashFlows = () => {
    const inv = parseFloat(investment) || 100000;
    const g = (parseFloat(growthRate) || 15) / 100;
    const n = parseInt(years) || 5;
    const base = inv * 0.3;
    return Array.from({length: n}, (_, i) => Math.round(base * Math.pow(1 + g, i + 1)));
  };

  const getDiscountRate = () => {
    if (discountRateMode === 'manual') return (parseFloat(manualRate) || 15) / 100;
    const rfV = (parseFloat(rf) || 14) / 100;
    const erpV = (parseFloat(erp) || 8) / 100;
    const crpV = (parseFloat(crp) || 4) / 100;
    const betaV = parseFloat(beta) || 1.2;
    const rdV = (parseFloat(rd) || 18) / 100;
    const eW = (parseFloat(equityDebt) || 60) / 100;
    const dW = 1 - eW;
    const taxR = taxRegime === 'general' ? 0.15 : taxRegime === 'simplified' ? 0.04 : 0;
    const ke = rfV + betaV * erpV + crpV;
    return eW * ke + dW * rdV * (1 - taxR);
  };

  const runDCF = async () => {
    setLoading(true); setError('');
    try {
      const res = await api('/dcf', {
        cash_flows: buildCashFlows(), discount_rate: getDiscountRate(),
        terminal_growth: (parseFloat(terminalGrowth) || 3) / 100,
        initial_investment: parseFloat(investment) || 100000,
        tax_regime: taxRegime, currency, industry,
        years: parseInt(years) || 5
      });
      setDcfResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runMC = async () => {
    setLoading(true); setError('');
    try {
      const res = await api('/monte-carlo', {
        cash_flows: buildCashFlows(), discount_rate: getDiscountRate(),
        initial_investment: parseFloat(investment) || 100000,
        simulations: 5000, volatility: 0.2, currency
      });
      setMcResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runSens = async () => {
    setLoading(true); setError('');
    try {
      const res = await api('/sensitivity', {
        cash_flows: buildCashFlows(), discount_rate: getDiscountRate(),
        initial_investment: parseFloat(investment) || 100000,
        parameter: 'discount_rate', range_pct: 50, steps: 10, currency
      });
      setSensResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runCompare = async () => {
    setLoading(true); setError('');
    try {
      const base = buildCashFlows();
      const dr = getDiscountRate();
      const inv = parseFloat(investment) || 100000;
      const res = await api('/compare', {
        scenarios: [
          { name: 'Оптимистичный', cash_flows: base.map(x => Math.round(x * 1.3)), discount_rate: dr * 0.9, initial_investment: inv, currency },
          { name: 'Базовый', cash_flows: base, discount_rate: dr, initial_investment: inv, currency },
          { name: 'Пессимистичный', cash_flows: base.map(x => Math.round(x * 0.7)), discount_rate: dr * 1.15, initial_investment: inv, currency }
        ]
      });
      setCompareScenarios(res.scenarios || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 0}).format(n);
  const fmtPct = (n: number) => (n * 100).toFixed(1) + '%';

  const cardStyle = { background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, marginBottom: 16 };
  const btnStyle = (active?: boolean) => ({
    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
    background: active ? C.primary : C.primaryLight, color: active ? '#fff' : C.primary,
    transition: 'all .2s'
  });
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none' };
  const labelStyle = { fontSize: 13, color: C.muted, marginBottom: 4, display: 'block', fontWeight: 500 };
  const metricCard = (label: string, value: string, color: string) => (
    <div key={label} style={{background: color + '11', borderRadius: 10, padding: 16, textAlign: 'center' as const, flex: '1 1 180px', minWidth: 150}}>
      <div style={{fontSize: 12, color: C.muted, marginBottom: 4}}>{label}</div>
      <div style={{fontSize: 20, fontWeight: 700, color}}>{value}</div>
    </div>
  );

  return (
    <div style={{minHeight: '100vh', background: C.bg, padding: '24px'}}>
      <div style={{maxWidth: 1200, margin: '0 auto'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24}}>
          <div>
            <h1 style={{fontSize: 28, fontWeight: 800, color: C.text, margin: 0}}>📊 Investment Calculator Pro</h1>
            <p style={{color: C.muted, margin: '4px 0 0', fontSize: 14}}>DCF · WACC CAPM · Monte-Carlo · Бенчмарки Узбекистан 2026</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap'}}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={btnStyle(activeTab === t)}>{t}</button>
          ))}
        </div>

        {error && <div style={{background: C.errorLight, color: C.error, padding: 12, borderRadius: 8, marginBottom: 16}}>{error}</div>}

        {/* Input Panel */}
        <div style={cardStyle}>
          <h3 style={{margin: '0 0 16px', fontSize: 16, color: C.text}}>⚡ Параметры инвестиции</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16}}>
            <div><label style={labelStyle}>Сумма инвестиции</label><input style={inputStyle} value={investment} onChange={e => setInvestment(e.target.value)} /></div>
            <div><label style={labelStyle}>Срок (лет)</label><input style={inputStyle} value={years} onChange={e => setYears(e.target.value)} /></div>
            <div><label style={labelStyle}>Отрасль</label>
              <select style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)}>
                {UZ_INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Рост выручки (%)</label><input style={inputStyle} value={growthRate} onChange={e => setGrowthRate(e.target.value)} /></div>
            <div><label style={labelStyle}>Терминальный рост (%)</label><input style={inputStyle} value={terminalGrowth} onChange={e => setTerminalGrowth(e.target.value)} /></div>
            <div><label style={labelStyle}>Валюта</label>
              <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option>UZS</option><option>USD</option>
              </select>
            </div>
            <div><label style={labelStyle}>Налоговый режим</label>
              <select style={inputStyle} value={taxRegime} onChange={e => setTaxRegime(e.target.value)}>
                <option value="general">Общий (15%)</option><option value="simplified">Упрощенный (4%)</option><option value="free_zone">СЭЗ (0%)</option>
              </select>
            </div>
            <div><label style={labelStyle}>Ставка дисконтирования</label>
              <select style={inputStyle} value={discountRateMode} onChange={e => setDiscountRateMode(e.target.value as any)}>
                <option value="manual">Вручную</option><option value="wacc">WACC CAPM</option>
              </select>
            </div>
            {discountRateMode === 'manual' ? (
              <div><label style={labelStyle}>Ставка (%)</label><input style={inputStyle} value={manualRate} onChange={e => setManualRate(e.target.value)} /></div>
            ) : (
              <>
                <div><label style={labelStyle}>Equity Weight (%)</label><input style={inputStyle} value={equityDebt} onChange={e => setEquityDebt(e.target.value)} /></div>
                <div><label style={labelStyle}>Rf (%)</label><input style={inputStyle} value={rf} onChange={e => setRf(e.target.value)} /></div>
                <div><label style={labelStyle}>ERP (%)</label><input style={inputStyle} value={erp} onChange={e => setErp(e.target.value)} /></div>
                <div><label style={labelStyle}>CRP (%)</label><input style={inputStyle} value={crp} onChange={e => setCrp(e.target.value)} /></div>
                <div><label style={labelStyle}>Beta</label><input style={inputStyle} value={beta} onChange={e => setBeta(e.target.value)} /></div>
                <div><label style={labelStyle}>Rd (%)</label><input style={inputStyle} value={rd} onChange={e => setRd(e.target.value)} /></div>
              </>
            )}
          </div>
          <div style={{marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button onClick={runDCF} disabled={loading} style={btnStyle(true)}>{loading ? 'Загрузка...' : 'Рассчитать DCF'}</button>
            <button onClick={runMC} disabled={loading} style={btnStyle()}>Monte-Carlo</button>
            <button onClick={runSens} disabled={loading} style={btnStyle()}>Чувствительность</button>
            <button onClick={runCompare} disabled={loading} style={btnStyle()}>Сравнить</button>
          </div>
        </div>

        {/* DCF & ROI Tab */}
        {activeTab === 'DCF & ROI' && dcfResult && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>📈 Результаты DCF-анализа</h3>
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20}}>
              {metricCard('NPV', fmt(dcfResult.npv), dcfResult.npv > 0 ? C.success : C.error)}
              {metricCard('IRR', dcfResult.irr ? fmtPct(dcfResult.irr) : 'N/A', C.primary)}
              {metricCard('XIRR', dcfResult.xirr ? fmtPct(dcfResult.xirr) : 'N/A', C.cyan)}
              {metricCard('MIRR', dcfResult.mirr ? fmtPct(dcfResult.mirr) : 'N/A', C.secondary)}
              {metricCard('PI', dcfResult.profitability_index?.toFixed(2) || 'N/A', C.warning)}
              {metricCard('ROI', dcfResult.roi ? fmtPct(dcfResult.roi) : 'N/A', C.success)}
              {metricCard('Payback', dcfResult.payback_period ? dcfResult.payback_period.toFixed(1) + ' лет' : 'N/A', C.muted)}
              {metricCard('WACC', dcfResult.wacc ? fmtPct(dcfResult.wacc) : fmtPct(getDiscountRate()), C.primary)}
            </div>
            {dcfResult.yearly_cash_flows && (
              <div style={{height: 300}}>
                <ResponsiveContainer>
                  <BarChart data={dcfResult.yearly_cash_flows.map((cf: number, i: number) => ({year: `Год ${i+1}`, cf, dcf: dcfResult.discounted_cash_flows?.[i] || cf / Math.pow(1 + getDiscountRate(), i+1)}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="cf" name="Денежный поток" fill={C.primary} />
                    <Bar dataKey="dcf" name="Дисконтированный" fill={C.cyan} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {dcfResult.recommendation && (
              <div style={{marginTop: 16, padding: 16, background: dcfResult.npv > 0 ? C.successLight : C.errorLight, borderRadius: 8}}>
                <strong>Рекомендация:</strong> {dcfResult.recommendation}
              </div>
            )}
          </div>
        )}

        {/* Сравнение Tab */}
        {activeTab === 'Сравнение' && compareScenarios.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>⚖️ Сравнение сценариев</h3>
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead><tr style={{background: C.primaryLight}}>
                  {['Сценарий','NPV','IRR','MIRR','PI','ROI','Payback'].map(h => (
                    <th key={h} style={{padding: '10px 12px', textAlign: 'left', fontSize: 13, color: C.text, borderBottom: `2px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{compareScenarios.map((s: any, i: number) => (
                  <tr key={i} style={{borderBottom: `1px solid ${C.border}`}}>
                    <td style={{padding: '10px 12px', fontWeight: 600}}>{s.name}</td>
                    <td style={{padding: '10px 12px', color: s.npv > 0 ? C.success : C.error}}>{fmt(s.npv)}</td>
                    <td style={{padding: '10px 12px'}}>{s.irr ? fmtPct(s.irr) : 'N/A'}</td>
                    <td style={{padding: '10px 12px'}}>{s.mirr ? fmtPct(s.mirr) : 'N/A'}</td>
                    <td style={{padding: '10px 12px'}}>{s.profitability_index?.toFixed(2) || 'N/A'}</td>
                    <td style={{padding: '10px 12px'}}>{s.roi ? fmtPct(s.roi) : 'N/A'}</td>
                    <td style={{padding: '10px 12px'}}>{s.payback_period?.toFixed(1) || 'N/A'} лет</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{height: 300, marginTop: 20}}>
              <ResponsiveContainer>
                <BarChart data={compareScenarios.map((s: any) => ({name: s.name, NPV: s.npv}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="NPV" fill={C.primary}>
                    {compareScenarios.map((_: any, i: number) => <Cell key={i} fill={[C.success, C.primary, C.error][i] || C.primary} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Чувствительность Tab */}
        {activeTab === 'Чувствительность' && sensResult && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>🎯 Tornado-анализ чувствительности</h3>
            <div style={{height: 400}}>
              <ResponsiveContainer>
                <LineChart data={(sensResult.results || sensResult.sensitivity_data || []).map((p: any) => ({rate: fmtPct(p.discount_rate || p.parameter_value), NPV: p.npv}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rate" label={{value: 'Ставка дисконтирования', position: 'insideBottom', offset: -5}} />
                  <YAxis label={{value: 'NPV', angle: -90, position: 'insideLeft'}} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="NPV" stroke={C.primary} strokeWidth={3} dot={{fill: C.primary, r: 5}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {sensResult.break_even_rate && (
              <div style={{marginTop: 12, padding: 12, background: C.warningLight, borderRadius: 8}}>
                <strong>Точка безубыточности:</strong> ставка {fmtPct(sensResult.break_even_rate)}
              </div>
            )}
          </div>
        )}

        {/* Монте-Карло Tab */}
        {activeTab === 'Монте-Карло' && mcResult && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>🎲 Монте-Карло симуляция (5000 итераций)</h3>
            <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20}}>
              {metricCard('P10 (NPV)', fmt(mcResult.percentiles?.p10 || 0), C.error)}
              {metricCard('P50 (NPV)', fmt(mcResult.percentiles?.p50 || mcResult.mean_npv || 0), C.warning)}
              {metricCard('P90 (NPV)', fmt(mcResult.percentiles?.p90 || 0), C.success)}
              {metricCard('Среднее NPV', fmt(mcResult.mean_npv || 0), C.primary)}
              {metricCard('Std Dev', fmt(mcResult.std_npv || 0), C.muted)}
              {metricCard('VaR 95%', fmt(mcResult.var_95 || 0), C.error)}
              {metricCard('CVaR 95%', fmt(mcResult.cvar_95 || 0), C.error)}
              {metricCard('Вероятность NPV>0', mcResult.probability_positive ? (mcResult.probability_positive * 100).toFixed(1) + '%' : 'N/A', C.success)}
            </div>
            {mcResult.histogram && (
              <div style={{height: 350}}>
                <ResponsiveContainer>
                  <BarChart data={mcResult.histogram.map((h: any) => ({bin: fmt(h.bin_start), count: h.count}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bin" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Частота">
                      {mcResult.histogram.map((h: any, i: number) => <Cell key={i} fill={h.bin_start >= 0 ? C.success : C.error} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Бенчмарки Tab */}
        {activeTab === 'Бенчмарки' && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>🏆 Бенчмарки Узбекистан 2026</h3>
            {benchmarks ? (
              <>
                <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20}}>
                  {metricCard('Ставка ЦБ', benchmarks.cb_rate || '14%', C.primary)}
                  {metricCard('Инфляция', benchmarks.inflation || '10%', C.warning)}
                  {metricCard('Рост ВВП', benchmarks.gdp_growth || '5.5%', C.success)}
                  {metricCard('Курс USD/UZS', benchmarks.usd_uzs || '12 800', C.cyan)}
                </div>
                {benchmarks.sectors && (
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                      <thead><tr style={{background: C.primaryLight}}>
                        {['Отрасль','Рост','Маржа','Риск'].map(h => (
                          <th key={h} style={{padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{benchmarks.sectors.map((s: any, i: number) => (
                        <tr key={i} style={{borderBottom: `1px solid ${C.border}`}}>
                          <td style={{padding: '8px 12px', fontWeight: 500}}>{s.name}</td>
                          <td style={{padding: '8px 12px'}}>{s.growth || 'N/A'}</td>
                          <td style={{padding: '8px 12px'}}>{s.margin || 'N/A'}</td>
                          <td style={{padding: '8px 12px'}}>{s.risk || 'N/A'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </>
            ) : <p style={{color: C.muted}}>Загрузка бенчмарков...</p>}

            {/* WACC Defaults */}
            {waccDefaults && (
              <div style={{marginTop: 20, padding: 16, background: C.primaryLight, borderRadius: 8}}>
                <h4 style={{margin: '0 0 8px'}}>📊 WACC CAPM параметры по умолчанию (UZ 2026)</h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, fontSize: 13}}>
                  <div><strong>Rf:</strong> {waccDefaults.risk_free_rate}</div>
                  <div><strong>ERP:</strong> {waccDefaults.equity_risk_premium}</div>
                  <div><strong>CRP:</strong> {waccDefaults.country_risk_premium}</div>
                  <div><strong>Beta:</strong> {waccDefaults.default_beta}</div>
                  <div><strong>Rd:</strong> {waccDefaults.cost_of_debt}</div>
                </div>
              </div>
            )}

            {/* Tax Rates */}
            {taxRates && (
              <div style={{marginTop: 16, padding: 16, background: C.successLight, borderRadius: 8}}>
                <h4 style={{margin: '0 0 8px'}}>📝 Налоговые ставки Узбекистан</h4>
                <div style={{fontSize: 13}}>
                  {Object.entries(taxRates).map(([k, v]: any) => (
                    <div key={k} style={{marginBottom: 4}}><strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
