
"use client";
import {useState,useEffect,useCallback} from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
function getToken(){if(typeof window!=="undefined")return localStorage.getItem("access_token");return null;}
function authHeaders(){const t=getToken();return t?{Authorization:`Bearer ${t}`,"Content-Type":"application/json"}:{"Content-Type":"application/json"};}

// ============ ТИПЫ ============
type OrgMode = "solo"|"branch"|"holding";
interface Org {id?:number;name:string;inn:string;ownership_form:string;oked:string;director:string;registration_date:string;charter_capital:number;currency:string;address:string;mode:OrgMode;parent_id?:number|null;ownership_share?:number;is_branch?:boolean;}
interface BalanceEntry {account_code:string;account_name:string;debit:number;credit:number;balance:number;}

const EMPTY_ORG:Org={name:"",inn:"",ownership_form:"ООО",oked:"",director:"",registration_date:"",charter_capital:0,currency:"UZS",address:"",mode:"solo",parent_id:null,ownership_share:100,is_branch:false};

// ============ ПЛАН СЧЕТОВ НСБУ ============
const NSBU_SECTIONS:{title:string;accounts:{code:string;name:string}[]}[] = [
  {title:"I. Долгосрочные активы (0100-0900)",accounts:[
    {code:"0100",name:"Основные средства"},{code:"0200",name:"Износ основных средств"},{code:"0300",name:"ОС по финансовой аренде"},
    {code:"0400",name:"Нематериальные активы"},{code:"0500",name:"Амортизация НМА"},{code:"0600",name:"Долгосрочные инвестиции"},
    {code:"0700",name:"Оборудование к установке"},{code:"0800",name:"Капитальные вложения"},{code:"0900",name:"Долгосрочная дебиторка"}]},
  {title:"II. Текущие активы (1000-5900)",accounts:[
    {code:"1000",name:"Материалы и запасы"},{code:"2000",name:"Основное производство"},{code:"2500",name:"Общепроизводственные расходы"},
    {code:"2800",name:"Готовая продукция"},{code:"2900",name:"Товары"},{code:"3100",name:"Расходы будущих периодов"},
    {code:"4000",name:"Счета к получению"},{code:"4300",name:"Авансы выданные"},{code:"4800",name:"Задолженность персонала"},
    {code:"5000",name:"Касса"},{code:"5100",name:"Расчётный счёт"},{code:"5200",name:"Валютные счета"},{code:"5500",name:"Специальные счета"},
    {code:"5800",name:"Краткосрочные инвестиции"}]},
  {title:"III. Обязательства (6000-7900)",accounts:[
    {code:"6000",name:"Счета к оплате поставщикам"},{code:"6100",name:"Задолженность подразделениям"},{code:"6200",name:"Отсроченные обязательства"},
    {code:"6300",name:"Полученные авансы"},{code:"6400",name:"Задолженность по платежам в бюджет"},{code:"6500",name:"Страхование"},
    {code:"6600",name:"Задолженность учредителям"},{code:"6700",name:"Расчёты с персоналом"},{code:"6800",name:"Краткосрочные кредиты"},
    {code:"6900",name:"Прочие обязательства"},{code:"7000",name:"Долгосрочная кредиторка"},{code:"7800",name:"Долгосрочные кредиты банков"},
    {code:"7900",name:"Долгосрочные обязательства по аренде"}]},
  {title:"IV. Собственный капитал (8300-8900)",accounts:[
    {code:"8300",name:"Уставный капитал"},{code:"8400",name:"Добавленный капитал"},{code:"8500",name:"Резервный капитал"},
    {code:"8600",name:"Выкупленные собственные акции"},{code:"8700",name:"Нераспределённая прибыль"},{code:"8800",name:"Целевые поступления"},
    {code:"8900",name:"Резервы предстоящих расходов"}]}
];

const ALL_ACCOUNTS = NSBU_SECTIONS.flatMap(s=>s.accounts);

// ============ UI КОМПОНЕНТЫ ============
function Badge({children,color="blue"}:{children:React.ReactNode;color?:string}){
  const c=color==="green"?"bg-green-500/20 text-green-400":color==="purple"?"bg-purple-500/20 text-purple-400":color==="orange"?"bg-orange-500/20 text-orange-400":"bg-blue-500/20 text-blue-400";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${c}`}>{children}</span>
}

function Card({children,className=""}:{children:React.ReactNode;className?:string}){
  return <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-5 ${className}`}>{children}</div>
}

// ============ ГЛАВНЫЙ КОМПОНЕНТ ============
export default function PortfoliosPage(){
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [selectedOrg,setSelectedOrg]=useState<Org|null>(null);
  const [editOrg,setEditOrg]=useState<Org>(EMPTY_ORG);
  const [balance,setBalance]=useState<BalanceEntry[]>([]);
  const [showForm,setShowForm]=useState(false);
  const [showBranchForm,setShowBranchForm]=useState(false);
  const [branchOrg,setBranchOrg]=useState<Org>({...EMPTY_ORG,is_branch:true});
  const [tab,setTab]=useState<"tree"|"balance"|"consolidated"|"import">("tree");
  const [loading,setLoading]=useState(false);
  const [importFile,setImportFile]=useState<File|null>(null);
  const [importStatus,setImportStatus]=useState("");

  // Загрузка организаций
  const loadOrgs=useCallback(async()=>{
    try{const r=await fetch(`${API}/organizations`,{headers:authHeaders()});
    if(r.ok){setOrgs(await r.json())}}catch(e){console.error(e)}
  },[]);

  useEffect(()=>{loadOrgs()},[loadOrgs]);

  // Загрузка баланса
  const loadBalance=async(orgId:number)=>{
    try{const r=await fetch(`${API}/organizations/${orgId}/balance`,{headers:authHeaders()});
    if(r.ok){setBalance(await r.json())}else{
      // Если нет данных — инициализируем пустой баланс
      setBalance(ALL_ACCOUNTS.map(a=>({account_code:a.code,account_name:a.name,debit:0,credit:0,balance:0})))
    }}catch{setBalance(ALL_ACCOUNTS.map(a=>({account_code:a.code,account_name:a.name,debit:0,credit:0,balance:0})))}
  };

  // Сохранение организации
  const saveOrg=async()=>{
    setLoading(true);
    try{
      const url=editOrg.id?`${API}/organizations/${editOrg.id}`:`${API}/organizations`;
      const method=editOrg.id?"PUT":"POST";
      const r=await fetch(url,{method,headers:authHeaders(),body:JSON.stringify(editOrg)});
      if(r.ok){await loadOrgs();setShowForm(false);setEditOrg(EMPTY_ORG)}
    }catch(e){console.error(e)}
    setLoading(false);
  };

  // Сохранение филиала / дочерней
  const saveBranch=async()=>{
    if(!selectedOrg?.id)return;
    setLoading(true);
    try{
      const payload={...branchOrg,parent_id:selectedOrg.id,mode:selectedOrg.mode};
      const r=await fetch(`${API}/organizations`,{method:"POST",headers:authHeaders(),body:JSON.stringify(payload)});
      if(r.ok){await loadOrgs();setShowBranchForm(false);setBranchOrg({...EMPTY_ORG,is_branch:true})}
    }catch(e){console.error(e)}
    setLoading(false);
  };

  // Сохранение баланса
  const saveBalance=async()=>{
    if(!selectedOrg?.id)return;
    setLoading(true);
    try{
      await fetch(`${API}/organizations/${selectedOrg.id}/balance`,{method:"PUT",headers:authHeaders(),body:JSON.stringify(balance)});
    }catch(e){console.error(e)}
    setLoading(false);
  };

  // Импорт Excel
  const handleImport=async()=>{
    if(!selectedOrg?.id||!importFile)return;
    setImportStatus("Загрузка...");
    try{
      const fd=new FormData();fd.append("file",importFile);
      const r=await fetch(`${API}/organizations/${selectedOrg.id}/import/excel`,{method:"POST",headers:{Authorization:`Bearer ${getToken()}`},body:fd});
      if(r.ok){setImportStatus("✅ Импорт выполнен!");await loadBalance(selectedOrg.id)}
      else{setImportStatus("❌ Ошибка импорта")}
    }catch{setImportStatus("❌ Ошибка сети")}
  };

  // Консолидация
  const [consolidated,setConsolidated]=useState<BalanceEntry[]>([]);
  const loadConsolidated=async(orgId:number)=>{
    try{const r=await fetch(`${API}/organizations/${orgId}/consolidated-balance`,{headers:authHeaders()});
    if(r.ok)setConsolidated(await r.json());
    else setConsolidated([])}catch{setConsolidated([])}
  };

  const selectOrg=(o:Org)=>{
    setSelectedOrg(o);
    if(o.id){loadBalance(o.id);if(o.mode!=="solo")loadConsolidated(o.id)}
    setTab("tree");
  };

  // Дерево организаций
  const rootOrgs=orgs.filter(o=>!o.parent_id);
  const childrenOf=(parentId:number)=>orgs.filter(o=>o.parent_id===parentId);

  // Расчёты баланса
  const totalAssets=balance.filter(b=>parseInt(b.account_code)<6000).reduce((s,b)=>s+b.balance,0);
  const totalLiabilities=balance.filter(b=>parseInt(b.account_code)>=6000&&parseInt(b.account_code)<8300).reduce((s,b)=>s+b.balance,0);
  const totalEquity=balance.filter(b=>parseInt(b.account_code)>=8300).reduce((s,b)=>s+b.balance,0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">🏢 Портфели — Финансовый профиль организации</h1>
            <p className="text-gray-400 text-sm mt-1">Solo / Branch / Holding — полный баланс по НСБУ Узбекистана</p>
          </div>
          <button onClick={()=>{setEditOrg(EMPTY_ORG);setShowForm(true)}} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            ➕ Новая организация
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Левая панель — дерево */}
          <div className="col-span-3">
            <Card>
              <h3 className="font-semibold mb-3 text-sm text-gray-300">📂 Организации ({orgs.length})</h3>
              {rootOrgs.length===0&&<p className="text-gray-500 text-sm">Нет организаций. Создайте первую.</p>}
              {rootOrgs.map(o=>(
                <div key={o.id} className="mb-2">
                  <div onClick={()=>selectOrg(o)} className={`p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between ${selectedOrg?.id===o.id?"bg-blue-600/30 border border-blue-500":"hover:bg-gray-700/50"}`}>
                    <div>
                      <div className="font-medium">{o.name||"Без названия"}</div>
                      <div className="text-gray-400 text-xs">{o.inn||"—"}</div>
                    </div>
                    <Badge color={o.mode==="solo"?"blue":o.mode==="branch"?"green":"purple"}>{o.mode}</Badge>
                  </div>
                  {/* Дочерние / филиалы */}
                  {o.id&&childrenOf(o.id).map(ch=>(
                    <div key={ch.id} onClick={()=>selectOrg(ch)} className={`ml-4 mt-1 p-2 rounded-lg cursor-pointer text-sm flex items-center justify-between ${selectedOrg?.id===ch.id?"bg-blue-600/20 border border-blue-500/50":"hover:bg-gray-700/30"}`}>
                      <div>
                        <div className="font-medium text-gray-300">{ch.is_branch?"📍":"🏭"} {ch.name}</div>
                        <div className="text-gray-500 text-xs">{ch.is_branch?"Филиал":"Дочерняя"} {ch.ownership_share?`(${ch.ownership_share}%)`:""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          </div>

          {/* Правая панель — детали */}
          <div className="col-span-9">
            {!selectedOrg?(
              <Card className="text-center py-20">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-xl font-semibold mb-2">Выберите организацию</h3>
                <p className="text-gray-400">Или создайте новую для начала работы</p>
              </Card>
            ):(
              <div>
                {/* Карточка организации */}
                <Card className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold">{selectedOrg.name}</h2>
                      <Badge color={selectedOrg.mode==="solo"?"blue":selectedOrg.mode==="branch"?"green":"purple"}>{selectedOrg.mode.toUpperCase()}</Badge>
                    </div>
                    <div className="flex gap-2">
                      {selectedOrg.mode!=="solo"&&(
                        <button onClick={()=>setShowBranchForm(true)} className="bg-green-600/20 text-green-400 hover:bg-green-600/30 px-3 py-1.5 rounded-lg text-sm">
                          ➕ {selectedOrg.mode==="branch"?"Филиал":"Дочерняя"}
                        </button>
                      )}
                      <button onClick={()=>{setEditOrg(selectedOrg);setShowForm(true)}} className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm">✏️ Редактировать</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-400">ИНН:</span> {selectedOrg.inn||"—"}</div>
                    <div><span className="text-gray-400">ОКЭД:</span> {selectedOrg.oked||"—"}</div>
                    <div><span className="text-gray-400">Форма:</span> {selectedOrg.ownership_form}</div>
                    <div><span className="text-gray-400">Валюта:</span> {selectedOrg.currency}</div>
                  </div>
                </Card>

                {/* Сводка баланса */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Card><div className="text-gray-400 text-xs">АКТИВЫ</div><div className="text-xl font-bold text-green-400">{totalAssets.toLocaleString()} {selectedOrg.currency}</div></Card>
                  <Card><div className="text-gray-400 text-xs">ОБЯЗАТЕЛЬСТВА</div><div className="text-xl font-bold text-red-400">{totalLiabilities.toLocaleString()} {selectedOrg.currency}</div></Card>
                  <Card><div className="text-gray-400 text-xs">СОБСТВЕННЫЙ КАПИТАЛ</div><div className="text-xl font-bold text-blue-400">{totalEquity.toLocaleString()} {selectedOrg.currency}</div></Card>
                </div>

                {/* Табы */}
                <div className="flex gap-2 mb-4">
                  {[
                    {id:"tree" as const,label:"📊 Баланс НСБУ"},
                    {id:"balance" as const,label:"✏️ Редактирование"},
                    ...(selectedOrg.mode!=="solo"?[{id:"consolidated" as const,label:"📈 Консолидация"}]:[]),
                    {id:"import" as const,label:"📥 Импорт данных"}
                  ].map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab===t.id?"bg-blue-600":"bg-gray-800 hover:bg-gray-700"}`}>{t.label}</button>
                  ))}
                </div>

                {/* Контент табов */}
                {tab==="tree"&&(
                  <Card>
                    {NSBU_SECTIONS.map((sec,si)=>{
                      const secEntries=balance.filter(b=>sec.accounts.some(a=>a.code===b.account_code));
                      const secTotal=secEntries.reduce((s,e)=>s+e.balance,0);
                      return (
                        <div key={si} className="mb-4">
                          <div className="flex items-center justify-between bg-gray-700/30 px-3 py-2 rounded-lg mb-2">
                            <span className="font-semibold text-sm">{sec.title}</span>
                            <span className="font-bold text-sm">{secTotal.toLocaleString()}</span>
                          </div>
                          <table className="w-full text-sm">
                            <thead><tr className="text-gray-400 text-xs"><th className="text-left py-1 px-2">Счёт</th><th className="text-left">Наименование</th><th className="text-right px-2">Дебет</th><th className="text-right px-2">Кредит</th><th className="text-right px-2">Сальдо</th></tr></thead>
                            <tbody>
                              {secEntries.map((e,i)=>(
                                <tr key={i} className="border-t border-gray-700/30 hover:bg-gray-800/30">
                                  <td className="py-1 px-2 font-mono text-blue-400">{e.account_code}</td>
                                  <td>{e.account_name}</td>
                                  <td className="text-right px-2">{e.debit?e.debit.toLocaleString():"—"}</td>
                                  <td className="text-right px-2">{e.credit?e.credit.toLocaleString():"—"}</td>
                                  <td className="text-right px-2 font-medium">{e.balance?e.balance.toLocaleString():"0"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </Card>
                )}

                {tab==="balance"&&(
                  <Card>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">Ручной ввод баланса</h3>
                      <button onClick={saveBalance} disabled={loading} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                        {loading?"Сохранение...":"💾 Сохранить баланс"}
                      </button>
                    </div>
                    {NSBU_SECTIONS.map((sec,si)=>(
                      <div key={si} className="mb-4">
                        <div className="bg-gray-700/30 px-3 py-2 rounded-lg mb-2 font-semibold text-sm">{sec.title}</div>
                        {sec.accounts.map((acc)=>{
                          const idx=balance.findIndex(b=>b.account_code===acc.code);
                          const entry=idx>=0?balance[idx]:{account_code:acc.code,account_name:acc.name,debit:0,credit:0,balance:0};
                          return (
                            <div key={acc.code} className="grid grid-cols-12 gap-2 items-center mb-1 text-sm">
                              <div className="col-span-1 font-mono text-blue-400">{acc.code}</div>
                              <div className="col-span-5 text-gray-300">{acc.name}</div>
                              <input type="number" value={entry.debit||""} placeholder="Дебет" onChange={e=>{
                                const v=parseFloat(e.target.value)||0;
                                setBalance(prev=>{const n=[...prev];const i=n.findIndex(b=>b.account_code===acc.code);
                                if(i>=0){n[i]={...n[i],debit:v,balance:v-n[i].credit}}else{n.push({account_code:acc.code,account_name:acc.name,debit:v,credit:0,balance:v})}return n})
                              }} className="col-span-2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-right"/>
                              <input type="number" value={entry.credit||""} placeholder="Кредит" onChange={e=>{
                                const v=parseFloat(e.target.value)||0;
                                setBalance(prev=>{const n=[...prev];const i=n.findIndex(b=>b.account_code===acc.code);
                                if(i>=0){n[i]={...n[i],credit:v,balance:n[i].debit-v}}else{n.push({account_code:acc.code,account_name:acc.name,debit:0,credit:v,balance:-v})}return n})
                              }} className="col-span-2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-right"/>
                              <div className="col-span-2 text-right font-medium">{entry.balance.toLocaleString()}</div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </Card>
                )}

                {tab==="consolidated"&&selectedOrg.mode!=="solo"&&(
                  <Card>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold">📈 Консолидированный баланс</h3>
                        <p className="text-gray-400 text-xs mt-1">Агрегация {selectedOrg.mode==="branch"?"филиалов":"дочерних компаний"} с элиминацией внутригрупповых</p>
                      </div>
                      <button onClick={()=>selectedOrg.id&&loadConsolidated(selectedOrg.id)} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm">🔄 Пересчитать</button>
                    </div>
                    {/* Дочерние / Филиалы */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Структура группы</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedOrg.id&&childrenOf(selectedOrg.id).map(ch=>(
                          <div key={ch.id} className="bg-gray-700/30 p-3 rounded-lg">
                            <div className="font-medium text-sm">{ch.is_branch?"📍":"🏭"} {ch.name}</div>
                            <div className="text-gray-400 text-xs">{ch.is_branch?"Филиал":"Дочерняя"} • {ch.ownership_share||100}%</div>
                          </div>
                        ))}
                      </div>
                      {selectedOrg.id&&childrenOf(selectedOrg.id).length===0&&<p className="text-gray-500 text-sm">Нет дочерних/филиалов. Добавьте через кнопку выше.</p>}
                    </div>
                    {/* Элиминация */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-orange-400 text-sm mb-2">⚠️ Элиминация внутригрупповых операций</h4>
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>• Счёт 6100 «Задолженность подразделениям» — взаимные расчёты обнуляются</div>
                        <div>• Инвестиции головной → дочерняя (0600) ↔ капитал дочерней (8300) — элиминация</div>
                        <div>• Дивиденды внутри группы — исключаются из доходов/расходов</div>
                      </div>
                    </div>
                    {/* Консолидированная таблица */}
                    {consolidated.length>0?(
                      <table className="w-full text-sm">
                        <thead><tr className="text-gray-400 text-xs border-b border-gray-700"><th className="text-left py-2">Счёт</th><th className="text-left">Наименование</th><th className="text-right">Головная</th><th className="text-right">Дочерние</th><th className="text-right">Элиминация</th><th className="text-right font-bold">Консолидировано</th></tr></thead>
                        <tbody>{consolidated.map((e,i)=>(
                          <tr key={i} className="border-t border-gray-700/30"><td className="py-1 font-mono text-blue-400">{e.account_code}</td><td>{e.account_name}</td><td className="text-right">{e.debit.toLocaleString()}</td><td className="text-right">{e.credit.toLocaleString()}</td><td className="text-right text-orange-400">—</td><td className="text-right font-bold">{e.balance.toLocaleString()}</td></tr>
                        ))}</tbody>
                      </table>
                    ):(
                      <p className="text-gray-500 text-sm text-center py-8">Данных для консолидации пока нет. Заполните балансы дочерних/филиалов.</p>
                    )}
                  </Card>
                )}

                {tab==="import"&&(
                  <Card>
                    <h3 className="font-semibold mb-4">📥 Импорт данных</h3>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {/* Excel */}
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="text-2xl mb-2">📊</div>
                        <h4 className="font-medium text-green-400">Excel / CSV</h4>
                        <p className="text-gray-400 text-xs mt-1">Загрузите оборотно-сальдовую ведомость</p>
                        <input type="file" accept=".xlsx,.csv,.xls" onChange={e=>setImportFile(e.target.files?.[0]||null)} className="mt-3 text-xs w-full"/>
                        <button onClick={handleImport} disabled={!importFile} className="mt-2 w-full bg-green-600 hover:bg-green-700 disabled:opacity-30 px-3 py-1.5 rounded text-sm">Импортировать</button>
                      </div>
                      {/* 1С */}
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="text-2xl mb-2">🔗</div>
                        <h4 className="font-medium text-blue-400">1С OData API</h4>
                        <p className="text-gray-400 text-xs mt-1">Прямое подключение к базе 1С через REST API</p>
                        <input placeholder="URL 1C OData" className="mt-3 w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"/>
                        <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm">Подключить</button>
                      </div>
                      {/* Ручной */}
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="text-2xl mb-2">✏️</div>
                        <h4 className="font-medium text-purple-400">Ручной ввод</h4>
                        <p className="text-gray-400 text-xs mt-1">Заполните баланс вручную по счетам НСБУ</p>
                        <button onClick={()=>setTab("balance")} className="mt-8 w-full bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded text-sm">Перейти к вводу</button>
                      </div>
                    </div>
                    {importStatus&&<div className="bg-gray-800 rounded-lg p-3 text-sm">{importStatus}</div>}
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно — создание/редактирование организации */}
      {showForm&&(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editOrg.id?"✏️ Редактирование":"➕ Новая организация"}</h3>
            {/* Выбор режима */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Режим работы</label>
              <div className="grid grid-cols-3 gap-3">
                {([["solo","Solo","Одно юрлицо, один баланс — ИП, малый/средний бизнес"],["branch","Branch","Одно юрлицо + N филиалов — банки, розничные сети"],["holding","Holding","N юрлиц + филиалы — холдинги, группы компаний"]] as const).map(([m,label,desc])=>(
                  <div key={m} onClick={()=>setEditOrg(p=>({...p,mode:m}))} className={`p-3 rounded-lg cursor-pointer border text-sm ${editOrg.mode===m?"border-blue-500 bg-blue-600/20":"border-gray-600 hover:border-gray-500"}`}>
                    <div className="font-semibold">{label}</div>
                    <div className="text-gray-400 text-xs mt-1">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-400 mb-1">Название организации *</label><input value={editOrg.name} onChange={e=>setEditOrg(p=>({...p,name:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="ООО «Ромашка»"/></div>
              <div><label className="block text-xs text-gray-400 mb-1">ИНН</label><input value={editOrg.inn} onChange={e=>setEditOrg(p=>({...p,inn:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="123456789"/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Форма собственности</label><select value={editOrg.ownership_form} onChange={e=>setEditOrg(p=>({...p,ownership_form:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"><option>ООО</option><option>АО</option><option>ИП</option><option>ГУП</option><option>СП</option><option>ЧП</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1">ОКЭД (отрасль)</label><input value={editOrg.oked} onChange={e=>setEditOrg(p=>({...p,oked:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="62.01"/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Руководитель</label><input value={editOrg.director} onChange={e=>setEditOrg(p=>({...p,director:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="Каримов А.И."/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Дата регистрации</label><input type="date" value={editOrg.registration_date} onChange={e=>setEditOrg(p=>({...p,registration_date:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Уставный фонд</label><input type="number" value={editOrg.charter_capital||""} onChange={e=>setEditOrg(p=>({...p,charter_capital:parseFloat(e.target.value)||0}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"/></div>
              <div><label className="block text-xs text-gray-400 mb-1">Валюта учёта</label><select value={editOrg.currency} onChange={e=>setEditOrg(p=>({...p,currency:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"><option>UZS</option><option>USD</option><option>EUR</option></select></div>
              <div className="col-span-2"><label className="block text-xs text-gray-400 mb-1">Адрес</label><input value={editOrg.address} onChange={e=>setEditOrg(p=>({...p,address:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder="г. Ташкент, ул. Навоий 1"/></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Отмена</button>
              <button onClick={saveOrg} disabled={loading||!editOrg.name} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium">{loading?"Сохранение...":"💾 Сохранить"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно — добавление филиала/дочерней */}
      {showBranchForm&&selectedOrg&&(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">➕ {selectedOrg.mode==="branch"?"Новый филиал":"Новая дочерняя компания"}</h3>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-400 mb-1">Название *</label><input value={branchOrg.name} onChange={e=>setBranchOrg(p=>({...p,name:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" placeholder={selectedOrg.mode==="branch"?"Филиал в Самарканде":"ООО «Дочерняя»"}/></div>
              <div><label className="block text-xs text-gray-400 mb-1">ИНН</label><input value={branchOrg.inn} onChange={e=>setBranchOrg(p=>({...p,inn:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"/></div>
              {selectedOrg.mode==="holding"&&(
                <div><label className="block text-xs text-gray-400 mb-1">Доля владения (%)</label><input type="number" value={branchOrg.ownership_share||100} onChange={e=>setBranchOrg(p=>({...p,ownership_share:parseFloat(e.target.value)||100}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm" min="0" max="100"/></div>
              )}
              <div><label className="block text-xs text-gray-400 mb-1">Адрес</label><input value={branchOrg.address} onChange={e=>setBranchOrg(p=>({...p,address:e.target.value}))} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm"/></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={branchOrg.is_branch||false} onChange={e=>setBranchOrg(p=>({...p,is_branch:e.target.checked}))}/><label className="text-sm text-gray-300">Это филиал (без отдельного юрлица)</label></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setShowBranchForm(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Отмена</button>
              <button onClick={saveBranch} disabled={loading||!branchOrg.name} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium">{loading?"Сохранение...":"💾 Добавить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
