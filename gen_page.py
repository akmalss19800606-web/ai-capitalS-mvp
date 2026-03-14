path = "frontend/app/market-analysis/page.tsx"

content = '''"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const OKED_SECTIONS = [
  {code:"A",name:"Сельское, лесное и рыбное хозяйство"},{code:"B",name:"Горнодобывающая промышленность"},
  {code:"C",name:"Обрабатывающая промышленность"},{code:"D",name:"Электроснабжение, газ, пар"},
  {code:"E",name:"Водоснабжение, канализация"},{code:"F",name:"Строительство"},
  {code:"G",name:"Оптовая и розничная торговля"},{code:"H",name:"Транспортировка и хранение"},
  {code:"I",name:"Гостиницы и рестораны"},{code:"J",name:"Информация и связь"},
  {code:"K",name:"Финансовая и страховая деятельность"},{code:"L",name:"Операции с недвижимостью"},
  {code:"M",name:"Профессиональная, научная деятельность"},{code:"N",name:"Административная деятельность"},
  {code:"O",name:"Государственное управление"},{code:"P",name:"Образование"},
  {code:"Q",name:"Здравоохранение"},{code:"R",name:"Искусство, развлечения и отдых"},
  {code:"S",name:"Прочие виды услуг"},{code:"T",name:"Деятельность домашних хозяйств"},
  {code:"U",name:"Деятельность экстерриториальных организаций"},
];
const REGIONS = [
  {id:"tashkent_city",name:"г. Ташкент"},{id:"tashkent_region",name:"Ташкентская область"},
  {id:"samarkand",name:"Самаркандская область"},{id:"fergana",name:"Ферганская область"},
  {id:"andijan",name:"Андижанская область"},{id:"namangan",name:"Наманганская область"},
  {id:"bukhara",name:"Бухарская область"},{id:"kashkadarya",name:"Кашкадарьинская область"},
  {id:"surkhandarya",name:"Сурхандарьинская область"},{id:"jizzakh",name:"Джизакская область"},
  {id:"syrdarya",name:"Сырдарьинская область"},{id:"navoi",name:"Навоийская область"},
  {id:"khorezm",name:"Хорезмская область"},{id:"karakalpakstan",name:"Республика Каракалпакстан"},
];
const SEZ_LIST = [
  {code:"NAVOIY",name:"СЭЗ Навои"},{code:"ANGREN",name:"СЭЗ Ангрен"},
  {code:"JIZZAKH",name:"СЭЗ Джизак"},{code:"URGUT",name:"СЭЗ Ургут"},
  {code:"GISSAR",name:"СЭЗ Гиссар"},{code:"IT_PARK",name:"IT Park Узбекистан"},
  {code:"BUKHARA",name:"СЭЗ Бухара"},{code:"KOKAND",name:"СЭЗ Коканд"},
  {code:"NUKUS",name:"СЭЗ Нукус-фарм"},
];
const STEPS=["1. Вид деятельности (ОКЭД)","2. Инвестиционные параметры","3. Финансовые допущения","4. Региональный контекст","5. Рынок и конкуренция","6. Юридическая форма и налоги","7. Риск-профиль"];
const TIPS=["Выберите вид деятельности по классификатору ОКЭД Узбекистана (21 секция A-U)","Объём инвестиций, валюта, горизонт, тип инвестиции и стадия проекта","Доля долга, ожидаемая ставка кредита, выручка и маржинальность за 1-й год","Регион, город, СЭЗ и индустриальная зона","Целевые рынки, ожидаемая доля, количество конкурентов","Форма собственности, налоговый режим, число сотрудников","Риск-профиль (1-10) и зависимость от импорта (%)"];
const C={bg:"#f8f8fc",card:"#ffffff",primary:"#3b82f6",primaryDark:"#2563eb",border:"#e2e8f0",text:"#1e293b",muted:"#64748b",success:"#22c55e",successBg:"#f0fdf4",warning:"#f59e0b",warningBg:"#fffbeb",error:"#ef4444",errorBg:"#fef2f2",infoBg:"#eff6ff"};

function apiCall(path:string,body?:any){
  const token=typeof window!=="undefined"?localStorage.getItem("token"):null;
  const opts:any={headers:{"Content-Type":"application/json",...(token?{Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwianRpIjoiMGI0MDhhODZlM2NhYjZlMDczN2RlMTFkMTI1NmJmZTBiNjlhZjZjZTlhOTAwMDNiODc4NGRmZjYwYjk4NjlhMiIsImV4cCI6MTc3MzUzMjIyNywidHlwZSI6ImFjY2VzcyJ9.XBW8Gb4kM1R_SQoK5z2BAJ0qWQ_VG1uEJ76e2VCLGWE}:{})}};
  if(body){opts.method="POST";opts.body=JSON.stringify(body);}
  return fetch(${API}/api/v1/market-analysis/reference/oked,opts).then(async r=>{if(!r.ok) throw new Error(await r.text());return r.json();});
}
function Label({text,tip}:{text:string;tip?:string}){
  return <label style={{display:"block",fontWeight:600,marginBottom:6,color:C.text,fontSize:14}}>{text}{tip&&<span title={tip} style={{cursor:"help",marginLeft:4,color:C.muted}}>\u24d8</span>}</label>;
}
function Sel({children,...p}:any){return <select {...p} style={{width:"100%",padding:"10px 12px",border:1px solid ,borderRadius:8,fontSize:14,background:"#fff",...(p.style||{})}}>{children}</select>;}
function Inp(p:any){return <input {...p} style={{width:"100%",padding:"10px 12px",border:1px solid ,borderRadius:8,fontSize:14,boxSizing:"border-box",...(p.style||{})}}/>;}
function Slider({value,onChange,min,max,step,label}:any){
  return <div><div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.muted,marginBottom:4}}><span>{label}</span><span style={{fontWeight:600,color:C.text}}>{value}</span></div>
    <input type="range" min={min} max={max} step={step||1} value={value} onChange={onChange} style={{width:"100%",accentColor:C.primary}}/></div>;
}
function Chip({active,onClick,children}:{active:boolean;onClick:()=>void;children:any}){
  return <button type="button" onClick={onClick} style={{padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",border:active?2px solid :1px solid ,background:active?C.infoBg:"#fff",color:active?C.primary:C.text}}>{children}</button>;
}

export default function MarketAnalysisPage(){
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(false);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState("");
  const [macro,setMacro]=useState<any>(null);
  const [provider,setProvider]=useState("groq");
  const [f,setF]=useState({
    oked_section:"J",oked_division:"62",oked_class:"",activity_description:"",
    investment_amount:"50000",investment_currency:"USD" as "USD"|"UZS",
    investment_horizon_years:5,investment_type:"greenfield",
    project_stage:"idea",funding_sources:["own"] as string[],
    debt_ratio_pct:30,expected_loan_rate_pct:22.8,
    expected_revenue_year1:"",expected_margin_pct:15,
    region:"tashkent_city",city_district:"",sez_code:"",industrial_zone:"",
    target_markets:["domestic"] as string[],expected_market_share_pct:5,
    competitors_range:"4-10",
    legal_form:"ooo",tax_regime:"general",planned_employees:10,
    risk_profile:5,import_dependency_pct:30,
  });
  const s=(k:string,v:any)=>setF(prev=>({...prev,[k]:v}));
  const toggle=(key:string,val:string)=>{const arr=(f as any)[key] as string[];s(key,arr.includes(val)?arr.filter((x:string)=>x!==val):[...arr,val]);};

  useEffect(()=>{
    apiCall("/reference/macro").then(d=>{
      setMacro({policy_rate_pct:d.cb_rate?.value||14,inflation_cpi_pct:d.inflation?.value||7.2,usd_uzs_rate:d.usd_uzs?.value||12850,gdp_growth_pct:d.gdp_growth?.value||6.5,tsmi_index:d.tsmi?.value||843.5,lending_rate:d.lending_rate?.value||22.8});
    }).catch(()=>setMacro({policy_rate_pct:14,inflation_cpi_pct:7.2,usd_uzs_rate:12850,gdp_growth_pct:6.5,tsmi_index:843.5,lending_rate:22.8}));
  },[]);

  async function submit(){
    setLoading(true);setError("");setResult(null);setProgress(10);
    const iv=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*8,90)),800);
    try{
      const body={...f,investment_amount:parseFloat(f.investment_amount)||50000,expected_revenue_year1:f.expected_revenue_year1?parseFloat(f.expected_revenue_year1):null,provider};
      const data=await apiCall("/uz-market/generate-report",body);
      setProgress(100);setResult(data);
    }catch(e:any){setError(e.message||"Ошибка генерации");}
    finally{clearInterval(iv);setLoading(false);}
  }
  async function exportFmt(fmt:string){
    if(!result)return;
    try{const token=localStorage.getItem("token");
      const r=await fetch(${API}/uz-market/reports//,{headers:{...(token?{Authorization:Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0IiwianRpIjoiMGI0MDhhODZlM2NhYjZlMDczN2RlMTFkMTI1NmJmZTBiNjlhZjZjZTlhOTAwMDNiODc4NGRmZjYwYjk4NjlhMiIsImV4cCI6MTc3MzUzMjIyNywidHlwZSI6ImFjY2VzcyJ9.XBW8Gb4kM1R_SQoK5z2BAJ0qWQ_VG1uEJ76e2VCLGWE}:{})}});
      if(!r.ok)throw new Error("Экспорт недоступен");
      const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=market-report.;a.click();URL.revokeObjectURL(url);
    }catch{alert(Экспорт в  пока недоступен на сервере);}
  }
  const recColor=(r:string)=>r==="invest"?C.success:r==="hold"?C.warning:C.error;
  const recLabel=(r:string)=>r==="invest"?"\u2705 Invest":r==="hold"?"\u26a0\ufe0f Hold":"\u274c Avoid";
  const g2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"} as const;

  /* --- Сводка запроса (ТЗ: Превью «Ваш запрос» в боковой панели) --- */
  function renderSummary(){
    const oked=OKED_SECTIONS.find(o=>o.code===f.oked_section);
    const reg=REGIONS.find(r=>r.id===f.region);
    const sez=SEZ_LIST.find(z=>z.code===f.sez_code);
    const items=[
      {label:"ОКЭД",value:${f.oked_section} },
      {label:"Сумма",value:${Number(f.investment_amount).toLocaleString()} },
      {label:"Горизонт",value:${f.investment_horizon_years} лет},
      {label:"Тип",value:f.investment_type},
      {label:"Стадия",value:f.project_stage},
      {label:"Финансирование",value:f.funding_sources.join(", ")},
      {label:"Долг",value:${f.debt_ratio_pct}%},
      {label:"Ставка кредита",value:${f.expected_loan_rate_pct}%},
      {label:"Выручка 1г",value:f.expected_revenue_year1?${Number(f.expected_revenue_year1).toLocaleString()} :"—"},
      {label:"Маржа",value:${f.expected_margin_pct}%},
      {label:"Регион",value:reg?.name||f.region},
      {label:"СЭЗ",value:sez?.name||"Нет"},
      {label:"Рынки",value:f.target_markets.map(m=>m==="domestic"?"Внутренний":m==="cis_export"?"СНГ":"Глобальный").join(", ")},
      {label:"Доля рынка",value:${f.expected_market_share_pct}%},
      {label:"Конкуренты",value:f.competitors_range},
      {label:"Форма",value:f.legal_form.toUpperCase()},
      {label:"Налоги",value:f.tax_regime==="general"?"Общий 15%":f.tax_regime==="simplified"?"Упрощённый 4%":"СЭЗ 0%"},
      {label:"Сотрудники",value:String(f.planned_employees)},
      {label:"Риск",value:${f.risk_profile}/10},
      {label:"Импорт",value:${f.import_dependency_pct}%},
    ];
    return <div style={{background:C.card,borderRadius:12,border:1px solid ,padding:"1rem",position:"sticky",top:16}}>
      <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700,color:C.primary}}>📋 Сводка запроса</h3>
      {items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<items.length-1?1px solid :"none"}}>
        <span style={{fontSize:12,color:C.muted}}>{it.label}</span>
        <span style={{fontSize:12,fontWeight:600,color:C.text,textAlign:"right",maxWidth:"60%"}}>{it.value}</span>
      </div>)}
    </div>;
  }

  function renderStep(){switch(step){
    case 0:return <div><div style={g2}>
      <div><Label text="Секция ОКЭД (Level 1) *" tip="21 секция A-U"/><Sel value={f.oked_section} onChange={(e:any)=>s("oked_section",e.target.value)}>{OKED_SECTIONS.map(o=><option key={o.code} value={o.code}>{o.code} — {o.name}</option>)}</Sel></div>
      <div><Label text="Подраздел (Level 2) *" tip="Двузначный код 01-99"/><Inp type="text" value={f.oked_division} onChange={(e:any)=>s("oked_division",e.target.value)} placeholder="62"/></div>
      <div><Label text="Класс (Level 3)" tip="Необязательно"/><Inp type="text" value={f.oked_class} onChange={(e:any)=>s("oked_class",e.target.value)} placeholder="62.01"/></div>
    </div><div style={{marginTop:16}}><Label text="Описание деятельности" tip="Макс. 500 символов"/><textarea value={f.activity_description} onChange={(e:any)=>s("activity_description",e.target.value)} maxLength={500} rows={3} placeholder="Опишите вашу деятельность..." style={{width:"100%",padding:10,border:1px solid ,borderRadius:8,fontSize:14,resize:"vertical"}}/></div></div>;
    case 1:return <div><div style={g2}>
      <div><Label text="Объём инвестиций *" tip="1,000 — 1,000,000,000"/><Inp type="number" value={f.investment_amount} onChange={(e:any)=>s("investment_amount",e.target.value)} min={1000} max={1000000000}/></div>
      <div><Label text="Валюта"/><Sel value={f.investment_currency} onChange={(e:any)=>s("investment_currency",e.target.value)}><option value="USD">USD</option><option value="UZS">UZS</option></Sel></div>
      <div><Label text="Горизонт (лет)" tip="1-30 лет"/><Slider value={f.investment_horizon_years} min={1} max={30} label="Горизонт" onChange={(e:any)=>s("investment_horizon_years",parseInt(e.target.value))}/></div>
      <div><Label text="Тип инвестиции"/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[["greenfield","Greenfield"],["expansion","Расширение"],["ma","M&A"],["franchise","Франшиза"]].map(([v,l])=><Chip key={v} active={f.investment_type===v} onClick={()=>s("investment_type",v)}>{l}</Chip>)}</div></div>
      <div><Label text="Стадия проекта"/><Sel value={f.project_stage} onChange={(e:any)=>s("project_stage",e.target.value)}><option value="idea">Идея</option><option value="business_plan">Бизнес-план</option><option value="launch">Запуск</option><option value="operating">Работает</option></Sel></div>
      <div><Label text="Источники финансирования" tip="Выберите один или несколько"/><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["own","Собственные"],["bank_loan","Банк. кредит"],["leasing","Лизинг"],["investor","Инвестор"],["grant","Грант"]].map(([v,l])=><Chip key={v} active={f.funding_sources.includes(v)} onClick={()=>toggle("funding_sources",v)}>{l}</Chip>)}</div></div>
    </div>{macro&&<div style={{marginTop:16,padding:12,background:C.infoBg,borderRadius:8,border:"1px solid #bae6fd"}}><p style={{margin:0,fontSize:13,color:"#0369a1"}}>\ud83d\udcca Макро: ЦБ ставка {macro.policy_rate_pct}% \u00b7 Инфляция {macro.inflation_cpi_pct}% \u00b7 USD/UZS {macro.usd_uzs_rate?.toLocaleString()} \u00b7 ВВП рост {macro.gdp_growth_pct}%</p></div>}</div>;
    case 2:return <div style={g2}>
      <div><Label text="Доля долга (%)" tip="0-90%"/><Slider value={f.debt_ratio_pct} min={0} max={90} label="Доля долга" onChange={(e:any)=>s("debt_ratio_pct",parseFloat(e.target.value))}/></div>
      <div><Label text="Ставка кредита (%)" tip="Текущая средняя 22.8%"/><Inp type="number" value={f.expected_loan_rate_pct} onChange={(e:any)=>s("expected_loan_rate_pct",parseFloat(e.target.value)||0)} min={5} max={40} step={0.1}/></div>
      <div><Label text="Выручка 1-й год" tip="Необязательно"/><Inp type="number" value={f.expected_revenue_year1} onChange={(e:any)=>s("expected_revenue_year1",e.target.value)} placeholder="0"/></div>
      <div><Label text="Маржинальность (%)" tip="-50% — 100%"/><Slider value={f.expected_margin_pct} min={-50} max={100} label="Маржа" onChange={(e:any)=>s("expected_margin_pct",parseFloat(e.target.value))}/></div>
    </div>;
    case 3:return <div style={g2}>
      <div><Label text="Регион Узбекистана *" tip="14 регионов"/><Sel value={f.region} onChange={(e:any)=>s("region",e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</Sel></div>
      <div><Label text="Город / район"/><Inp value={f.city_district} onChange={(e:any)=>s("city_district",e.target.value)} placeholder="Необязательно"/></div>
      <div><Label text="СЭЗ (свободная экон. зона)" tip="Из 49 СЭЗ Узбекистана"/><Sel value={f.sez_code} onChange={(e:any)=>s("sez_code",e.target.value)}><option value="">— Без СЭЗ —</option>{SEZ_LIST.map(z=><option key={z.code} value={z.code}>{z.name}</option>)}</Sel></div>
      <div><Label text="Индустриальная зона"/><Inp value={f.industrial_zone} onChange={(e:any)=>s("industrial_zone",e.target.value)} placeholder="Необязательно"/></div>
    </div>;
    case 4:return <div>
      <div style={{marginBottom:16}}><Label text="Целевые рынки *" tip="Выберите один или несколько"/><div style={{display:"flex",gap:8}}>{[["domestic","\ud83c\uddfa\ud83c\uddff Внутренний"],["cis_export","\ud83c\udf10 Экспорт СНГ"],["global_export","\ud83c\udf0d Глобальный экспорт"]].map(([v,l])=><button key={v} type="button" onClick={()=>toggle("target_markets",v)} style={{padding:"10px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",flex:1,border:f.target_markets.includes(v)?2px solid :1px solid ,background:f.target_markets.includes(v)?C.infoBg:"#fff",color:f.target_markets.includes(v)?C.primary:C.text}}>{l}</button>)}</div></div>
      <div style={g2}>
        <div><Label text="Ожидаемая доля рынка (%)" tip="0.1-50%"/><Slider value={f.expected_market_share_pct} min={0.1} max={50} step={0.1} label="Доля рынка" onChange={(e:any)=>s("expected_market_share_pct",parseFloat(e.target.value))}/></div>
        <div><Label text="Кол-во конкурентов"/><div style={{display:"flex",gap:8}}>
          {["0-3","4-10","11-50","50+"].map(v=><Chip key={v} active={f.competitors_range===v} onClick={()=>s("competitors_range",v)}>{v}</Chip>)}</div></div>
      </div></div>;
    case 5:return <div style={g2}>
      <div><Label text="Правовая форма *"/><Sel value={f.legal_form} onChange={(e:any)=>s("legal_form",e.target.value)}><option value="ip">ИП</option><option value="ooo">ООО</option><option value="ao">АО</option><option value="farmer">Фермерское хозяйство</option><option value="family">Семейное предприятие</option></Sel></div>
      <div><Label text="Налоговый режим" tip="Общий 15%, Упрощённый 4%, СЭЗ 0%"/><div style={{display:"flex",gap:8}}>{[["general","Общий (15%)"],["simplified","Упрощённый (4%)"],["sez","СЭЗ (0%)"]].map(([v,l])=><Chip key={v} active={f.tax_regime===v} onClick={()=>s("tax_regime",v)}>{l}</Chip>)}</div></div>
      <div><Label text="Кол-во сотрудников" tip="1-10,000"/><Inp type="number" value={f.planned_employees} onChange={(e:any)=>s("planned_employees",parseInt(e.target.value)||1)} min={1} max={10000}/></div>
    </div>;
    case 6:return <div style={g2}>
      <div><Label text="Риск-профиль" tip="1=консервативный, 10=агрессивный"/><Slider value={f.risk_profile} min={1} max={10} label="Риск-профиль" onChange={(e:any)=>s("risk_profile",parseInt(e.target.value))}/></div>
      <div><Label text="Зависимость от импорта (%)" tip="0-100%"/><Slider value={f.import_dependency_pct} min={0} max={100} label="Импортозависимость" onChange={(e:any)=>s("import_dependency_pct",parseFloat(e.target.value))}/></div>
    </div>;
  }}

  function renderReport(){
    if(!result)return null;
    const rec=result.recommendation||result.report?.recommendation||"";
    const score=result.confidence_score??result.report?.confidence_score??0;
    const sections=result.sections||result.report?.sections||result.blocks||[];
    const summary=result.executive_summary||result.report?.executive_summary||"";
    const sez=result.sez_benefits||result.report?.sez_benefits;
    const macroCtx=result.macro_context||result.report?.macro_context;
    return <div style={{marginTop:24}}>
      <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:20,padding:16,background:C.card,borderRadius:12,border:1px solid }}>
        <div style={{padding:"12px 24px",borderRadius:12,background:rec==="invest"?C.successBg:rec==="hold"?C.warningBg:C.errorBg,border:2px solid ,fontWeight:700,fontSize:18,color:recColor(rec)}}>{recLabel(rec)}</div>
        <div><div style={{fontSize:14,color:C.muted}}>Confidence Score</div><div style={{fontSize:28,fontWeight:700,color:C.text}}>{score.toFixed?score.toFixed(1):score}%</div></div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:8}}>{["pdf","docx","xlsx","md"].map(fmt=><button key={fmt} onClick={()=>exportFmt(fmt)} style={{padding:"8px 16px",borderRadius:8,border:1px solid ,background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>\ud83d\udcc4 {fmt.toUpperCase()}</button>)}</div>
      </div>
      {macroCtx&&<div style={{padding:12,background:C.infoBg,borderRadius:8,border:"1px solid #bae6fd",marginBottom:16}}><p style={{margin:0,fontSize:13,color:"#0369a1"}}>\ud83d\udcca ВВП: {macroCtx.gdp_growth_pct}% \u00b7 ЦБ: {macroCtx.policy_rate_pct}% \u00b7 CPI: {macroCtx.inflation_cpi_pct}% \u00b7 USD/UZS: {macroCtx.usd_uzs_rate?.toLocaleString()}</p></div>}
      {summary&&<div style={{padding:16,background:"#faf5ff",borderRadius:12,border:"1px solid #d8b4fe",marginBottom:16}}><h3 style={{margin:"0 0 8px",fontSize:16,color:"#7c3aed"}}>Executive Summary</h3><p style={{margin:0,fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{summary}</p></div>}
      {sez&&<div style={{padding:12,background:C.successBg,borderRadius:8,border:"1px solid #86efac",marginBottom:16}}><strong style={{color:"#15803d"}}>СЭЗ: {sez.sez_name}</strong><p style={{margin:"4px 0 0",fontSize:13,color:C.text}}>{sez.tax_exemptions?.join(" \u00b7 ")}</p></div>}
      {Array.isArray(sections)&&sections.map((sec:any,i:number)=><div key={i} style={{marginBottom:12,padding:16,background:C.card,borderRadius:12,border:1px solid }}><h3 style={{margin:"0 0 8px",fontSize:15,color:C.primary}}>{sec.number||i+1}. {sec.title}</h3><div style={{fontSize:14,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{sec.content}</div></div>)}
      <div style={{padding:12,background:"#fef9c3",borderRadius:8,border:"1px solid #fde047",marginTop:16}}><p style={{margin:0,fontSize:12,color:"#854d0e"}}>\u26a0\ufe0f Данный отчёт сгенерирован AI и носит информационный характер. Перед принятием инвестиционных решений рекомендуется консультация с профессиональными финансовыми советниками.</p></div>
      <details style={{marginTop:12}}><summary style={{cursor:"pointer",color:C.muted,fontSize:13}}>Показать JSON</summary><pre style={{background:"#1e293b",color:"#e2e8f0",borderRadius:8,padding:12,overflow:"auto",fontSize:12,marginTop:8}}>{JSON.stringify(result,null,2)}</pre></details>
    </div>;
  }

  return <div style={{minHeight:"100vh",background:C.bg,padding:"2rem 1rem"}}><div style={{maxWidth:1200,margin:"0 auto"}}>
    <div style={{marginBottom:24}}><h1 style={{fontSize:"1.75rem",fontWeight:700,color:C.text,margin:0}}>\ud83c\uddfa\ud83c\uddff Анализ рынка Узбекистана</h1><p style={{color:C.muted,marginTop:6,fontSize:14}}>Детальный AI-анализ отрасли по 7 блокам (25 полей) \u2192 12-секционный инвестиционный отчёт</p></div>
    {macro&&<div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>{[{label:"ЦБ ставка",value:${macro.policy_rate_pct}%,icon:"\ud83c\udfe6"},{label:"Инфляция (CPI)",value:${macro.inflation_cpi_pct}%,icon:"\ud83d\udcc8"},{label:"USD/UZS",value:macro.usd_uzs_rate?.toLocaleString(),icon:"\ud83d\udcb1"},{label:"ВВП рост",value:${macro.gdp_growth_pct}%,icon:"\ud83d\udcca"},{label:"TSMI",value:macro.tsmi_index,icon:"\ud83d\udd22"}].map((m,i)=><div key={i} style={{flex:1,minWidth:140,padding:12,background:C.card,borderRadius:10,border:1px solid ,textAlign:"center"}}><div style={{fontSize:20}}>{m.icon}</div><div style={{fontSize:12,color:C.muted,marginTop:4}}>{m.label}</div><div style={{fontSize:18,fontWeight:700,color:C.text}}>{m.value}</div></div>)}</div>}
    <div style={{display:"flex",gap:4,marginBottom:20}}>{STEPS.map((_,i)=><div key={i} style={{flex:1,height:6,borderRadius:3,background:i<=step?C.primary:C.border,transition:"background 0.3s"}}/>)}</div>
    <div style={{display:"flex",gap:24}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{STEPS[step]}</div><div style={{fontSize:13,color:C.muted}}>Шаг {step+1} из 7</div></div>
        <div style={{padding:10,background:C.infoBg,borderRadius:8,border:"1px solid #bae6fd",marginBottom:16}}><p style={{margin:0,fontSize:13,color:"#0369a1"}}>\ud83d\udca1 {TIPS[step]}</p></div>
        <div style={{background:C.card,borderRadius:12,border:1px solid ,padding:"1.5rem",marginBottom:16}}>{renderStep()}</div>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          {step>0&&<button onClick={()=>setStep(step-1)} disabled={loading} style={{padding:"12px 24px",borderRadius:8,border:1px solid ,background:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>\u2190 Назад</button>}
          {step<6&&<button onClick={()=>setStep(step+1)} style={{padding:"12px 24px",borderRadius:8,border:"none",background:C.primary,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:600}}>Далее \u2192</button>}
          {step===6&&<button onClick={submit} disabled={loading} style={{padding:"12px 32px",borderRadius:8,border:"none",background:loading?C.muted:"#10b981",color:"#fff",cursor:loading?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>{loading?"Генерация AI-отчёта...":"\ud83d\ude80 Создать AI-отчёт"}</button>}
          <div style={{flex:1}}/><Sel value={provider} onChange={(e:any)=>setProvider(e.target.value)} style={{width:180}}><option value="groq">Groq (быстро)</option><option value="perplexity">Perplexity (глубже)</option></Sel>
        </div>
      </div>
      <div style={{width:280,flexShrink:0}}>{renderSummary()}</div>
    </div>
    {loading&&<div style={{marginTop:16}}><div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#3b82f6,#8b5cf6)",width:${progress}%,transition:"width 0.5s",borderRadius:4}}/></div><p style={{textAlign:"center",color:C.muted,fontSize:13,marginTop:8}}>AI анализирует данные... {progress.toFixed(0)}%</p></div>}
    {error&&<div style={{marginTop:16,padding:12,background:C.errorBg,borderRadius:8,border:1px solid ,color:C.error}}>{error}</div>}
    {result&&renderReport()}
  </div></div>;
}
'''

with open(path, 'w', encoding='utf-8', newline='\\n') as out:
    out.write(content)

print(f'Written {len(content)} chars to {path}')
