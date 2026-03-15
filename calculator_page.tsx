"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const C={bg:"#f8fafc",card:"#ffffff",primary:"#3b82f6",primaryLight:"#eff6ff",success:"#22c55e",successBg:"#f0fdf4",warning:"#f59e0b",warningBg:"#fffbeb",error:"#ef4444",errorBg:"#fef2f2",cyan:"#06b6d4",text:"#1e293b",muted:"#64748b",border:"#e2e8f0",purple:"#8b5cf6",purpleBg:"#f5f3ff"};
const TABS=["DCF & ROI","Сравнение","Чувствительность","Монте-Карло","Бенчмарки"];

async function api(path:string,body?:any){
  const token=localStorage.getItem("access_token")||localStorage.getItem("token");
  const opts:any={headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}};
  if(body){opts.method="POST";opts.body=JSON.stringify(body);}
  const r=await fetch(`${API}/api/v1/calculator${path}`,opts);
  if(!r.ok){let msg="Ошибка сервера";try{const d=await r.json();msg=d.detail||d.message||JSON.stringify(d);}catch{msg=await r.text();}throw new Error(msg);}return r.json();
}
function Card({children,title,style}:{children:any;title?:string;style?:any}){
  return <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"1.25rem",marginBottom:16,...(style||{})}}>{title&&<h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:700,color:C.text}}>{title}</h3>}{children}</div>;
}
function Label({text,tip}:{text:string;tip?:string}){return <label style={{display:"block",fontWeight:600,marginBottom:6,color:C.text,fontSize:13}}>{text}{tip&&<span title={tip} style={{cursor:"help",marginLeft:4,color:C.muted}}>ⓘ</span>}</label>;}
function Inp(p:any){return <input {...p} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:"#ffffff",color:C.text,boxSizing:"border-box",...(p.style||{})}}/>;}
function Sel({children,...p}:any){return <select {...p} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,background:"#ffffff",color:C.text,...(p.style||{})}}>{children}</select>;}
function Metric({label,value,color,sub}:{label:string;value:string;color?:string;sub?:string}){
  return <div style={{textAlign:"center",padding:12}}><div style={{fontSize:12,color:C.muted}}>{label}</div><div style={{fontSize:22,fontWeight:700,color:color||C.text}}>{value}</div>{sub&&<div style={{fontSize:11,color:C.muted}}>{sub}</div>}</div>;
}
function Chip({active,onClick,children}:{active:boolean;onClick:()=>void;children:any}){
  return <button type="button" onClick={onClick} style={{padding:"8px 16px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",border:active?`2px solid ${C.primary}`:`1px solid ${C.border}`,background:active?C.primaryLight:"#fff"}}>{children}</button>;
}

export default function CalculatorPage(){
  const [tab,setTab]=useState("DCF & ROI");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [investment,setInvestment]=useState("100000");
  const [currency,setCurrency]=useState("USD");
  const [years,setYears]=useState("5");
  const [growthRate,setGrowthRate]=useState("15");
  const [drMode,setDrMode]=useState<"manual"|"wacc">("manual");
  const [manualRate,setManualRate]=useState("15");
  const [eqWeight,setEqWeight]=useState("60");
  const [rf,setRf]=useState("4.3");
  const [erp,setErp]=useState("5.5");
  const [crp,setCrp]=useState("5.5");
  const [scp,setScp]=useState("2.5");
  const [betaV,setBeta]=useState("1.2");
  const [rd,setRd]=useState("22.8");
  const [taxRate,setTaxRate]=useState("15");
  const [taxRegime,setTaxRegime]=useState("general");
  const [termGrowth,setTermGrowth]=useState("3");
  const [dcf,setDcf]=useState<any>(null);
  const [wacc,setWacc]=useState<any>(null);
  const [mc,setMc]=useState<any>(null);
  const [sens,setSens]=useState<any>(null);
  const [bench,setBench]=useState<any>(null);
  const [compare,setCompare]=useState<any>(null);
  const [dataTable,setDataTable]=useState<any>(null);

  useEffect(()=>{api("/benchmarks").then(setBench).catch(()=>{});api("/wacc-defaults").catch(()=>{});api("/tax-rates").catch(()=>{});},[]);

  const inv=()=>parseFloat(investment)||100000;
  const yrs=()=>parseInt(years)||5;
  const gr=()=>(parseFloat(growthRate)||15)/100;
  const buildCF=()=>{const base=inv()*0.3;return Array.from({length:yrs()},(_,i)=>Math.round(base*Math.pow(1+gr(),i+1)));};
  const getRate=()=>{
    if(drMode==="manual")return(parseFloat(manualRate)||15)/100;
    const rfV=parseFloat(rf)/100,b=parseFloat(betaV),e=parseFloat(erp)/100,c=parseFloat(crp)/100,sc=parseFloat(scp)/100;
    const re=rfV+b*e+c+sc;const rdV=parseFloat(rd)/100,t=parseFloat(taxRate)/100,ew=parseFloat(eqWeight)/100;
    return ew*re+(1-ew)*rdV*(1-t);
  };
  const fmt=(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:v.toFixed(0);
  const fmtP=(v:number)=>`${(v*100).toFixed(1)}%`;

  async function runDCF(){setLoading(true);setError("");try{
    const cfs=buildCF();const r=await api("/dcf",{initial_investment:inv(),cash_flows:cfs,discount_rate:getRate(),terminal_growth_rate:parseFloat(termGrowth)/100||0.03,tax_regime:taxRegime,currency,investment_horizon_years:yrs()});setDcf(r);
    try{const dt=await api("/data-table",{initial_investment:inv(),cash_flows:cfs,discount_rate:getRate()});setDataTable(dt);}catch{}
  }catch(e:any){setError(e.message);}finally{setLoading(false);}}

  async function runWACC(){setLoading(true);setError("");try{
    const r=await api("/wacc",{equity_weight:parseFloat(eqWeight)/100,debt_weight:1-parseFloat(eqWeight)/100,risk_free_rate:parseFloat(rf)/100,beta:parseFloat(betaV),equity_risk_premium:parseFloat(erp)/100,country_risk_premium:parseFloat(crp)/100,size_premium:parseFloat(scp)/100,cost_of_debt:parseFloat(rd)/100,tax_rate:parseFloat(taxRate)/100});setWacc(r);
  }catch(e:any){setError(e.message);}finally{setLoading(false);}}

  async function runMC(){setLoading(true);setError("");try{
    const r=await api("/monte-carlo",{initial_investment:inv(),cash_flows:buildCF(),discount_rate:getRate(),n_simulations:10000,revenue_std:0.15,cost_std:0.10,rate_std:0.02});setMc(r);
  }catch(e:any){setError(e.message);}finally{setLoading(false);}}

  async function runSens(){setLoading(true);setError("");try{
    const r=await api("/sensitivity",{initial_investment:inv(),cash_flows:buildCF(),discount_rate:getRate(),variables:["revenue","costs","discount_rate","growth_rate","margin","usd_uzs"],variation_range_pct:20});setSens(r);
  }catch(e:any){setError(e.message);}finally{setLoading(false);}}

  async function runCompare(){setLoading(true);setError("");try{
    const scenarios=[{name:"Базовый",initial_investment:inv(),cash_flows:buildCF(),discount_rate:getRate()},{name:"Оптимистичный",initial_investment:inv(),cash_flows:buildCF().map((c:number)=>Math.round(c*1.2)),discount_rate:getRate()*0.9},{name:"Пессимистичный",initial_investment:inv(),cash_flows:buildCF().map((c:number)=>Math.round(c*0.8)),discount_rate:getRate()*1.15}];
    const r=await api("/compare",{scenarios});setCompare(r);
  }catch(e:any){setError(e.message);}finally{setLoading(false);}}

  function TabDCF(){return <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
      <div><Label text="Начальные инвестиции"/><Inp type="number" value={investment} onChange={(e:any)=>setInvestment(e.target.value)}/></div>
      <div><Label text="Валюта"/><Sel value={currency} onChange={(e:any)=>setCurrency(e.target.value)}><option value="USD">USD</option><option value="UZS">UZS</option></Sel></div>
      <div><Label text="Горизонт (лет)"/><Inp type="number" value={years} onChange={(e:any)=>setYears(e.target.value)} min={1} max={30}/></div>
      <div><Label text="Рост выручки (%)"/><Inp type="number" value={growthRate} onChange={(e:any)=>setGrowthRate(e.target.value)}/></div>
      <div><Label text="Terminal Growth (%)"/><Inp type="number" value={termGrowth} onChange={(e:any)=>setTermGrowth(e.target.value)}/></div>
      <div><Label text="Налоговый режим"/><Sel value={taxRegime} onChange={(e:any)=>setTaxRegime(e.target.value)}><option value="general">Общий (15%)</option><option value="simplified">Упрощённый (4%)</option><option value="sez">СЭЗ (0%)</option></Sel></div>
    </div>
    <Card title="Ставка дисконтирования">
      <div style={{display:"flex",gap:12,marginBottom:12}}><Chip active={drMode==="manual"} onClick={()=>setDrMode("manual")}>Вручную</Chip><Chip active={drMode==="wacc"} onClick={()=>setDrMode("wacc")}>WACC CAPM</Chip></div>
      {drMode==="manual"?<div style={{maxWidth:200}}><Label text="Ставка (%)"/><Inp type="number" value={manualRate} onChange={(e:any)=>setManualRate(e.target.value)}/></div>
      :<div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        <div><Label text="Rf (US 10Y)" tip="4.3%"/><Inp type="number" value={rf} onChange={(e:any)=>setRf(e.target.value)} step={0.1}/></div>
        <div><Label text="β (Beta)"/><Inp type="number" value={betaV} onChange={(e:any)=>setBeta(e.target.value)} step={0.1}/></div>
        <div><Label text="ERP (%)" tip="5.5%"/><Inp type="number" value={erp} onChange={(e:any)=>setErp(e.target.value)} step={0.1}/></div>
        <div><Label text="CRP (%)" tip="Country Risk"/><Inp type="number" value={crp} onChange={(e:any)=>setCrp(e.target.value)} step={0.1}/></div>
        <div><Label text="SCP (%)" tip="Size Premium"/><Inp type="number" value={scp} onChange={(e:any)=>setScp(e.target.value)} step={0.1}/></div>
        <div><Label text="E/(E+D) (%)"/><Inp type="number" value={eqWeight} onChange={(e:any)=>setEqWeight(e.target.value)}/></div>
        <div><Label text="Rd (%)" tip="22.8%"/><Inp type="number" value={rd} onChange={(e:any)=>setRd(e.target.value)} step={0.1}/></div>
        <div><Label text="Налог (%)"/><Inp type="number" value={taxRate} onChange={(e:any)=>setTaxRate(e.target.value)}/></div>
      </div><div style={{marginTop:8}}><button onClick={runWACC} disabled={loading} style={{padding:"8px 16px",borderRadius:8,border:"none",background:C.purple,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>Рассчитать WACC</button>{wacc&&<span style={{marginLeft:12,fontWeight:700,color:C.primary}}>WACC = {(wacc.wacc*100||wacc.wacc_pct||0).toFixed(2)}%</span>}</div></div>}
    </Card>
    <button onClick={runDCF} disabled={loading} style={{padding:"12px 32px",borderRadius:8,border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>{loading?"Расчёт...":"Рассчитать DCF & ROI"}</button>
    {dcf&&<div style={{marginTop:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <Card><Metric label="NPV" value={`${currency} ${fmt(dcf.npv)}`} color={dcf.npv>0?C.success:C.error}/></Card>
        <Card><Metric label="IRR" value={fmtP(dcf.irr||dcf.irr_pct/100||0)} color={C.primary}/></Card>
        <Card><Metric label="Payback" value={`${dcf.payback_period?.toFixed(1)||"—"} лет`}/></Card>
        <Card><Metric label="PI" value={(dcf.profitability_index||0).toFixed(2)} color={dcf.profitability_index>1?C.success:C.error}/></Card>
        <Card><Metric label="ROI" value={fmtP((dcf.roi_pct||0)/100)} color={C.success}/></Card>
        <Card><Metric label="XIRR" value={dcf.xirr?fmtP(dcf.xirr):"N/A"}/></Card>
        <Card><Metric label="MIRR" value={dcf.mirr?fmtP(dcf.mirr):"N/A"}/></Card>
        <Card><Metric label="Disc. Payback" value={`${dcf.discounted_payback?.toFixed(1)||"—"} лет`}/></Card>
      </div>
      {dcf.yearly_breakdown&&<Card title="Денежные потоки и накопленный NPV"><ResponsiveContainer width="100%" height={300}><ComposedChart data={dcf.yearly_breakdown}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year"/><YAxis/><Tooltip/><Bar dataKey="cash_flow" fill={C.primary} name="Cash Flow"/><Line dataKey="cumulative_npv" stroke={C.purple} strokeWidth={2} name="Кумулятивный NPV" dot={false}/><Legend/></ComposedChart></ResponsiveContainer></Card>}
      {dataTable&&Array.isArray(dataTable.rows)&&<Card title="NPV Waterfall"><ResponsiveContainer width="100%" height={280}><BarChart data={dataTable.rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year"/><YAxis/><Tooltip/><Bar dataKey="npv_contribution" name="NPV">{dataTable.rows.map((d:any,i:number)=><Cell key={i} fill={d.npv_contribution>=0?C.success:C.error}/>)}</Bar></BarChart></ResponsiveContainer></Card>}
    </div>}
  </div>;}

  function TabCompare(){return <div>
    <p style={{color:C.muted,fontSize:14,marginBottom:12}}>Сравнение 3 сценариев: Базовый, Оптимистичный (+20%), Пессимистичный (-20%)</p>
    <button onClick={runCompare} disabled={loading} style={{padding:"12px 24px",borderRadius:8,border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontWeight:700}}>{loading?"Расчёт...":"Сравнить сценарии"}</button>
    {compare&&<div style={{marginTop:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{(compare.scenarios||compare).map((sc:any,i:number)=><Card key={i} title={sc.name||`Сценарий ${i+1}`}><Metric label="NPV" value={fmt(sc.npv||0)} color={sc.npv>0?C.success:C.error}/><Metric label="IRR" value={fmtP(sc.irr||sc.irr_pct/100||0)} color={C.primary}/><Metric label="PI" value={(sc.profitability_index||sc.pi||0).toFixed(2)}/></Card>)}</div>
      <Card title="NPV по сценариям"><ResponsiveContainer width="100%" height={260}><BarChart data={(compare.scenarios||compare).map((sc:any)=>({name:sc.name,NPV:sc.npv}))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="NPV">{(compare.scenarios||compare).map((_:any,i:number)=><Cell key={i} fill={[C.primary,C.success,C.error][i%3]}/>)}</Bar></BarChart></ResponsiveContainer></Card>
    </div>}
  </div>;}

  function TabSens(){return <div>
    <p style={{color:C.muted,fontSize:14,marginBottom:12}}>Tornado Chart — влияние ±20% изменения каждой переменной на NPV</p>
    <button onClick={runSens} disabled={loading} style={{padding:"12px 24px",borderRadius:8,border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontWeight:700}}>{loading?"Расчёт...":"Анализ чувствительности"}</button>
    {sens&&<div style={{marginTop:16}}>
      {sens.tornado&&<Card title="Tornado Chart — NPV sensitivity ±20%"><ResponsiveContainer width="100%" height={300}><BarChart data={sens.tornado} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis type="category" dataKey="variable" width={120}/><Tooltip/><Bar dataKey="downside" fill={C.error} name="Downside"/><Bar dataKey="upside" fill={C.success} name="Upside"/><Legend/></BarChart></ResponsiveContainer></Card>}
      {sens.spider&&<Card title="Spider Chart"><ResponsiveContainer width="100%" height={320}><RadarChart data={sens.spider}><PolarGrid/><PolarAngleAxis dataKey="variable"/><PolarRadiusAxis angle={30}/><Radar name="NPV" dataKey="npv" stroke={C.primary} fill={C.primary} fillOpacity={0.3}/><Tooltip/></RadarChart></ResponsiveContainer></Card>}
      {sens.data_table&&<Card title="Two-Way Data Table"><div style={{overflowX:"auto"}}><table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}><thead><tr style={{background:C.primaryLight}}>{sens.data_table.headers?.map((h:string,i:number)=><th key={i} style={{padding:6,border:`1px solid ${C.border}`,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>{sens.data_table.rows?.map((row:any[],ri:number)=><tr key={ri}>{row.map((cell:any,ci:number)=><td key={ci} style={{padding:6,border:`1px solid ${C.border}`,textAlign:"right",background:typeof cell==="number"&&cell<0?C.errorBg:undefined}}>{typeof cell==="number"?fmt(cell):cell}</td>)}</tr>)}</tbody></table></div></Card>}
    </div>}
  </div>;}

  function TabMC(){return <div>
    <p style={{color:C.muted,fontSize:14,marginBottom:12}}>Monte Carlo — 10,000 итераций, σ(revenue)=15%, σ(costs)=10%, σ(rate)=2%</p>
    <button onClick={runMC} disabled={loading} style={{padding:"12px 24px",borderRadius:8,border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontWeight:700}}>{loading?"Симуляция...":"Запустить Monte Carlo"}</button>
    {mc&&<div style={{marginTop:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <Card><Metric label="Mean NPV" value={fmt(mc.mean_npv||0)} color={C.primary}/></Card>
        <Card><Metric label="P10" value={fmt(mc.p10||0)} color={C.error}/></Card>
        <Card><Metric label="P50 (Median)" value={fmt(mc.p50||0)} color={C.warning}/></Card>
        <Card><Metric label="P90" value={fmt(mc.p90||0)} color={C.success}/></Card>
        <Card><Metric label="P(NPV>0)" value={fmtP(mc.prob_positive||0)} color={mc.prob_positive>0.5?C.success:C.error}/></Card>
        <Card><Metric label="VaR 95%" value={fmt(mc.var_95||0)} color={C.error} sub="Worst 5%"/></Card>
        <Card><Metric label="CVaR (ES)" value={fmt(mc.cvar_95||0)} color={C.error} sub="Expected shortfall"/></Card>
        <Card><Metric label="Std Dev" value={fmt(mc.std_dev||0)}/></Card>
      </div>
      {mc.histogram&&<Card title="NPV Distribution (Histogram)"><ResponsiveContainer width="100%" height={280}><BarChart data={mc.histogram}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="bin"/><YAxis/><Tooltip/><Bar dataKey="count" fill={C.primary}>{mc.histogram.map((d:any,i:number)=><Cell key={i} fill={d.bin_value>=0?C.primary:C.error}/>)}</Bar></BarChart></ResponsiveContainer></Card>}
      {mc.cdf&&<Card title="CDF"><ResponsiveContainer width="100%" height={260}><AreaChart data={mc.cdf}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="npv"/><YAxis/><Tooltip/><Area dataKey="probability" stroke={C.purple} fill={C.purpleBg} name="CDF"/></AreaChart></ResponsiveContainer></Card>}
    </div>}
  </div>;}

  function TabBench(){return <div>
    <p style={{color:C.muted,fontSize:14,marginBottom:12}}>Сравнение NPV/IRR проекта с рыночными бенчмарками Узбекистана 2026</p>
    {bench?<div>
      <Card title="Рыночные ставки Узбекистан 2026"><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{bench.rates&&Object.entries(bench.rates).map(([k,v]:any)=><div key={k} style={{padding:10,background:C.primaryLight,borderRadius:8,textAlign:"center"}}><div style={{fontSize:12,color:C.muted}}>{k}</div><div style={{fontSize:18,fontWeight:700,color:C.text}}>{typeof v==="number"?v.toFixed(1)+"%":v}</div></div>)}</div></Card>
      {bench.comparison&&<Card title="Ваш проект vs Бенчмарки"><ResponsiveContainer width="100%" height={300}><BarChart data={bench.comparison}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Bar dataKey="your_project" fill={C.primary} name="Ваш проект"/><Bar dataKey="benchmark" fill={C.muted} name="Бенчмарк"/></BarChart></ResponsiveContainer></Card>}
    </div>:<p style={{color:C.muted}}>Сначала выполните DCF расчёт, затем бенчмарки подтянутся.</p>}
  </div>;}

  return <div className="p-6" style={{maxWidth:1200,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontSize:"1.75rem",fontWeight:700,color:C.text,margin:0}}>💰 Investment Calculator Pro</h1><p style={{color:C.muted,marginTop:6,fontSize:14}}>DCF · WACC CAPM · Monte-Carlo · Sensitivity · Бенчмарки Узбекистан 2026</p></div>
    <div style={{display:"flex",gap:4,marginBottom:20,background:C.card,borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>{TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"10px 8px",borderRadius:8,border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:tab===t?C.primary:"transparent",color:tab===t?"#fff":C.muted,transition:"all 0.2s"}}>{t}</button>)}</div>
    {error&&<div style={{padding:12,background:C.errorBg,borderRadius:8,border:`1px solid ${C.error}`,color:C.error,marginBottom:16}}>{error}</div>}
    {tab==="DCF & ROI"&&TabDCF()}
    {tab==="Сравнение"&&TabCompare()}
    {tab==="Чувствительность"&&TabSens()}
    {tab==="Монте-Карло"&&TabMC()}
    {tab==="Бенчмарки"&&TabBench()}
  </div>;
}
