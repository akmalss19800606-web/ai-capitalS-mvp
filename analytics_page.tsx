"use client";
import {useState,useEffect,useCallback} from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
function getToken(){if(typeof window!=="undefined")return localStorage.getItem("access_token");return null;}
function authHeaders(){const t=getToken();return t?{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}:{"Content-Type":"application/json"};}

interface OLAPRecord {organization_id:number;organization_name:string;account_code:string;account_name:string;period:string;currency:string;debit:number;credit:number;balance:number;}
interface OLAPSummary {status:string;total_records?:number;total_organizations?:number;total_periods?:number;total_accounts?:number;first_period?:string;last_period?:string;message?:string;}
interface Org {id:number;name:string;mode:string;}

export default function AnalyticsPage(){
  const [summary,setSummary]=useState<OLAPSummary|null>(null);
  const [data,setData]=useState<OLAPRecord[]>([]);
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [loading,setLoading]=useState(false);
  const [etlRunning,setEtlRunning]=useState(false);
  const [etlResult,setEtlResult]=useState<string>("");
  // Фильтры
  const [filterOrg,setFilterOrg]=useState<number|0>(0);
  const [filterCode,setFilterCode]=useState("");
  const [filterPeriod,setFilterPeriod]=useState("");
  const [view,setView]=useState<"table"|"pivot"|"chart">("table");

  const loadSummary=useCallback(async()=>{
    try{const r=await fetch(`${API}/olap/summary`,{headers:authHeaders()});if(r.ok)setSummary(await r.json())}catch{}
  },[]);

  const loadOrgs=useCallback(async()=>{
    try{const r=await fetch(`${API}/organizations`,{headers:authHeaders()});if(r.ok)setOrgs(await r.json())}catch{}
  },[]);

  const queryData=async()=>{
    setLoading(true);
    try{
      const params=new URLSearchParams();
      if(filterOrg)params.set("organization_id",String(filterOrg));
      if(filterCode)params.set("account_code",filterCode);
      if(filterPeriod)params.set("period",filterPeriod);
      const r=await fetch(`${API}/olap/query?${params}`,{headers:authHeaders()});
      if(r.ok)setData(await r.json());
    }catch{}
    setLoading(false);
  };

  const runETL=async()=>{
    setEtlRunning(true);setEtlResult("");
    try{
      const r=await fetch(`${API}/olap/etl`,{method:"POST",headers:authHeaders()});
      if(r.ok){const d=await r.json();setEtlResult(`✅ ETL завершён: ${d.records_inserted} записей загружено из ${d.records_processed} организаций`);await loadSummary();await queryData()}
      else setEtlResult("❌ Ошибка ETL");
    }catch{setEtlResult("❌ Ошибка сети")}
    setEtlRunning(false);
  };

  useEffect(()=>{loadSummary();loadOrgs()},[loadSummary,loadOrgs]);

  // Агрегации для pivot
  const pivotByOrg=data.reduce<Record<string,{assets:number;liabilities:number;equity:number}>>((acc,r)=>{
    if(!acc[r.organization_name])acc[r.organization_name]={assets:0,liabilities:0,equity:0};
    const code=parseInt(r.account_code);
    if(code<6000)acc[r.organization_name].assets+=r.balance;
    else if(code<8300)acc[r.organization_name].liabilities+=r.balance;
    else acc[r.organization_name].equity+=r.balance;
    return acc;
  },{});

  // Группировка по разделам баланса
  const sectionTotals=data.reduce<Record<string,number>>((acc,r)=>{
    const code=parseInt(r.account_code);
    let section="";
    if(code<1000)section="I. Долгосрочные активы";
    else if(code<6000)section="II. Текущие активы";
    else if(code<8300)section="III. Обязательства";
    else section="IV. Собственный капитал";
    acc[section]=(acc[section]||0)+r.balance;
    return acc;
  },{});

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">📊 OLAP Аналитика</h1>
            <p className="text-gray-400 text-sm mt-1">Многомерный анализ: организация × счёт × период × валюта</p>
          </div>
          <button onClick={runETL} disabled={etlRunning} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            {etlRunning?"⏳ Обработка...":"🔄 Запустить ETL"}
          </button>
        </div>

        {etlResult&&<div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm">{etlResult}</div>}

        {/* Сводка */}
        {summary&&summary.status==="ok"?(
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-gray-400 text-xs">ЗАПИСЕЙ</div><div className="text-xl font-bold text-blue-400">{summary.total_records?.toLocaleString()}</div></div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-gray-400 text-xs">ОРГАНИЗАЦИЙ</div><div className="text-xl font-bold text-green-400">{summary.total_organizations}</div></div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-gray-400 text-xs">ПЕРИОДОВ</div><div className="text-xl font-bold text-purple-400">{summary.total_periods}</div></div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-gray-400 text-xs">СЧЕТОВ</div><div className="text-xl font-bold text-orange-400">{summary.total_accounts}</div></div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-gray-400 text-xs">ПЕРИОД</div><div className="text-sm font-bold text-gray-300">{summary.first_period} — {summary.last_period}</div></div>
          </div>
        ):(
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 mb-6 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-gray-400">OLAP-хранилище пусто</div>
            <div className="text-gray-500 text-sm mt-1">Создайте организации и заполните балансы, затем нажмите «Запустить ETL»</div>
          </div>
        )}

        {/* Фильтры */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <select value={filterOrg} onChange={e=>setFilterOrg(parseInt(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm">
              <option value={0}>Все организации</option>
              {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input value={filterCode} onChange={e=>setFilterCode(e.target.value)} placeholder="Счёт (0100, 58...)" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-40"/>
            <input value={filterPeriod} onChange={e=>setFilterPeriod(e.target.value)} placeholder="Период (2026-03)" className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm w-40"/>
            <button onClick={queryData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">{loading?"⏳":"🔍 Запросить"}</button>
            <div className="ml-auto flex gap-1">
              {(["table","pivot","chart"] as const).map(v=>(
                <button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded text-xs font-medium ${view===v?"bg-blue-600":"bg-gray-700 hover:bg-gray-600"}`}>{v==="table"?"📋 Таблица":v==="pivot"?"📊 Сводная":"📈 График"}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Данные */}
        {data.length>0?(
          <>
            {view==="table"&&(
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-700/50 text-gray-300 text-xs"><th className="text-left p-3">Организация</th><th className="text-left p-3">Счёт</th><th className="text-left p-3">Наименование</th><th className="text-left p-3">Период</th><th className="text-right p-3">Дебет</th><th className="text-right p-3">Кредит</th><th className="text-right p-3 font-bold">Сальдо</th></tr></thead>
                  <tbody>{data.slice(0,100).map((r,i)=>(
                    <tr key={i} className="border-t border-gray-700/30 hover:bg-gray-700/20">
                      <td className="p-3">{r.organization_name}</td>
                      <td className="p-3 font-mono text-blue-400">{r.account_code}</td>
                      <td className="p-3 text-gray-300">{r.account_name}</td>
                      <td className="p-3 text-gray-400">{r.period}</td>
                      <td className="p-3 text-right">{r.debit?r.debit.toLocaleString():"—"}</td>
                      <td className="p-3 text-right">{r.credit?r.credit.toLocaleString():"—"}</td>
                      <td className="p-3 text-right font-bold">{r.balance.toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {data.length>100&&<div className="p-3 text-center text-gray-400 text-sm">Показано 100 из {data.length} записей</div>}
              </div>
            )}

            {view==="pivot"&&(
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold mb-4">📊 Сводная таблица по организациям</h3>
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-700/50 text-gray-300 text-xs"><th className="text-left p-3">Организация</th><th className="text-right p-3">Активы</th><th className="text-right p-3">Обязательства</th><th className="text-right p-3">Капитал</th><th className="text-right p-3">Чистые активы</th></tr></thead>
                  <tbody>{Object.entries(pivotByOrg).map(([name,v],i)=>(
                    <tr key={i} className="border-t border-gray-700/30">
                      <td className="p-3 font-medium">{name}</td>
                      <td className="p-3 text-right text-green-400">{v.assets.toLocaleString()}</td>
                      <td className="p-3 text-right text-red-400">{v.liabilities.toLocaleString()}</td>
                      <td className="p-3 text-right text-blue-400">{v.equity.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold">{(v.assets-v.liabilities).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {/* Разделы баланса */}
                <h3 className="font-semibold mb-3 mt-6">📋 По разделам баланса</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(sectionTotals).map(([sec,total],i)=>(
                    <div key={i} className="bg-gray-700/30 p-4 rounded-lg">
                      <div className="text-xs text-gray-400">{sec}</div>
                      <div className="text-lg font-bold mt-1">{total.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view==="chart"&&(
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h3 className="font-semibold mb-4">📈 Визуализация данных</h3>
                {/* Waterfall — изменения по разделам */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Каскадная диаграмма (Waterfall)</h4>
                  <div className="flex items-end gap-2 h-60">
                    {Object.entries(sectionTotals).map(([sec,total],i)=>{
                      const maxVal=Math.max(...Object.values(sectionTotals).map(Math.abs));
                      const height=maxVal>0?Math.abs(total)/maxVal*200:0;
                      const isNeg=total<0;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className="text-xs font-bold mb-1">{total.toLocaleString()}</div>
                          <div style={{height:`${height}px`}} className={`w-full rounded-t-lg ${isNeg?"bg-red-500":"bg-green-500"}`}></div>
                          <div className="text-xs text-gray-400 mt-2 text-center leading-tight">{sec.replace(/^[IV]+\.\s*/,"")}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Bubble — организации */}
                {Object.keys(pivotByOrg).length>1&&(
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Пузырьковая диаграмма — организации</h4>
                    <div className="relative h-64 bg-gray-700/20 rounded-lg p-4">
                      {Object.entries(pivotByOrg).map(([name,v],i)=>{
                        const maxAssets=Math.max(...Object.values(pivotByOrg).map(x=>x.assets));
                        const maxEquity=Math.max(...Object.values(pivotByOrg).map(x=>Math.abs(x.equity)));
                        const x=maxAssets>0?v.assets/maxAssets*80+5:50;
                        const y=maxEquity>0?Math.abs(v.equity)/maxEquity*70+5:50;
                        const size=Math.max(30,Math.min(80,v.assets/Math.max(maxAssets,1)*80));
                        return (
                          <div key={i} style={{left:`${x}%`,bottom:`${y}%`,width:`${size}px`,height:`${size}px`}} className="absolute rounded-full bg-blue-500/40 border-2 border-blue-400 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" title={`${name}: Активы ${v.assets.toLocaleString()}, Капитал ${v.equity.toLocaleString()}`}>
                            <span className="text-[10px] font-medium text-center leading-tight">{name.slice(0,8)}</span>
                          </div>
                        );
                      })}
                      <div className="absolute bottom-0 left-0 text-xs text-gray-500">Активы →</div>
                      <div className="absolute top-0 left-0 text-xs text-gray-500 transform -rotate-90 origin-bottom-left">Капитал →</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ):(
          summary?.status==="ok"&&<div className="text-center text-gray-400 py-8">Нажмите «Запросить» для получения данных из OLAP-хранилища</div>
        )}
      </div>
    </div>
  );
}
