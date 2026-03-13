"use client";
import {useState,useEffect,useCallback} from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
function getToken(){if(typeof window!=="undefined")return localStorage.getItem("access_token");return null;}
function authHeaders(){const t=getToken();return t?{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}:{"Content-Type":"application/json"};}

interface Org {id:number;name:string;mode:string;parent_id?:number|null;}
interface BalanceEntry {account_code:string;account_name:string;debit:number;credit:number;balance:number;}

const COLORS=["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#f97316"];

export default function VisualizationsPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selectedOrg,setSelectedOrg]=useState<number>(0);
  const [balance,setBalance]=useState<BalanceEntry[]>([]);
  const [childBalances,setChildBalances]=useState<{name:string;balance:BalanceEntry[]}[]>([]);
  const [tab,setTab]=useState<"waterfall"|"tornado"|"bubble"|"heatmap">("waterfall");
  const [loading,setLoading]=useState(false);

  const loadOrgs=useCallback(async()=>{
    try{const r=await fetch(`${API}/organizations`,{headers:authHeaders()});if(r.ok)setOrgs(await r.json())}catch{}
  },[]);

  useEffect(()=>{loadOrgs()},[loadOrgs]);

  const loadData=async(orgId:number)=>{
    setLoading(true);
    try{
      // Баланс выбранной
      const r=await fetch(`${API}/organizations/${orgId}/balance`,{headers:authHeaders()});
      if(r.ok)setBalance(await r.json());else setBalance([]);

      // Балансы дочерних
      const children=orgs.filter(o=>o.parent_id===orgId);
      const cb:typeof childBalances=[];
      for(const ch of children){
        const cr=await fetch(`${API}/organizations/${ch.id}/balance`,{headers:authHeaders()});
        if(cr.ok)cb.push({name:ch.name,balance:await cr.json()});
      }
      setChildBalances(cb);
    }catch{}
    setLoading(false);
  };

  useEffect(()=>{if(selectedOrg)loadData(selectedOrg)},[selectedOrg]);

  // Расчёты
  const calcSection=(entries:BalanceEntry[],from:number,to:number)=>entries.filter(e=>{const c=parseInt(e.account_code);return c>=from&&c<to}).reduce((s,e)=>s+e.balance,0);
  const longTermAssets=calcSection(balance,0,1000);
  const currentAssets=calcSection(balance,1000,6000);
  const liabilities=calcSection(balance,6000,8300);
  const equity=calcSection(balance,8300,10000);
  const totalAssets=longTermAssets+currentAssets;
  const netAssets=totalAssets-liabilities;

  // Для Tornado — чувствительность
  const tornadoFactors=[
    {factor:"Курс UZS/USD ±10%", accounts:["5200","5500"], positive:calcSection(balance,5200,5600)*0.1, negative:-calcSection(balance,5200,5600)*0.1},
    {factor:"Ставка ЦБ ±2%", accounts:["6800","7800"], positive:calcSection(balance,6800,7900)*0.02, negative:-calcSection(balance,6800,7900)*0.02},
    {factor:"Цены на сырьё ±15%", accounts:["1000"], positive:calcSection(balance,1000,2000)*0.15, negative:-calcSection(balance,1000,2000)*0.15},
    {factor:"Дебиторка невозврат 5%", accounts:["4000"], positive:0, negative:-calcSection(balance,4000,5000)*0.05},
    {factor:"Рост выручки ±20%", accounts:["8700"], positive:calcSection(balance,8700,8800)*0.2, negative:-calcSection(balance,8700,8800)*0.2},
  ];

  const maxTornado=Math.max(...tornadoFactors.map(f=>Math.max(Math.abs(f.positive),Math.abs(f.negative))),1);

  // Heatmap данные — по дочерним
  const heatmapMetrics=["Активы","Обязательства","Ликвидность","Рентабельность"];
  const heatmapData=childBalances.map(ch=>{
    const assets=ch.balance.reduce((s,e)=>parseInt(e.account_code)<6000?s+e.balance:s,0);
    const liab=ch.balance.reduce((s,e)=>{const c=parseInt(e.account_code);return c>=6000&&c<8300?s+e.balance:s},0);
    const currAssets=ch.balance.reduce((s,e)=>{const c=parseInt(e.account_code);return c>=1000&&c<6000?s+e.balance:s},0);
    const currLiab=ch.balance.reduce((s,e)=>{const c=parseInt(e.account_code);return c>=6000&&c<7000?s+e.balance:s},0);
    const liquidity=currLiab>0?currAssets/currLiab:0;
    const profitability=assets>0?(assets-liab)/assets*100:0;
    return {name:ch.name,values:[assets,liab,liquidity,profitability]};
  });

  const org=orgs.find(o=>o.id===selectedOrg);
  const hasData=balance.length>0&&balance.some(b=>b.balance!==0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">📈 Расширенные визуализации</h1>
            <p className="text-gray-400 text-sm mt-1">VIS-CHART-001 — Waterfall, Tornado, Bubble, Heatmap на реальных данных баланса</p>
          </div>
          <select value={selectedOrg} onChange={e=>{setSelectedOrg(parseInt(e.target.value))}} className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm">
            <option value={0}>Выберите организацию</option>
            {orgs.filter(o=>!o.parent_id).map(o=><option key={o.id} value={o.id}>{o.name} ({o.mode})</option>)}
          </select>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-6">
          {([["waterfall","📊 Waterfall"],["tornado","🌪 Tornado"],["bubble","⭕ Bubble"],["heatmap","🔥 Heatmap"]] as const).map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${tab===id?"bg-blue-600":"bg-gray-800 hover:bg-gray-700"}`}>{label}</button>
          ))}
        </div>

        {!selectedOrg?(
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold">Выберите организацию</h3>
            <p className="text-gray-400 text-sm mt-1">Для построения визуализаций на реальных данных баланса</p>
          </div>
        ):loading?(
          <div className="text-center py-20 text-gray-400">⏳ Загрузка данных...</div>
        ):!hasData?(
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold">Баланс пуст</h3>
            <p className="text-gray-400 text-sm mt-1">Заполните баланс организации в разделе «Портфели», затем вернитесь сюда</p>
          </div>
        ):(
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            {/* WATERFALL */}
            {tab==="waterfall"&&(
              <div>
                <h3 className="font-semibold mb-1">Каскадная диаграмма изменений чистых активов</h3>
                <p className="text-gray-400 text-xs mb-6">{org?.name} — структура баланса по разделам НСБУ</p>
                <div className="flex items-end gap-4 h-72 px-4">
                  {[
                    {label:"Долгосрочные\nактивы",value:longTermAssets,color:"bg-blue-500"},
                    {label:"Текущие\nактивы",value:currentAssets,color:"bg-green-500"},
                    {label:"Обязательства",value:-liabilities,color:"bg-red-500"},
                    {label:"Собственный\nкапитал",value:equity,color:"bg-purple-500"},
                    {label:"Чистые\nактивы",value:netAssets,color:"bg-blue-600"},
                  ].map((item,i)=>{
                    const maxVal=Math.max(totalAssets,liabilities,equity,Math.abs(netAssets),1);
                    const h=Math.abs(item.value)/maxVal*220;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div className={`text-xs font-bold mb-1 ${item.value<0?"text-red-400":"text-white"}`}>{item.value.toLocaleString()}</div>
                        <div style={{height:`${Math.max(h,4)}px`}} className={`w-full rounded-t-lg ${item.color} ${item.value<0?"opacity-70":""}`}></div>
                        <div className="text-xs text-gray-400 mt-2 text-center whitespace-pre-line leading-tight">{item.label}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Легенда */}
                <div className="flex gap-4 mt-6 justify-center">
                  <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 bg-green-500 rounded"></div>Рост</div>
                  <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 bg-red-500 rounded"></div>Снижение</div>
                  <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 bg-blue-600 rounded"></div>Итого</div>
                </div>
              </div>
            )}

            {/* TORNADO */}
            {tab==="tornado"&&(
              <div>
                <h3 className="font-semibold mb-1">Диаграмма чувствительности (Tornado)</h3>
                <p className="text-gray-400 text-xs mb-6">{org?.name} — влияние макрофакторов на баланс</p>
                <div className="space-y-3">
                  {tornadoFactors.map((f,i)=>(
                    <div key={i} className="grid grid-cols-12 items-center gap-2">
                      <div className="col-span-3 text-sm text-right text-gray-300">{f.factor}</div>
                      <div className="col-span-9 flex items-center">
                        {/* Отрицательная часть */}
                        <div className="w-1/2 flex justify-end pr-1">
                          <div style={{width:`${Math.abs(f.negative)/maxTornado*100}%`}} className="h-8 bg-red-500/70 rounded-l flex items-center justify-start px-2">
                            {f.negative!==0&&<span className="text-xs font-medium text-white">{f.negative.toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="w-px h-10 bg-gray-500"></div>
                        {/* Положительная часть */}
                        <div className="w-1/2 pl-1">
                          <div style={{width:`${Math.abs(f.positive)/maxTornado*100}%`}} className="h-8 bg-green-500/70 rounded-r flex items-center justify-end px-2">
                            {f.positive!==0&&<span className="text-xs font-medium text-white">+{f.positive.toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 justify-center text-xs">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded"></div>Негативный сценарий</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded"></div>Позитивный сценарий</div>
                </div>
              </div>
            )}

            {/* BUBBLE */}
            {tab==="bubble"&&(
              <div>
                <h3 className="font-semibold mb-1">Пузырьковая диаграмма</h3>
                <p className="text-gray-400 text-xs mb-6">{org?.name} — {childBalances.length>0?"дочерние/филиалы":"структура активов"}: X = размер актива, Y = доля в балансе</p>
                {childBalances.length>0?(
                  <div className="relative h-80 bg-gray-700/20 rounded-lg border border-gray-600/30">
                    {childBalances.map((ch,i)=>{
                      const assets=ch.balance.reduce((s,e)=>parseInt(e.account_code)<6000?s+e.balance:s,0);
                      const eq=ch.balance.reduce((s,e)=>parseInt(e.account_code)>=8300?s+e.balance:s,0);
                      const maxA=Math.max(...childBalances.map(c=>c.balance.reduce((s,e)=>parseInt(e.account_code)<6000?s+e.balance:s,0)),1);
                      const maxE=Math.max(...childBalances.map(c=>Math.abs(c.balance.reduce((s,e)=>parseInt(e.account_code)>=8300?s+e.balance:s,0))),1);
                      const x=10+assets/maxA*75;
                      const y=10+Math.abs(eq)/maxE*70;
                      const size=Math.max(40,Math.min(100,assets/maxA*100));
                      return (
                        <div key={i} style={{left:`${x}%`,bottom:`${y}%`,width:`${size}px`,height:`${size}px`,backgroundColor:COLORS[i%COLORS.length]+"66",borderColor:COLORS[i%COLORS.length]}} className="absolute rounded-full border-2 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer" title={`${ch.name}\nАктивы: ${assets.toLocaleString()}\nКапитал: ${eq.toLocaleString()}`}>
                          <span className="text-[9px] font-medium text-center leading-tight px-1">{ch.name.slice(0,10)}</span>
                        </div>
                      );
                    })}
                    <div className="absolute bottom-2 right-4 text-xs text-gray-500">Активы →</div>
                    <div className="absolute top-2 left-2 text-xs text-gray-500">↑ Капитал</div>
                  </div>
                ):(
                  <div className="relative h-80 bg-gray-700/20 rounded-lg border border-gray-600/30">
                    {balance.filter(b=>b.balance>0).slice(0,12).map((b,i)=>{
                      const maxB=Math.max(...balance.map(x=>x.balance),1);
                      const code=parseInt(b.account_code);
                      const x=10+(code/9900)*80;
                      const y=10+(b.balance/maxB)*70;
                      const size=Math.max(30,b.balance/maxB*80);
                      return (
                        <div key={i} style={{left:`${x}%`,bottom:`${y}%`,width:`${size}px`,height:`${size}px`,backgroundColor:COLORS[i%COLORS.length]+"66",borderColor:COLORS[i%COLORS.length]}} className="absolute rounded-full border-2 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer" title={`${b.account_code} ${b.account_name}: ${b.balance.toLocaleString()}`}>
                          <span className="text-[9px] font-medium">{b.account_code}</span>
                        </div>
                      );
                    })}
                    <div className="absolute bottom-2 right-4 text-xs text-gray-500">Номер счёта →</div>
                    <div className="absolute top-2 left-2 text-xs text-gray-500">↑ Сальдо</div>
                  </div>
                )}
              </div>
            )}

            {/* HEATMAP */}
            {tab==="heatmap"&&(
              <div>
                <h3 className="font-semibold mb-1">Тепловая карта (Heatmap)</h3>
                <p className="text-gray-400 text-xs mb-6">{childBalances.length>0?"Матрица «филиал × показатель»":"Матрица «счёт × показатель» для "+org?.name}</p>
                {childBalances.length>0?(
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-gray-400 text-xs"><th className="text-left p-2">Организация</th>{heatmapMetrics.map((m,i)=><th key={i} className="text-center p-2">{m}</th>)}</tr></thead>
                      <tbody>{heatmapData.map((row,i)=>(
                        <tr key={i} className="border-t border-gray-700/30">
                          <td className="p-2 font-medium">{row.name}</td>
                          {row.values.map((v,j)=>{
                            const maxV=Math.max(...heatmapData.map(d=>Math.abs(d.values[j])),1);
                            const intensity=Math.abs(v)/maxV;
                            const bg=j===2?(intensity>1.5?"bg-green-600/60":intensity>1?"bg-green-500/40":"bg-red-500/40")
                              :j===3?(v>0?"bg-green-500/40":"bg-red-500/40")
                              :`bg-blue-500/${Math.round(intensity*60)+10}`;
                            return <td key={j} className={`p-2 text-center ${bg} rounded`}>{j>=2?v.toFixed(2):v.toLocaleString()}</td>
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ):(
                  <div>
                    <p className="text-gray-500 text-sm mb-4">Для полной тепловой карты добавьте филиалы/дочерние. Показана карта по счетам:</p>
                    <div className="grid grid-cols-8 gap-1">
                      {balance.filter(b=>b.balance!==0).slice(0,32).map((b,i)=>{
                        const maxB=Math.max(...balance.filter(x=>x.balance!==0).map(x=>Math.abs(x.balance)),1);
                        const intensity=Math.abs(b.balance)/maxB;
                        const code=parseInt(b.account_code);
                        const isAsset=code<6000;
                        const opacity=Math.round(intensity*80)+20;
                        return (
                          <div key={i} style={{opacity:opacity/100}} className={`p-2 rounded text-center ${isAsset?"bg-green-500":"bg-red-500"}`} title={`${b.account_code} ${b.account_name}: ${b.balance.toLocaleString()}`}>
                            <div className="text-[10px] font-mono">{b.account_code}</div>
                            <div className="text-xs font-bold">{(b.balance/1000).toFixed(0)}K</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 justify-center text-xs">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded"></div>Активы</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded"></div>Обязательства/Капитал</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
