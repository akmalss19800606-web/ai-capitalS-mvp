/* eslint-disable */
"use client";
import React, { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface Org { id:number; name:string; mode:string }
interface BalanceSummary { total_assets:number; long_term_assets:number; current_assets:number; total_liabilities:number; total_equity:number; balance_check:boolean }

function getAuthHeaders(extra:any={}){const t=typeof window!=='undefined'?localStorage.getItem('token'):null;const h:any={'Content-Type':'application/json',...extra};if(t)h['Authorization']=`Bearer ${t}`;return h;}
const SCENARIOS = [
  {id:"devaluation", name:"Девальвация UZS", icon:"💱", desc:"Резкое обесценивание сума на 15-30%", factors:[
    {name:"Рост валютных обязательств (7810, 6810 в USD)", impact:-1},
    {name:"Переоценка валютных активов (5200, 0610)", impact:1},
    {name:"Удорожание импортного сырья (1010)", impact:-1},
  ]},
  {id:"rate_hike", name:"Рост ставки ЦБ", icon:"📈", desc:"Повышение ставки рефинансирования на 3-5%", factors:[
    {name:"Рост стоимости кредитов (6810, 7810)", impact:-1},
    {name:"Снижение стоимости облигаций (0610, 5810)", impact:-1},
    {name:"Рост доходности депозитов (5500)", impact:1},
  ]},
  {id:"market_crash", name:"Падение фондового рынка", icon:"📉", desc:"Снижение рынка ценных бумаг на 20-40%", factors:[
    {name:"Переоценка инвестпортфеля (0610, 5810)", impact:-1},
    {name:"Обесценение долей в дочерних (0620)", impact:-1},
    {name:"Снижение залоговой стоимости", impact:-1},
  ]},
  {id:"liquidity", name:"Кризис ликвидности", icon:"🏦", desc:"Резкий отток денежных средств", factors:[
    {name:"Снижение остатков (5000, 5100, 5200)", impact:-1},
    {name:"Рост дебиторки (4000, 4800)", impact:-1},
    {name:"Невозможность рефинансирования (6800)", impact:-1},
  ]},
  {id:"custom", name:"Пользовательский сценарий", icon:"⚙️", desc:"Настройте параметры вручную", factors:[]},
];

const SEVERITY = [
  {value:"mild", label:"Умеренный", pct:0.10, color:"yellow"},
  {value:"moderate", label:"Средний", pct:0.20, color:"orange"},
  {value:"severe", label:"Тяжёлый", pct:0.30, color:"red"},
  {value:"extreme", label:"Экстремальный", pct:0.50, color:"purple"},
];

export default function StressTestPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selectedOrg,setSelectedOrg]=useState<number|null>(null);
  const [balance,setBalance]=useState<BalanceSummary|null>(null);
  const [scenario,setScenario]=useState("devaluation");
  const [severity,setSeverity]=useState("moderate");
  const [running,setRunning]=useState(false);
  const [result,setResult]=useState<any>(null);
  const [periodDate]=useState(new Date().toISOString().split("T")[0]);

  useEffect(()=>{
    fetch(`${API}/organizations`,{headers:getAuthHeaders()}).then(r=>r.json()).then(d=>{if(Array.isArray(d))setOrgs(d)}).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(selectedOrg){
      fetch(`${API}/organizations/${selectedOrg}/balance/summary?period_date=${periodDate}`,{headers:getAuthHeaders()})
        .then(r=>r.json()).then(setBalance).catch(()=>setBalance(null));
    }
  },[selectedOrg]);

  const runStress=()=>{
    if(!balance)return;
    setRunning(true);
    const sev=SEVERITY.find(s=>s.value===severity);
    const pct=sev?.pct||0.2;
    const sc=SCENARIOS.find(s=>s.id===scenario);

    setTimeout(()=>{
      const stressed={
        scenario: sc?.name,
        severity: sev?.label,
        impact_pct: pct,
        original:{...balance},
        stressed:{
          total_assets: balance.total_assets*(1-pct*0.7),
          long_term_assets: balance.long_term_assets*(1-pct*0.5),
          current_assets: balance.current_assets*(1-pct*0.9),
          total_liabilities: balance.total_liabilities*(1+pct*0.3),
          total_equity: balance.total_equity*(1-pct*1.2),
        },
        ratios:{
          current_ratio_before: balance.current_assets/Math.max(balance.total_liabilities,1),
          current_ratio_after: (balance.current_assets*(1-pct*0.9))/Math.max(balance.total_liabilities*(1+pct*0.3),1),
          equity_ratio_before: balance.total_equity/Math.max(balance.total_assets,1),
          equity_ratio_after: (balance.total_equity*(1-pct*1.2))/Math.max(balance.total_assets*(1-pct*0.7),1),
          loss_amount: balance.total_assets*pct*0.7,
        },
        factors: sc?.factors||[],
      };
      setResult(stressed);
      setRunning(false);
    },1500);
  };

  const fmtNum=(n:number)=>new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(n);
  const fmtPct=(n:number)=>(n*100).toFixed(1)+"%";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔥 Стресс-тестирование</h1>
        <p className="text-gray-500 mb-6">Моделирование на реальных данных баланса организации</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-500 mb-2">Организация</label>
            <select value={selectedOrg||""} onChange={e=>setSelectedOrg(parseInt(e.target.value)||null)} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
              <option value="">Выберите...</option>
              {orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {balance&&(
              <div className="mt-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Активы:</span><span className="text-blue-400">{fmtNum(balance.total_assets)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Обязательства:</span><span className="text-red-400">{fmtNum(balance.total_liabilities)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Капитал:</span><span className="text-purple-400">{fmtNum(balance.total_equity)}</span></div>
              </div>
            )}
          </div>
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-500 mb-2">Сценарий</label>
            <div className="space-y-1">
              {SCENARIOS.map(s=>(
                <button key={s.id} onClick={()=>setScenario(s.id)} className={`w-full text-left px-3 py-1.5 rounded text-sm ${scenario===s.id?"bg-blue-600":"bg-gray-100 hover:bg-gray-100"}`}>{s.icon} {s.name}</button>
              ))}
            </div>
          </div>
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-500 mb-2">Тяжесть</label>
            <div className="space-y-2">
              {SEVERITY.map(s=>(
                <button key={s.value} onClick={()=>setSeverity(s.value)} className={`w-full text-left px-3 py-2 rounded text-sm ${severity===s.value?"bg-blue-600":"bg-gray-100 hover:bg-gray-100"}`}>
                  {s.label} (-{(s.pct*100)}%)
                </button>
              ))}
            </div>
            <button onClick={runStress} disabled={!balance||running} className="w-full mt-4 py-3 bg-red-600 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50">
              {running?"⏳ Моделирование...":"🔥 Запустить стресс-тест"}
            </button>
          </div>
        </div>

        {result&&(
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 Результат: {result.scenario} ({result.severity})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700 text-gray-500">
                  <th className="text-left py-2">Показатель</th><th className="text-right py-2">До стресса</th><th className="text-right py-2">После стресса</th><th className="text-right py-2">Изменение</th>
                </tr></thead>
                <tbody>
                  {[
                    {label:"Всего активов",before:result.original.total_assets,after:result.stressed.total_assets},
                    {label:"Долгосрочные активы",before:result.original.long_term_assets,after:result.stressed.long_term_assets},
                    {label:"Текущие активы",before:result.original.current_assets,after:result.stressed.current_assets},
                    {label:"Обязательства",before:result.original.total_liabilities,after:result.stressed.total_liabilities},
                    {label:"Собственный капитал",before:result.original.total_equity,after:result.stressed.total_equity},
                  ].map(row=>{
                    const change=row.after-row.before;
                    const pct=row.before?change/row.before:0;
                    return (
                      <tr key={row.label} className="border-b border-gray-800">
                        <td className="py-2">{row.label}</td>
                        <td className="text-right font-mono">{fmtNum(row.before)}</td>
                        <td className="text-right font-mono">{fmtNum(row.after)}</td>
                        <td className={`text-right font-mono ${change>=0?"text-green-400":"text-red-400"}`}>{change>=0?"+":""}{fmtPct(pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-500 text-sm">Текущая ликвидность</p>
                <p className="text-2xl font-bold">{result.ratios.current_ratio_before.toFixed(2)} → <span className={result.ratios.current_ratio_after<1?"text-red-400":"text-green-400"}>{result.ratios.current_ratio_after.toFixed(2)}</span></p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-gray-500 text-sm">Коэффициент автономии</p>
                <p className="text-2xl font-bold">{fmtPct(result.ratios.equity_ratio_before)} → <span className={result.ratios.equity_ratio_after<0.3?"text-red-400":"text-green-400"}>{fmtPct(result.ratios.equity_ratio_after)}</span></p>
              </div>
              <div className="p-4 bg-red-900/30 rounded-lg">
                <p className="text-gray-500 text-sm">Потенциальные убытки</p>
                <p className="text-2xl font-bold text-red-400">-{fmtNum(result.ratios.loss_amount)}</p>
              </div>
            </div>
            {result.factors.length>0&&(
              <div className="mt-6">
                <h3 className="font-bold mb-2">Факторы воздействия:</h3>
                {result.factors.map((f:any,i:number)=>(
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className={f.impact>0?"text-green-400":"text-red-400"}>{f.impact>0?"▲":"▼"}</span>
                    <span className="text-sm">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
