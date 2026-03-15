/* eslint-disable */
"use client";
import React, { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface Org { id:number; name:string; mode:string; inn?:string }
type DecisionType = "buy"|"sell"|"hold"|"restructure";
const DECISION_TYPES:{value:DecisionType;label:string;icon:string;desc:string}[] = [
  {value:"buy", label:"Купить", icon:"🟢", desc:"Приобретение нового актива"},
  {value:"sell", label:"Продать", icon:"🔴", desc:"Реализация актива из портфеля"},
  {value:"hold", label:"Удержать", icon:"🟡", desc:"Оставить без изменений"},
  {value:"restructure", label:"Реструктуризация", icon:"🔵", desc:"Изменение структуры финансирования"},
];
const ASSET_CATEGORIES = [
  {value:"securities", label:"Ценные бумаги (0610)", account:"0610"},
  {value:"subsidiary", label:"Доли в дочерних обществах (0620)", account:"0620"},
  {value:"short_term_invest", label:"Краткосрочные инвестиции (5800)", account:"5800"},
  {value:"fixed_assets", label:"Основные средства (0100)", account:"0100"},
  {value:"real_estate", label:"Недвижимость (0120)", account:"0120"},
  {value:"intangible", label:"Нематериальные активы (0400)", account:"0400"},
  {value:"deposits", label:"Депозиты (5500)", account:"5500"},
];
const RISK_LEVELS = ["Низкий","Средний","Выше среднего","Высокий","Очень высокий"];
const HORIZONS = ["До 1 месяца","1-6 месяцев","6-12 месяцев","1-3 года","3-5 лет","Более 5 лет"];
const FINANCING = [
  {value:"own", label:"Собственные средства", accounts:"5100,5200"},
  {value:"bank_short", label:"Краткосрочный кредит (6800)", accounts:"6810"},
  {value:"bank_long", label:"Долгосрочный кредит (7800)", accounts:"7810"},
  {value:"bond", label:"Выпуск облигаций (7800)", accounts:"7820"},
  {value:"mixed", label:"Смешанное финансирование", accounts:""},
];

function T(p:any){return <input {...p} className={`w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 ${p.className||""}`}/>}
function L({label,tip,children}:{label:string;tip?:string;children:React.ReactNode}){
  return <div className="mb-3"><label className="block text-sm font-medium text-gray-300 mb-1">{label}{tip&&<span className="ml-1 text-gray-500 cursor-help" title={tip}>ⓘ</span>}</label>{children}</div>
}
function S(p:any){return <select {...p} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">{p.children}</select>}

export default function DecisionsPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [form,setForm]=useState<any>({
    organization_id:"",decision_type:"buy",asset_name:"",ticker:"",category:"securities",
    quantity:"",price:"",target_return:"",risk_level:"Средний",horizon:"1-3 года",
    geography:"Узбекистан",financing:"own",financing_amount:"",interest_rate:"",
    historical_cost:"",fair_value:"",justification:"",tags:"",priority:"medium",
  });
  const [balanceImpact,setBalanceImpact]=useState<any>(null);
  const [decisions,setDecisions]=useState<any[]>([]);
  const [tab,setTab]=useState<"new"|"list">("new");

  useEffect(()=>{
    fetch(`${API}/organizations`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setOrgs(d)}).catch(()=>{});
    fetch(`${API}/decisions`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setDecisions(d)}).catch(()=>{});
  },[]);

  const calcImpact=()=>{
    const amount=parseFloat(form.quantity||0)*parseFloat(form.price||0);
    const cat=ASSET_CATEGORIES.find(c=>c.value===form.category);
    const fin=FINANCING.find(f=>f.value===form.financing);
    const impact={
      asset_account: cat?.account||"",
      asset_name: cat?.label||"",
      asset_change: form.decision_type==="buy"?amount:-amount,
      liability_account: fin?.accounts?.split(",")[0]||"",
      liability_change: form.financing!=="own"?parseFloat(form.financing_amount||String(amount)):0,
      cash_change: form.financing==="own"?-amount:0,
      net_asset_change: form.decision_type==="buy"?0:amount,
    };
    setBalanceImpact(impact);
  };

  useEffect(()=>{if(form.quantity&&form.price)calcImpact()},[form.quantity,form.price,form.financing,form.category,form.decision_type]);

  const fmtNum=(n:number)=>new Intl.NumberFormat("ru-RU").format(n);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📊 Инвестиционные решения</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={()=>setTab("new")} className={`px-4 py-2 rounded-lg font-bold ${tab==="new"?"bg-blue-600":"bg-white hover:bg-gray-100"}`}>+ Новое решение</button>
          <button onClick={()=>setTab("list")} className={`px-4 py-2 rounded-lg font-bold ${tab==="list"?"bg-blue-600":"bg-white hover:bg-gray-100"}`}>Все решения ({decisions.length})</button>
        </div>

        {tab==="new"&&(
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="grid grid-cols-4 gap-3 mb-6">
              {DECISION_TYPES.map(dt=>(
                <button key={dt.value} onClick={()=>setForm({...form,decision_type:dt.value})} className={`p-3 rounded-lg border text-center ${form.decision_type===dt.value?"border-blue-500 bg-blue-50":"border-gray-200 bg-white"}`}>
                  <div className="text-2xl">{dt.icon}</div>
                  <div className="font-bold text-sm">{dt.label}</div>
                  <div className="text-xs text-gray-500">{dt.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <L label="Привязка к юрлицу *" tip="Какая организация принимает решение">
                <S value={form.organization_id} onChange={(e:any)=>setForm({...form,organization_id:e.target.value})}>
                  <option value="">Выберите организацию</option>
                  {orgs.map(o=><option key={o.id} value={o.id}>{o.name} ({o.mode})</option>)}
                </S>
              </L>
              <L label="Категория актива (Счёт НСБУ)" tip="Автоматически определяет счёт учёта">
                <S value={form.category} onChange={(e:any)=>setForm({...form,category:e.target.value})}>
                  {ASSET_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </S>
              </L>
              <L label="Название актива *"><T value={form.asset_name} onChange={(e:any)=>setForm({...form,asset_name:e.target.value})} placeholder="Акции Uzpromstroybank"/></L>
              <L label="Тикер / Код"><T value={form.ticker} onChange={(e:any)=>setForm({...form,ticker:e.target.value})} placeholder="UPSB"/></L>
              <L label="Количество"><T type="number" value={form.quantity} onChange={(e:any)=>setForm({...form,quantity:e.target.value})} placeholder="1000"/></L>
              <L label="Цена за единицу"><T type="number" value={form.price} onChange={(e:any)=>setForm({...form,price:e.target.value})} placeholder="50000"/></L>
              <L label="Целевая доходность (%)" tip="Ожидаемая годовая доходность"><T type="number" value={form.target_return} onChange={(e:any)=>setForm({...form,target_return:e.target.value})} placeholder="15"/></L>
              <L label="Уровень риска">
                <S value={form.risk_level} onChange={(e:any)=>setForm({...form,risk_level:e.target.value})}>
                  {RISK_LEVELS.map(r=><option key={r} value={r}>{r}</option>)}
                </S>
              </L>
              <L label="Горизонт инвестирования">
                <S value={form.horizon} onChange={(e:any)=>setForm({...form,horizon:e.target.value})}>
                  {HORIZONS.map(h=><option key={h} value={h}>{h}</option>)}
                </S>
              </L>
              <L label="География"><T value={form.geography} onChange={(e:any)=>setForm({...form,geography:e.target.value})} placeholder="Узбекистан"/></L>
            </div>

            <h3 className="text-lg font-bold mt-6 mb-3">💳 Источник финансирования</h3>
            <div className="grid grid-cols-2 gap-4">
              <L label="Способ финансирования" tip="Привязка к счетам обязательств">
                <S value={form.financing} onChange={(e:any)=>setForm({...form,financing:e.target.value})}>
                  {FINANCING.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                </S>
              </L>
              {form.financing!=="own"&&(
                <>
                  <L label="Сумма заёмных средств"><T type="number" value={form.financing_amount} onChange={(e:any)=>setForm({...form,financing_amount:e.target.value})}/></L>
                  <L label="Процентная ставка (%)"><T type="number" value={form.interest_rate} onChange={(e:any)=>setForm({...form,interest_rate:e.target.value})} placeholder="22"/></L>
                </>
              )}
              <L label="Историческая стоимость" tip="Первоначальная стоимость приобретения"><T type="number" value={form.historical_cost} onChange={(e:any)=>setForm({...form,historical_cost:e.target.value})}/></L>
              <L label="Справедливая стоимость" tip="Текущая рыночная или оценочная стоимость"><T type="number" value={form.fair_value} onChange={(e:any)=>setForm({...form,fair_value:e.target.value})}/></L>
            </div>

            {balanceImpact&&(
              <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="font-bold mb-3">⚡ Влияние на баланс</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-gray-500">Актив ({balanceImpact.asset_account})</p>
                    <p className={`text-lg font-bold ${balanceImpact.asset_change>=0?"text-green-400":"text-red-400"}`}>{balanceImpact.asset_change>=0?"+":""}{fmtNum(balanceImpact.asset_change)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-gray-500">Обязательства ({balanceImpact.liability_account||"—"})</p>
                    <p className="text-lg font-bold text-red-400">{balanceImpact.liability_change>0?"+":""}{fmtNum(balanceImpact.liability_change)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-gray-500">Денежные средства (5100)</p>
                    <p className={`text-lg font-bold ${balanceImpact.cash_change>=0?"text-green-400":"text-red-400"}`}>{balanceImpact.cash_change>=0?"+":""}{fmtNum(balanceImpact.cash_change)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <L label="Обоснование решения"><textarea value={form.justification} onChange={(e:any)=>setForm({...form,justification:e.target.value})} rows={3} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm" placeholder="Почему принимается данное решение..."/></L>
              <L label="Теги"><T value={form.tags} onChange={(e:any)=>setForm({...form,tags:e.target.value})} placeholder="банк, акции, дивиденды"/></L>
            </div>

            <div className="flex justify-end mt-6">
              <button className="px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700">💾 Сохранить решение</button>
            </div>
          </div>
        )}

        {tab==="list"&&(
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-500">Всего решений: {decisions.length}</p>
            {decisions.length===0&&<p className="text-center text-gray-500 py-10">Пока нет решений. Создайте первое.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
