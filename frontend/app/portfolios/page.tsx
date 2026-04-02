/* eslint-disable */
"use client";
import React, { useState, useEffect, useCallback } from "react";
const API = '/api/v1';
function getAuthHeaders(extra:any={}) {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const h: any = { 'Content-Type': 'application/json', ...extra };
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}
function getFileHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

interface Account { id: number; code: string; name_ru: string; name_uz?: string; category: string; level: number; parent_code?: string }
interface BalanceRow { account_code: string; account_name: string; debit: number; credit: number; balance: number }
interface OrgData {
  name: string; inn: string; ownership_form: string; oked: string;
  registration_date: string; director: string; charter_capital: string;
  charter_currency: string; address: string; mode: string; accounting_currency: string;
}
interface NsbuPreviewRow { line_code: string; name_ru: string; col3_begin: number; col4_end: number }
interface NsbuPreview { rows: NsbuPreviewRow[]; sheet_name: string; total_rows: number; period?: string }

const OWNERSHIP_FORMS = ["OOO", "AO", "IP", "GUP", "SP", "ChP"];
const CURRENCIES = ["UZS", "USD", "EUR", "RUB"];
const MODES = [
  { value: "solo", label: "Solo", desc: "Одно юрлицо, один баланс -- ИП, малый/средний бизнес" },
  { value: "branch", label: "Branch", desc: "Одно юрлицо + N филиалов -- банки, розничные сети" },
  { value: "holding", label: "Holding", desc: "N юрлиц + филиалы -- холдинги, группы компаний" },
];

const CATEGORIES: { [k: string]: { label: string; icon: string; color: string } } = {
  long_term_assets: { label: "I. Долгосрочные активы (0100-0900)", icon: "🏗️", color: "blue" },
  current_assets: { label: "II. Текущие активы (1000-5900)", icon: "💰", color: "green" },
  liabilities: { label: "III. Обязательства (6000-7900)", icon: "📋", color: "red" },
  equity: { label: "IV. Собственный капитал (8300-8900)", icon: "🏛️", color: "purple" },
};

const STEPS = [
  { id: 1, title: "Организация", desc: "Регистрация юрлица" },
  { id: 2, title: "Импорт данных", desc: "Excel / 1С / NSBU" },
  { id: 3, title: "Долгосрочные активы", desc: "Счета 0100-0900" },
  { id: 4, title: "Текущие активы", desc: "Счета 1000-5900" },
  { id: 5, title: "Обязательства", desc: "Счета 6000-7900" },
  { id: 6, title: "Собственный капитал", desc: "Счета 8300-8900" },
  { id: 7, title: "Итоги баланса", desc: "Проверка и сохранение" },
];

function T(p: any) {
  return <input {...p} className={`w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 ${p.className || ""}`} />;
}
function L({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{tip && <span className="ml-1 text-gray-400 text-xs">(i)</span>}
      </label>
      {children}
    </div>
  );
}
function S(p: any) {
  return <select {...p} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">{p.children}</select>;
}

export default function PortfoliosPage() {
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [org, setOrg] = useState<OrgData>({
    name: "", inn: "", ownership_form: "OOO", oked: "",
    registration_date: "", director: "", charter_capital: "",
    charter_currency: "UZS", address: "", mode: "solo", accounting_currency: "UZS"
  });
  const [orgId, setOrgId] = useState<number | null>(null);
  const [balanceRows, setBalanceRows] = useState<{ [code: string]: BalanceRow }>({});
  const [periodDate, setPeriodDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [existingOrgs, setExistingOrgs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [nsbuFile, setNsbuFile] = useState<File | null>(null);
  const [nsbuPreview, setNsbuPreview] = useState<any>(null);
  const [nsbuImportResult, setNsbuImportResult] = useState<any>(null);
  const [nsbuSheetName, setNsbuSheetName] = useState("");
  const [importTab, setImportTab] = useState<'excel' | 'nsbu' | '1c' | 'manual'>('nsbu');

  useEffect(() => {
    // FE-12+13: Add .ok check and proper error logging
    fetch(`${API}/chart-of-accounts`, { headers: getAuthHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }).then(setAccounts).catch(err => { console.error('Chart of accounts fetch failed:', err); });
    fetch(`${API}/organizations`, { headers: getAuthHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      }).then(d => { if (Array.isArray(d)) setExistingOrgs(d); }).catch(err => { console.error('Organizations fetch failed:', err); });
  }, []);

  const accountsByCategory = (cat: string) =>
    accounts.filter(a => a.category === cat && a.level >= 1).sort((a, b) => a.code.localeCompare(b.code));

  const updateBalance = (code: string, field: string, value: number, name: string) => {
    setBalanceRows(prev => {
      const row = prev[code] || { account_code: code, account_name: name, debit: 0, credit: 0, balance: 0 };
      const updated = { ...row, [field]: value };
      if (field === "debit" || field === "credit") updated.balance = updated.debit - updated.credit;
      return { ...prev, [code]: updated };
    });
  };

  const catTotal = (cat: string) => {
    const codes = accountsByCategory(cat).map(a => a.code);
    return codes.reduce((s, c) => s + (balanceRows[c]?.balance || 0), 0);
  };

  const loadBalanceFromDB = useCallback(async (oid: number) => {
    try {
      const r = await fetch(`${API}/organizations/${oid}/balance?period_date=${periodDate}`, { headers: getAuthHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        const rows: { [code: string]: BalanceRow } = {};
        data.forEach((entry: any) => {
          rows[entry.account_code] = {
            account_code: entry.account_code,
            account_name: entry.account_name || entry.account_code,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            balance: entry.balance || (entry.debit || 0) - (entry.credit || 0)
          };
        });
        setBalanceRows(rows);
      }
    } catch (e) { console.error('loadBalanceFromDB error:', e); }
  }, [periodDate]);

  const saveOrg = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch(`${API}/organizations`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ ...org, charter_capital: parseFloat(org.charter_capital) || 0 })
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Error");
      const data = await r.json();
      setOrgId(data.id); setStep(2);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const saveBalance = async () => {
    if (!orgId) return;
    setSaving(true); setError("");
    const entries = Object.values(balanceRows).filter(r => r.debit !== 0 || r.credit !== 0 || r.balance !== 0);
    try {
      const r = await fetch(`${API}/organizations/${orgId}/balance`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ organization_id: orgId, period_date: periodDate, entries })
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Error");
      const sr = await fetch(`${API}/organizations/${orgId}/balance/summary?period_date=${periodDate}`, { headers: getAuthHeaders() });
      if (sr.ok) setSummary(await sr.json());
      setStep(7);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const uploadExcel = async () => {
    if (!orgId || !importFile) return;
    setSaving(true); setError(""); setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const r = await fetch(`${API}/organizations/${orgId}/import/excel?period_date=${periodDate}`, {
        method: "POST", body: fd, headers: getFileHeaders()
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Import error");
      const result = await r.json();
      setImportResult(result);
      await loadBalanceFromDB(orgId);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const previewNsbu = async () => {
    if (!nsbuFile || !orgId) return;
    setSaving(true); setError(""); setNsbuPreview(null);
    const fd = new FormData();
    fd.append("file", nsbuFile);
    const params = new URLSearchParams();
    if (nsbuSheetName) params.append("sheet_name", nsbuSheetName);
    try {
      const r = await fetch(`${API}/organizations/${orgId}/import/balance-nsbu/preview?${params}`, {
        method: "POST", body: fd, headers: getFileHeaders()
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Preview error");
      const data = await r.json();
      setNsbuPreview(data);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const importNsbu = async () => {
    if (!orgId || !nsbuFile) return;
    setSaving(true); setError(""); setNsbuImportResult(null);
    const fd = new FormData();
    fd.append("file", nsbuFile);
    const params = new URLSearchParams();
    if (nsbuSheetName) params.append("sheet_name", nsbuSheetName);
    try {
      const r = await fetch(`${API}/organizations/${orgId}/import/balance-nsbu?${params}`, {
        method: "POST", body: fd, headers: getFileHeaders()
      });
      if (!r.ok) throw new Error((await r.json()).detail || "NSBU import error");
      const result = await r.json();
      setNsbuImportResult(result);
      await loadBalanceFromDB(orgId);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const fmtNum = (n: number) => new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Портфели -- Финансовый профиль</h1>
        <p className="text-gray-500">Solo / Branch / Holding -- полный баланс по НСБУ Узбекистан</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button key={s.id}
            onClick={() => { if (s.id <= step || (orgId && s.id > 1)) setStep(s.id); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              s.id === step ? "bg-blue-600 text-white" : s.id < step ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>
            <span>{s.id}</span> <span>{s.title}</span>
            {i < STEPS.length - 1 && <span className="ml-1">→</span>}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* STEP 1: Organization */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Регистрация</h2>
          {existingOrgs.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Существующие организации:</p>
              <div className="flex flex-wrap gap-2">
                {existingOrgs.map((o: any) => (
                  <button key={o.id} onClick={() => { setOrgId(o.id); loadBalanceFromDB(o.id); setStep(2); }}
                    className="px-3 py-1 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-100">
                    {o.name} ({o.mode})
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600 mb-3">Выберите режим:</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {MODES.map(m => (
              <button key={m.value} onClick={() => setOrg({ ...org, mode: m.value })}
                className={`p-4 rounded-lg border text-left ${org.mode === m.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                <div className="font-bold">{m.label}</div>
                <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <L label="Название"><T value={org.name} onChange={(e: any) => setOrg({ ...org, name: e.target.value })} placeholder="OOO Example" /></L>
            <L label="ИНН(i)"><T value={org.inn} onChange={(e: any) => setOrg({ ...org, inn: e.target.value })} maxLength={9} placeholder="123456789" /></L>
            <L label="Форма"><S value={org.ownership_form} onChange={(e: any) => setOrg({ ...org, ownership_form: e.target.value })}>{OWNERSHIP_FORMS.map(f => <option key={f} value={f}>{f}</option>)}</S></L>
            <L label="OKED(i)"><T value={org.oked} onChange={(e: any) => setOrg({ ...org, oked: e.target.value })} placeholder="62.01" /></L>
            <L label="Руководитель"><T value={org.director} onChange={(e: any) => setOrg({ ...org, director: e.target.value })} placeholder="Karimov A.I." /></L>
            <L label="Дата регистрации"><T type="date" value={org.registration_date} onChange={(e: any) => setOrg({ ...org, registration_date: e.target.value })} /></L>
            <L label="Уставный капитал"><T type="number" value={org.charter_capital} onChange={(e: any) => setOrg({ ...org, charter_capital: e.target.value })} placeholder="100000000" /></L>
            <L label="Валюта"><S value={org.accounting_currency} onChange={(e: any) => setOrg({ ...org, accounting_currency: e.target.value })}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</S></L>
          </div>
          <L label="Адрес"><T value={org.address} onChange={(e: any) => setOrg({ ...org, address: e.target.value })} placeholder="Tashkent, Navoi 1" /></L>
          <button onClick={saveOrg} disabled={saving} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Сохранение..." : "Далее →"}
          </button>
        </div>
      )}

      {/* STEP 2: Import Data */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-2">Импорт данных</h2>
          <p className="text-sm text-gray-500 mb-4">Импорт из NSBU баланса, Excel/CSV, или введите вручную</p>
          <div className="flex gap-2 mb-4">
            {(['nsbu', 'excel', '1c', 'manual'] as const).map(tab => (
              <button key={tab} onClick={() => setImportTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${importTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tab === 'nsbu' ? 'NSBU Баланс' : tab === 'excel' ? 'Excel/CSV' : tab === '1c' ? '1C OData' : 'Вручную'}
              </button>
            ))}
          </div>

          {importTab === 'nsbu' && (
            <div>
              <h3 className="font-bold mb-2">Импорт баланса НСБУ</h3>
              <p className="text-sm text-gray-500 mb-3">Загрузите баланс НСБУ (строки 010-780). Формат .xlsx</p>
              <div className="flex gap-4 items-end mb-3">
                <L label="Excel файл">
                  <input type="file" accept=".xlsx,.xls" onChange={(e) => { setNsbuFile(e.target.files?.[0] || null); setNsbuPreview(null); setNsbuImportResult(null); }} className="text-sm" />
                </L>
                <L label="Лист (опционально)">
                  <input value={nsbuSheetName} onChange={(e) => setNsbuSheetName(e.target.value)} placeholder="авто" className="bg-white border border-blue-300 rounded px-2 py-1 text-sm w-40" />
                </L>
              </div>
              {nsbuFile && (
                <div className="flex gap-2 mb-3">
                  <button onClick={previewNsbu} disabled={saving} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                    {saving ? 'Загрузка...' : 'Предпросмотр'}
                  </button>
                  {nsbuPreview && (
                    <button onClick={importNsbu} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                      {saving ? 'Импорт...' : 'Импортировать'}
                    </button>
                  )}
                </div>
              )}
              {nsbuPreview && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Предпросмотр: {nsbuPreview.total_rows || Object.keys(nsbuPreview.lines || {}).length} строк</p>
                  <div className="max-h-64 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                        <th className="px-2 py-1 text-left">Код</th>
                        <th className="px-2 py-1 text-left">Наименование</th>
                        <th className="px-2 py-1 text-right">Начало</th>
                        <th className="px-2 py-1 text-right">Конец</th>
                      </tr></thead>
                      <tbody>
                        {nsbuPreview.lines ? Object.entries(nsbuPreview.lines).map(([code, item]: any) => (
                          <tr key={code} className="border-t">
                            <td className="px-2 py-1 font-mono">{code}</td>
                            <td className="px-2 py-1">{item.name}</td>
                            <td className="px-2 py-1 text-right">{fmtNum(item.begin)}</td>
                            <td className="px-2 py-1 text-right">{fmtNum(item.end)}</td>
                          </tr>
                        )) : nsbuPreview.rows?.map((r: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 font-mono">{r.line_code}</td>
                            <td className="px-2 py-1">{r.name_ru}</td>
                            <td className="px-2 py-1 text-right">{fmtNum(r.col3_begin)}</td>
                            <td className="px-2 py-1 text-right">{fmtNum(r.col4_end)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {nsbuImportResult && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-bold text-green-700">Импорт завершён</p>
                  <p className="text-sm">Импортировано: {nsbuImportResult.import_result?.records_imported || nsbuImportResult.records_imported || 0}</p>
                </div>
              )}
            </div>
          )}

          {importTab === 'excel' && (
            <div>
              <h3 className="font-bold mb-2">Excel / CSV</h3>
              <p className="text-sm text-gray-500">Загрузите оборотно-сальдовую ведомость</p>
              <input type="file" accept=".xlsx,.csv,.xls" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="mt-3 text-sm" />
              {importFile && <button onClick={uploadExcel} disabled={saving} className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{saving ? "Импорт..." : "Загрузить"}</button>}
            </div>
          )}
          {importTab === '1c' && (
            <div>
              <h3 className="font-bold mb-2">1C OData</h3>
              <p className="text-sm text-gray-500">Прямое подключение к 1С через REST API</p>
              <button className="mt-3 px-4 py-2 bg-gray-100 rounded-lg text-sm">Настроить</button>
            </div>
          )}
          {importTab === 'manual' && (
            <div>
              <h3 className="font-bold mb-2">Ручной ввод</h3>
              <p className="text-sm text-gray-500">Заполните баланс вручную на следующих шагах</p>
              <p className="text-sm mt-2">{Object.keys(balanceRows).length} счетов заполнено</p>
            </div>
          )}

          {importResult && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-bold text-green-700">Импорт завершён</p>
              <p className="text-sm">Импортировано: {importResult.records_imported || importResult.imported || 0}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Назад</button>
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Далее →</button>
          </div>
        </div>
      )}

      {/* STEPS 3-6: Balance by category */}
      {[3, 4, 5, 6].includes(step) && (() => {
        const catMap: { [k: number]: string } = { 3: "long_term_assets", 4: "current_assets", 5: "liabilities", 6: "equity" };
        const cat = catMap[step];
        const info = CATEGORIES[cat];
        const accs = accountsByCategory(cat);
        const total = catTotal(cat);
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-2">{info.icon} {info.label}</h2>
            <p className="text-sm text-gray-500 mb-4">Введите данные по каждому счёту</p>
            <L label="Дата периода"><T type="date" value={periodDate} onChange={(e: any) => setPeriodDate(e.target.value)} /></L>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-2 py-2 text-left">Код</th>
                  <th className="px-2 py-2 text-left">Название</th>
                  <th className="px-2 py-2 text-right">Дебет</th>
                  <th className="px-2 py-2 text-right">Кредит</th>
                  <th className="px-2 py-2 text-right">Сальдо</th>
                </tr></thead>
                <tbody>
                  {accs.map(a => {
                    const row = balanceRows[a.code] || { debit: 0, credit: 0, balance: 0 };
                    return (
                      <tr key={a.code} className={`border-t ${a.level === 1 ? 'bg-gray-50 font-bold' : ''}`}>
                        <td className="px-2 py-1 font-mono">{a.code}</td>
                        <td className="px-2 py-1">{a.level > 1 ? " -> " : ""}{a.name_ru}</td>
                        <td className="px-2 py-1"><input type="number" value={row.debit || ""} onChange={(e: any) => updateBalance(a.code, "debit", parseFloat(e.target.value) || 0, a.name_ru)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-sm" placeholder="0.00" /></td>
                        <td className="px-2 py-1"><input type="number" value={row.credit || ""} onChange={(e: any) => updateBalance(a.code, "credit", parseFloat(e.target.value) || 0, a.name_ru)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-sm" placeholder="0.00" /></td>
                        <td className="px-2 py-1 text-right font-mono">{fmtNum(row.balance)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 font-bold bg-blue-50">
                    <td colSpan={4} className="px-2 py-2 text-right">Итого:</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtNum(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(step - 1)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Назад</button>
              <button onClick={() => step < 6 ? setStep(step + 1) : saveBalance()} disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                {step < 6 ? "Далее →" : saving ? "Сохранение..." : "Сохранить и проверить →"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* STEP 7: Summary */}
      {step === 7 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Итоги баланса</h2>
          {summary ? (
            <>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-bold text-blue-700 mb-2">АКТИВЫ</h3>
                  <p className="text-2xl font-bold">{fmtNum(summary.total_assets)}</p>
                  <p className="text-sm text-gray-600">Долгосрочные: {fmtNum(summary.long_term_assets)}</p>
                  <p className="text-sm text-gray-600">Текущие: {fmtNum(summary.current_assets)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-bold text-green-700 mb-2">ПАССИВЫ + КАПИТАЛ</h3>
                  <p className="text-2xl font-bold">{fmtNum(summary.total_liabilities + summary.total_equity)}</p>
                  <p className="text-sm text-gray-600">Обязательства: {fmtNum(summary.total_liabilities)}</p>
                  <p className="text-sm text-gray-600">Капитал: {fmtNum(summary.total_equity)}</p>
                </div>
              </div>
              <div className={`p-3 rounded-lg text-center font-bold ${summary.balance_check ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {summary.balance_check ? "Баланс сходится ✓" : "Баланс НЕ сходится!"}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(3)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Редактировать</button>
                <button onClick={async () => {
                  // FE-11: Use fetch with auth header instead of window.open
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API}/organizations/${orgId}/export/pdf?period_date=${periodDate}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'report.pdf';
                  a.click();
                  URL.revokeObjectURL(a.href);
                }} className="px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Экспорт PDF</button>
                <button onClick={async () => {
                  // FE-11: Use fetch with auth header instead of window.open
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${API}/organizations/${orgId}/export/excel?period_date=${periodDate}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                  const blob = await res.blob();
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'report.xlsx';
                  a.click();
                  URL.revokeObjectURL(a.href);
                }} className="px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Экспорт Excel</button>
                <button onClick={() => { window.location.href = "/analytics"; }} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Аналитика →</button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Загрузка итогов...</p>
          )}
        </div>
      )}
    </div>
  );
}
