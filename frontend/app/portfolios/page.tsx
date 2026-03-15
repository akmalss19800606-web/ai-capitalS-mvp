/* eslint-disable */
"use client";
import React, { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// -- Types
interface Account { id:number; code:string; name_ru:string; name_uz?:string; category:string; level:number; parent_code?:string }
interface BalanceRow { account_code:string; account_name:string; debit:number; credit:number; balance:number }
interface OrgData {
  name:string; inn:string; ownership_form:string; oked:string;
  registration_date:string; director:string; charter_capital:string;
  charter_currency:string; address:string; mode:string; accounting_currency:string;
}

const OWNERSHIP_FORMS = ["OOO","AO","IP","GUP","SP","ChP"];
const CURRENCIES = ["UZS","USD","EUR","RUB"];
const MODES = [
  {value:"solo", label:"Solo", desc:"Одно юрлицо, один баланс -- ИП, малый/средний бизнес"},
  {value:"branch", label:"Branch", desc:"Одно юрлицо + N филиалов -- банки, розничные сети"},
  {value:"holding", label:"Holding", desc:"N юрлиц + филиалы -- холдинги, группы компаний"},
];
const CATEGORIES:{[k:string]:{label:string;icon:string;color:string}} = {
  long_term_assets: {label:"I. Долгосрочные активы (0100-0900)", icon:"\ud83c\udfd7\ufe0f", color:"blue"},
  current_assets: {label:"II. Текущие активы (1000-5900)", icon:"\ud83d\udcb0", color:"green"},
  liabilities: {label:"III. Обязательства (6000-7900)", icon:"\ud83d\udccb", color:"red"},
  equity: {label:"IV. Собственный капитал (8300-8900)", icon:"\ud83c\udfdb\ufe0f", color:"purple"},
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

function T(p:any){return <input {...p} className={`w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 ${p.className||""}`}/>}
function L({label,tip,children}:{label:string;tip?:string;children:React.ReactNode}){
  return <div className="mb-3"><label className="block text-sm font-medium text-gray-600 mb-1">{label}{tip&&<span className="ml-1 text-gray-400 cursor-help" title={tip}>(i)</span>}</label>{children}</div>
}
function S(p:any){return <select {...p} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">{p.children}</select>}

export default function PortfoliosPage(){
  const [step,setStep]=useState(1);
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [org,setOrg]=useState<OrgData>
  ({name:"",inn:"",ownership_form:"OOO",oked:"",registration_date:"",director:"",charter_capital:"",charter_currency:"UZS",address:"",mode:"solo",accounting_currency:"UZS"});
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
      const data=await r.json(); setOrgId(data.id); setStep(2);
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  };

  const saveBalance=async()=>{
    if(!orgId)return; setSaving(true); setError("");
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
    if(!orgId||!importFile)return; setSaving(true); setError(""); setImportResult(null);
    const fd=new FormData(); fd.append("file",importFile);
    try{
      const r=await fetch(`${API}/organizations/${orgId}/import/excel?period_date=${periodDate}`,{method:"POST",body:fd});
      if(!r.ok) throw new Error((await r.json()).detail||"Import error");
      setImportResult(await r.json());
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  };

  const fmtNum=(n:number)=>new Intl.NumberFormat("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portfolios -- Financial Profile</h1>
          <p className="text-gray-500 mt-1">Solo / Branch / Holding -- full balance per NSBU Uzbekistan</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {STEPS.map((s,i)=>(
            <React.Fragment key={s.id}>
              <button onClick={()=>{if(s.id<=step||(orgId&&s.id>1))setStep(s.id)}}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${s.id===step?"bg-blue-600 text-white":s.id<step?"bg-blue-100 text-blue-700":"bg-gray-100 text-gray-500"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.id===step?"bg-white text-blue-600":s.id<step?"bg-blue-600 text-white":"bg-gray-300 text-gray-600"}`}>{s.id}</span>
                {s.title}
              </button>
              {i<STEPS.length-1&&<div className="w-4 h-px bg-gray-300"/>}
            </React.Fragment>
          ))}
        </div>

        {error&&<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        {/* STEP 1: Organization */}
        {step===1&&(
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registration</h2>

            {existingOrgs.length>0&&(
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Existing organizations:</p>
                <div className="flex flex-wrap gap-2">
                  {existingOrgs.map((o:any)=>(
                    <button key={o.id} onClick={()=>{setOrgId(o.id);setStep(2)}} className="px-3 py-1 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-100">{o.name} ({o.mode})</button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-3">Select mode:</p>
            <div className="grid grid-cols-3 gap-3">
              {MODES.map(m=>(
                <button key={m.value} onClick={()=>setOrg({...org,mode:m.value})} className={`p-4 rounded-lg border text-left ${org.mode===m.value?"border-blue-500 bg-blue-50":"border-gray-200 bg-white hover:border-gray-400"}`}>
                  <div className="font-bold text-lg">{m.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <L label="Name"><T value={org.name} onChange={(e:any)=>setOrg({...org,name:e.target.value})} placeholder="OOO Example"/></L>
              <L label="INN" tip="9 digits"><T value={org.inn} onChange={(e:any)=>setOrg({...org,inn:e.target.value})} maxLength={9} placeholder="123456789"/></L>
              <L label="Ownership form"><S value={org.ownership_form} onChange={(e:any)=>setOrg({...org,ownership_form:e.target.value})}>{OWNERSHIP_FORMS.map(f=><option key={f} value={f}>{f}</option>)}</S></L>
              <L label="OKED" tip="Classifier code"><T value={org.oked} onChange={(e:any)=>setOrg({...org,oked:e.target.value})} placeholder="62.01"/></L>
              <L label="Director"><T value={org.director} onChange={(e:any)=>setOrg({...org,director:e.target.value})} placeholder="Karimov A.I."/></L>
              <L label="Registration date"><T type="date" value={org.registration_date} onChange={(e:any)=>setOrg({...org,registration_date:e.target.value})}/></L>
              <L label="Charter capital"><T type="number" value={org.charter_capital} onChange={(e:any)=>setOrg({...org,charter_capital:e.target.value})} placeholder="100000000"/></L>
              <L label="Currency"><S value={org.accounting_currency} onChange={(e:any)=>setOrg({...org,accounting_currency:e.target.value})}>{CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}</S></L>
            </div>
            <div className="col-span-2"><L label="Address"><T value={org.address} onChange={(e:any)=>setOrg({...org,address:e.target.value})} placeholder="Tashkent, Navoi 1"/></L></div>

            <div className="flex justify-between mt-6">
              <div/>
              <button onClick={saveOrg} disabled={!org.name||saving} className="px-6 py-2 bg-blue-600 rounded-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving?"Saving...":"Next →"}</button>
            </div>
          </div>
        )}

        {/* STEPS 2-5: Balance by category */}
        {[2,3,4,5].includes(step)&&(()=>{
          const catMap:{[k:number]:string}={2:"long_term_assets",3:"current_assets",4:"liabilities",5:"equity"};
          const cat=catMap[step]; const info=CATEGORIES[cat]; const accs=accountsByCategory(cat); const total=catTotal(cat);
          return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{info.icon} {info.label}</h2>
              <p className="text-sm text-gray-500 mb-4">Enter balance for each account</p>
              <div className="mb-4"><L label="Period date"><T type="date" value={periodDate} onChange={(e:any)=>setPeriodDate(e.target.value)}/></L></div>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200"><th className="text-left py-2 text-gray-600">Code</th><th className="text-left py-2 text-gray-600">Name</th><th className="text-right py-2 text-gray-600">Debit</th><th className="text-right py-2 text-gray-600">Credit</th><th className="text-right py-2 text-gray-600">Balance</th></tr></thead>
                <tbody>
                  {accs.map(a=>{
                    const row=balanceRows[a.code]||{debit:0,credit:0,balance:0}; const isGroup=a.level===1;
                    return (
                      <tr key={a.code} className={`border-b border-gray-100 ${isGroup?"bg-gray-50 font-semibold":""}`}>
                        <td className="py-2 text-gray-900">{a.code}</td>
                        <td className="py-2 text-gray-700">{a.level>1?" -> ":""}{a.name_ru}</td>
                        <td className="py-2"><input type="number" value={row.debit||""} onChange={e=>updateBalance(a.code,"debit",parseFloat(e.target.value)||0,a.name_ru)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-sm" placeholder="0.00"/></td>
                        <td className="py-2"><input type="number" value={row.credit||""} onChange={e=>updateBalance(a.code,"credit",parseFloat(e.target.value)||0,a.name_ru)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-sm" placeholder="0.00"/></td>
                        <td className="py-2 text-right font-mono text-gray-900">{fmtNum(row.balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="border-t-2 border-gray-300 font-bold"><td colSpan={4} className="py-2 text-gray-900">Total</td><td className="py-2 text-right text-gray-900">{fmtNum(total)}</td></tr></tfoot>
              </table>
              <div className="flex justify-between mt-6">
                <button onClick={()=>setStep(step-1)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back</button>
                <button onClick={()=>step<5?setStep(step+1):setStep(6)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Next →</button>
              </div>
            </div>
          );
        })()}

        {/* STEP 6: Import */}
        {step===6&&(
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Import Data</h2>
            <p className="text-sm text-gray-500 mb-4">Import from Excel/CSV or continue with manual entry</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900">Excel / CSV</h3>
                <p className="text-xs text-gray-500 mt-1">Upload trial balance from 1C</p>
                <input type="file" accept=".xlsx,.csv,.xls" onChange={e=>setImportFile(e.target.files?.[0]||null)} className="mt-3 text-sm"/>
                {importFile&&<button onClick={uploadExcel} disabled={saving} className="mt-2 px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">{saving?"Importing...":"Upload"}</button>}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900">1C OData</h3>
                <p className="text-xs text-gray-500 mt-1">Direct connection to 1C via REST API</p>
                <button className="mt-3 px-4 py-1 bg-gray-200 text-gray-600 rounded text-sm">Configure</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900">Manual Entry</h3>
                <p className="text-xs text-gray-500 mt-1">Already filled in previous steps</p>
                <p className="mt-3 text-sm text-green-600">{Object.keys(balanceRows).length} accounts filled</p>
              </div>
            </div>
            {importResult&&(
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-bold text-green-700">Import complete</p>
                <p className="text-sm text-green-600">Total: {importResult.total} | Imported: {importResult.imported} | Errors: {importResult.failed}</p>
                {importResult.errors?.length>0&&<p className="text-sm text-red-600 mt-1">{importResult.errors.join(", ")}</p>}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <button onClick={()=>setStep(5)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back</button>
              <button onClick={saveBalance} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{saving?"Saving...":"Save and verify balance →"}</button>
            </div>
          </div>
        )}

        {/* STEP 7: Summary */}
        {step===7&&(
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Balance Summary</h2>
            {summary?(
              <>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-700">ASSETS</h3>
                    <p className="text-2xl font-bold text-blue-900 mt-2">{fmtNum(summary.total_assets)}</p>
                    <p className="text-sm text-blue-600 mt-1">Long-term: {fmtNum(summary.long_term_assets)}</p>
                    <p className="text-sm text-blue-600">Current: {fmtNum(summary.current_assets)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-lg font-bold text-green-700">LIABILITIES + EQUITY</h3>
                    <p className="text-2xl font-bold text-green-900 mt-2">{fmtNum(summary.total_liabilities+summary.total_equity)}</p>
                    <p className="text-sm text-green-600 mt-1">Liabilities: {fmtNum(summary.total_liabilities)}</p>
                    <p className="text-sm text-green-600">Equity: {fmtNum(summary.total_equity)}</p>
                  </div>
                </div>
                <div className={`mt-4 p-3 rounded-lg text-center font-bold ${summary.balance_check?"bg-green-50 text-green-700 border border-green-200":"bg-red-50 text-red-700 border border-red-200"}`}>
                  {summary.balance_check?"Balance verified":"Balance does NOT match"}
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">Assets: {fmtNum(summary.total_assets)} | Liabilities+Equity: {fmtNum(summary.total_liabilities+summary.total_equity)} | Date: {summary.period_date}</p>
                <div className="flex justify-between mt-6">
                  <button onClick={()=>setStep(2)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Edit</button>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Export PDF</button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Export Excel</button>
                    <button onClick={()=>{window.location.href="/analytics"}} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Go to Analytics →</button>
                  </div>
                </div>
              </>
            ):(
              <p className="text-gray-500 text-center py-8">Loading summary...</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
