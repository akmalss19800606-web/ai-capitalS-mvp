/* eslint-disable */
"use client";
import React, { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ── Types ────────────────────────────────────────────────
interface Account { id:number; code:string; name_ru:string; name_uz?:string; category:string; level:number; parent_code?:string }
interface BalanceRow { account_code:string; account_name:string; debit:number; credit:number; balance:number }
interface OrgData {
  name:string; inn:string; ownership_form:string; oked:string;
  registration_date:string; director:string; charter_capital:string;
  charter_currency:string; address:string; mode:string; accounting_currency:string;
}

const OWNERSHIP_FORMS = ["ООО","АО","ИП","ГУП","СП","ЧП"];
const CURRENCIES = ["UZS","USD","EUR","RUB"];
const MODES = [
  {value:"solo", label:"Solo", desc:"Одно юрлицо, один баланс — ИП, малый/средний бизнес"},
  {value:"branch", label:"Branch", desc:"Одно юрлицо + N филиалов — банки, розничные сети"},
  {value:"holding", label:"Holding", desc:"N юрлиц + филиалы — холдинги, группы компаний"},
];
const CATEGORIES:{[k:string]:{label:string;icon:string;color:string}} = {
  long_term_assets: {label:"I. Долгосрочные активы (0100-0900)", icon:"🏗️", color:"blue"},
  current_assets: {label:"II. Текущие активы (1000-5900)", icon:"💰", color:"green"},
  liabilities: {label:"III. Обязательства (6000-7900)", icon:"📋", color:"red"},
  equity: {label:"IV. Собственный капитал (8300-8900)", icon:"🏛️", color:"purple"},
};

const STEPS = [
  {id:1, title:"Организация", desc:"Регистрация юрлица"},
  {id:2, title:"Долгосрочные активы", desc:"Счета 0100-0900"},
  {id:3, title:"Текущие активы", desc:"Счета 1000-5900"},
  {id:4, title:"Обязательства", desc:"Счета 6000-7900"},
  {id:5, title:"Собственный капитал", desc:"Счета 8300-8900"},
  {id:6, title:"Импорт данных", desc:"Excel / 1С / Файл"},
  {id:7, title:"Итоги баланса", desc:"Проверка и сохранение"},
];

function T(p:any){return <input {...p} className={`w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 ${p.className||""}`}/>}
function L({label,tip,children}:{label:string;tip?:string;children:React.ReactNode}){
  return <div className="mb-3"><label className="block text-sm font-medium text-gray-300 mb-1">{label}{tip&&<span className="ml-1 text-gray-500 cursor-help" title={tip}>ⓘ</span>}</label>{children}</div>
}
function S(p:any){return <select {...p} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">{p.children}</select>}

export default function PortfoliosPage(){
  const [step,setStep]=useState(1);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [org,setOrg]=useState<OrgData>({name:"",inn:"",ownership_form:"ООО",oked:"",registration_date:"",director:"",charter_capital:"",charter_currency:"UZS",address:"",mode:"solo",accounting_currency:"UZS"});
  const [orgId,setOrgId]=useState<number|null>(null);
  const [balanceRows,setBalanceRows]=useState<{[code:string]:BalanceRow}>({});
  const [periodDate,setPeriodDate]=useState(new Date().toISOString().split("T")[0]);
  const [saving,setSaving]=useState(false);
  const [summary,setSummary]=useState<any>(null);
  const [importFile,setImportFile]=useState<File|null>(null);
  const [importResult,setImportResult]=useState<any>(null);
  const [existingOrgs,setExistingOrgs]=useState<any[]>([]);
  const [error,setError]=useState("");

  useEffect(()=>{
    fetch(`${API}/chart-of-accounts`).then(r=>r.json()).then(setAccounts).catch(()=>{});
    fetch(`${API}/organizations`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setExistingOrgs(d)}).catch(()=>{});
  },[]);

  const accountsByCategory=(cat:string)=>accounts.filter(a=>a.category===cat&&a.level>=1).sort((a,b)=>a.code.localeCompare(b.code));
  const updateBalance=(code:string,field:string,value:number,name:string)=>{
    setBalanceRows(prev=>{
      const row=prev[code]||{account_code:code,account_name:name,debit:0,credit:0,balance:0};
      const updated={...row,[field]:value};
      if(field==="debit"||field==="credit") updated.balance=updated.debit-updated.credit;
      return {...prev,[code]:updated};
    });
  };
  const catTotal=(cat:string)=>{
    const codes=accountsByCategory(cat).map(a=>a.code);
    return codes.reduce((s,c)=>s+(balanceRows[c]?.balance||0),0);
  };

  const saveOrg=async()=>{
    setSaving(true); setError("");
    try{
      const r=await fetch(`${API}/organizations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...org,charter_capital:parseFloat(org.charter_capital)||0})});
      if(!r.ok) throw new Error((await r.json()).detail||"Error");
      const data=await r.json();
      setOrgId(data.id);
      setStep(2);
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  };

  const saveBalance=async()=>{
    if(!orgId)return;
    setSaving(true); setError("");
    const entries=Object.values(balanceRows).filter(r=>r.debit!==0||r.credit!==0||r.balance!==0);
    try{
      const r=await fetch(`${API}/organizations/${orgId}/balance`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organization_id:orgId,period_date:periodDate,entries})});
      if(!r.ok) throw new Error((await r.json()).detail||"Error");
      const sr=await fetch(`${API}/organizations/${orgId}/balance/summary?period_date=${periodDate}`);
      if(sr.ok) setSummary(await sr.json());
      setStep(7);
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  };

  const uploadExcel=async()=>{
    if(!orgId||!importFile)return;
    setSaving(true); setError(""); setImportResult(null);
    const fd=new FormData(); fd.append("file",importFile);
    try{
      const r=await fetch(`${API}/organizations/${orgId}/import/excel?period_date=${periodDate}`,{method:"POST",body:fd});
      if(!r.ok) throw new Error((await r.json()).detail||"Import error");
      setImportResult(await r.json());
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  };

  const fmtNum=(n:number)=>new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🏢 Портфели — Финансовый профиль организации</h1>
          <p className="text-gray-400 mt-1">Solo / Branch / Holding — полный баланс по НСБУ Узбекистана</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8 bg-gray-900 rounded-xl p-4">
          {STEPS.map((s,i)=>(
            <div key={s.id} className="flex items-center">
              <div className={`flex flex-col items-center cursor-pointer`} onClick={()=>{if(s.id<=step||(orgId&&s.id>1))setStep(s.id)}}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step===s.id?"bg-blue-600 text-white":s.id<step?"bg-green-600 text-white":"bg-gray-700 text-gray-400"}`}>{s.id<step?"✓":s.id}</div>
                <span className={`text-xs mt-1 ${step===s.id?"text-blue-400":"text-gray-500"}`}>{s.title}</span>
              </div>
              {i<STEPS.length-1&&<div className={`w-12 h-0.5 mx-1 ${s.id<step?"bg-green-600":"bg-gray-700"}`}/>}
            </div>
          ))}
        </div>

        {error&&<div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 text-red-200">{error}</div>}

        {/* STEP 1: Organization */}
        {step===1&&(
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📋 Регистрация организации</h2>
            {existingOrgs.length>0&&(
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Существующие организации:</p>
                <div className="flex flex-wrap gap-2">
                  {existingOrgs.map((o:any)=>(
                    <button key={o.id} onClick={()=>{setOrgId(o.id);setStep(2)}} className="px-3 py-1 bg-blue-900/50 border border-blue-600 rounded-lg text-sm hover:bg-blue-800">{o.name} ({o.mode})</button>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Выберите режим работы:</p>
              <div className="grid grid-cols-3 gap-3">
                {MODES.map(m=>(
                  <button key={m.value} onClick={()=>setOrg({...org,mode:m.value})} className={`p-4 rounded-lg border text-left ${org.mode===m.value?"border-blue-500 bg-blue-900/30":"border-gray-700 bg-gray-800 hover:border-gray-500"}`}>
                    <div className="font-bold text-lg">{m.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <L label="Название организации *"><T value={org.name} onChange={(e:any)=>setOrg({...org,name:e.target.value})} placeholder="ООО «Ромашка»"/></L>
              <L label="ИНН" tip="9 цифр — soliq.uz"><T value={org.inn} onChange={(e:any)=>setOrg({...org,inn:e.target.value})} maxLength={9} placeholder="123456789"/></L>
              <L label="Форма собственности"><S value={org.ownership_form} onChange={(e:any)=>setOrg({...org,ownership_form:e.target.value})}>{OWNERSHIP_FORMS.map(f=><option key={f} value={f}>{f}</option>)}</S></L>
              <L label="ОКЭД (отрасль)" tip="Код из классификатора Узбекистана"><T value={org.oked} onChange={(e:any)=>setOrg({...org,oked:e.target.value})} placeholder="62.01"/></L>
              <L label="Руководитель"><T value={org.director} onChange={(e:any)=>setOrg({...org,director:e.target.value})} placeholder="Каримов А.И."/></L>
              <L label="Дата регистрации"><T type="date" value={org.registration_date} onChange={(e:any)=>setOrg({...org,registration_date:e.target.value})}/></L>
              <L label="Уставный фонд"><T type="number" value={org.charter_capital} onChange={(e:any)=>setOrg({...org,charter_capital:e.target.value})} placeholder="100000000"/></L>
              <L label="Валюта учёта"><S value={org.accounting_currency} onChange={(e:any)=>setOrg({...org,accounting_currency:e.target.value})}>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</S></L>
              <div className="col-span-2"><L label="Адрес"><T value={org.address} onChange={(e:any)=>setOrg({...org,address:e.target.value})} placeholder="г. Ташкент, ул. Навоий 1"/></L></div>
            </div>
            <div className="flex justify-between mt-6">
              <div/>
              <button onClick={saveOrg} disabled={!org.name||saving} className="px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{saving?"Сохранение...":"Далее →"}</button>
            </div>
          </div>
        )}

        {/* STEPS 2-5: Balance by category */}
        {[2,3,4,5].includes(step)&&(()=>{
          const catMap:{[k:number]:string}={2:"long_term_assets",3:"current_assets",4:"liabilities",5:"equity"};
          const cat=catMap[step];
          const info=CATEGORIES[cat];
          const accs=accountsByCategory(cat);
          const total=catTotal(cat);
          return (
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">{info.icon} {info.label}</h2>
                  <p className="text-gray-400 text-sm">Введите сальдо по каждому счёту</p>
                </div>
                <div className="text-right">
                  <L label="Отчётная дата"><T type="date" value={periodDate} onChange={(e:any)=>setPeriodDate(e.target.value)}/></L>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left py-2 px-2 w-20">Счёт</th>
                    <th className="text-left py-2 px-2">Название</th>
                    <th className="text-right py-2 px-2 w-40">Дебет</th>
                    <th className="text-right py-2 px-2 w-40">Кредит</th>
                    <th className="text-right py-2 px-2 w-40">Сальдо</th>
                  </tr></thead>
                  <tbody>
                    {accs.map(a=>{
                      const row=balanceRows[a.code]||{debit:0,credit:0,balance:0};
                      const isGroup=a.level===1;
                      return (
                        <tr key={a.code} className={`border-b border-gray-800 ${isGroup?"bg-gray-800/50 font-semibold":""}`}>
                          <td className="py-2 px-2 text-blue-400">{a.code}</td>
                          <td className="py-2 px-2">{a.level>1?"  ↳ ":""}{a.name_ru}</td>
                          <td className="py-2 px-2"><input type="number" value={row.debit||""} onChange={e=>updateBalance(a.code,"debit",parseFloat(e.target.value)||0,a.name_ru)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-sm" placeholder="0.00"/></td>
                          <td className="py-2 px-2"><input type="number" value={row.credit||""} onChange={e=>updateBalance(a.code,"credit",parseFloat(e.target.value)||0,a.name_ru)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right text-sm" placeholder="0.00"/></td>
                          <td className="py-2 px-2 text-right font-mono">{fmtNum(row.balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-gray-600 font-bold text-lg">
                    <td colSpan={4} className="py-3 px-2">ИТОГО {info.label.split(".")[0]}:</td>
                    <td className="py-3 px-2 text-right font-mono text-blue-400">{fmtNum(total)}</td>
                  </tr></tfoot>
                </table>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={()=>setStep(step-1)} className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">← Назад</button>
                <button onClick={()=>step<5?setStep(step+1):setStep(6)} className="px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700">Далее →</button>
              </div>
            </div>
          );
        })()}

        {/* STEP 6: Import */}
        {step===6&&(
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📥 Импорт данных</h2>
            <p className="text-gray-400 mb-6">Вы можете импортировать данные из Excel/CSV или продолжить с ручным вводом</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-bold">Excel / CSV</h3>
                <p className="text-xs text-gray-400 mt-1">Загрузите ОСВ из 1С или бухгалтерской программы</p>
                <input type="file" accept=".xlsx,.csv,.xls" onChange={e=>setImportFile(e.target.files?.[0]||null)} className="mt-3 text-sm"/>
                {importFile&&<button onClick={uploadExcel} disabled={saving} className="mt-2 w-full py-2 bg-green-600 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">{saving?"Импорт...":"Загрузить"}</button>}
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl mb-2">🔗</div>
                <h3 className="font-bold">1С OData</h3>
                <p className="text-xs text-gray-400 mt-1">Прямое подключение к базе 1С через REST API</p>
                <button className="mt-3 w-full py-2 bg-gray-700 rounded-lg text-sm border border-gray-600 hover:bg-gray-600">Настроить подключение</button>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-2xl mb-2">✋</div>
                <h3 className="font-bold">Ручной ввод</h3>
                <p className="text-xs text-gray-400 mt-1">Уже заполнено на предыдущих шагах</p>
                <div className="mt-3 text-sm text-green-400">✅ {Object.keys(balanceRows).length} счетов заполнено</div>
              </div>
            </div>
            {importResult&&(
              <div className="p-4 bg-green-900/30 border border-green-600 rounded-lg mb-4">
                <p className="font-bold text-green-400">✅ Импорт завершён</p>
                <p className="text-sm text-gray-300">Всего: {importResult.total} | Импортировано: {importResult.imported} | Ошибок: {importResult.failed}</p>
                {importResult.errors?.length>0&&<div className="mt-2 text-xs text-red-300">{importResult.errors.join(", ")}</div>}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button onClick={()=>setStep(5)} className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">← Назад</button>
              <button onClick={saveBalance} disabled={saving} className="px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{saving?"Сохранение...":"Сохранить и проверить баланс →"}</button>
            </div>
          </div>
        )}

        {/* STEP 7: Summary */}
        {step===7&&(
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 Итоги баланса</h2>
            {summary?(
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                    <p className="text-gray-400 text-sm">АКТИВЫ</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">{fmtNum(summary.total_assets)}</p>
                    <div className="mt-2 text-sm text-gray-400">
                      <div>Долгосрочные: {fmtNum(summary.long_term_assets)}</div>
                      <div>Текущие: {fmtNum(summary.current_assets)}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-900/30 border border-purple-600 rounded-lg">
                    <p className="text-gray-400 text-sm">ПАССИВЫ</p>
                    <p className="text-3xl font-bold text-purple-400 mt-1">{fmtNum(summary.total_liabilities+summary.total_equity)}</p>
                    <div className="mt-2 text-sm text-gray-400">
                      <div>Обязательства: {fmtNum(summary.total_liabilities)}</div>
                      <div>Капитал: {fmtNum(summary.total_equity)}</div>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${summary.balance_check?"bg-green-900/30 border-green-600":"bg-red-900/30 border-red-600"}`}>
                  <p className="font-bold text-lg">{summary.balance_check?"✅ Баланс сходится":"❌ Баланс НЕ сходится"}</p>
                  <p className="text-sm text-gray-400">Актив: {fmtNum(summary.total_assets)} | Пассив: {fmtNum(summary.total_liabilities+summary.total_equity)} | Дата: {summary.period_date}</p>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={()=>setStep(2)} className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">← Редактировать</button>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-green-700 rounded-lg hover:bg-green-600 text-sm">📄 Экспорт PDF</button>
                    <button className="px-4 py-2 bg-green-700 rounded-lg hover:bg-green-600 text-sm">📊 Экспорт Excel</button>
                    <button onClick={()=>{window.location.href="/analytics"}} className="px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700">Перейти к аналитике →</button>
                  </div>
                </div>
              </>
            ):(
              <div className="text-center py-10 text-gray-400">
                <p>Загрузка итогов...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
