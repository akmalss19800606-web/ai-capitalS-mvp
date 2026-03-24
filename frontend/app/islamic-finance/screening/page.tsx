"use client";
import { useState } from "react";
import CompanySearchInput from "@/components/islamic/CompanySearchInput";
import ScreeningResultCard from "@/components/islamic/ScreeningResultCard";
import ShariahStatusBadge from "@/components/islamic/ShariahStatusBadge";
import { islamicApi, CompanyItem, ScreeningResult } from "@/components/islamic/api";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, boxSizing: "border-box" as const,
};

interface BatchItem {
  id: string;
  company: CompanyItem | null;
  haramPct: string;
  debtRatio: string;
  interestPct: string;
  result: ScreeningResult | null;
  loading: boolean;
  error: string;
}

function newItem(id: string): BatchItem {
  return { id, company: null, haramPct: "", debtRatio: "", interestPct: "", result: null, loading: false, error: "" };
}

export default function ScreeningPage() {
    const [tab, setTab] = useState<"single" | "batch" | "portfolio">("single");

  // Single screening state
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [haramPct, setHaramPct] = useState("");
  const [debtRatio, setDebtRatio] = useState("");
  const [interestPct, setInterestPct] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Batch state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([newItem("1"), newItem("2")]);
  const [batchRunning, setBatchRunning] = useState(false);
    // Portfolio screening state
  const [portfolioResults, setPortfolioResults] = useState<ScreeningResult[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const runPortfolioScreening = async () => {
    setPortfolioLoading(true);
    try { const results = await islamicApi.getScreeningResults(); setPortfolioResults(results); }
    catch { setPortfolioResults([]); }
    setPortfolioLoading(false);
  };

  const getMode = () =>
    (typeof window !== "undefined" && localStorage.getItem("islamic_mode")) || "individual";

  const handleScreen = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await islamicApi.screenCompany({
        company_id: selectedCompany?.id,
        company_name: selectedCompany?.name_ru || "Неизвестная компания",
        haram_revenue_pct: haramPct ? Number(haramPct) : undefined,
        debt_ratio: debtRatio ? Number(debtRatio) : undefined,
        interest_income_pct: interestPct ? Number(interestPct) : undefined,
        mode: getMode(),
      });
      setResult(res);
    } catch {
      setError("Ошибка скрининга. Проверьте авторизацию.");
    } finally { setLoading(false); }
  };

  const updateBatchItem = (id: string, patch: Partial<BatchItem>) => {
    setBatchItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const runBatch = async () => {
    setBatchRunning(true);
    for (const item of batchItems) {
      if (!item.company) continue;
      updateBatchItem(item.id, { loading: true, error: "", result: null });
      try {
        const res = await islamicApi.screenCompany({
          company_id: item.company.id,
          company_name: item.company.name_ru,
          haram_revenue_pct: item.haramPct ? Number(item.haramPct) : undefined,
          debt_ratio: item.debtRatio ? Number(item.debtRatio) : undefined,
          interest_income_pct: item.interestPct ? Number(item.interestPct) : undefined,
          mode: getMode(),
        });
        updateBatchItem(item.id, { result: res, loading: false });
      } catch { updateBatchItem(item.id, { error: "Ошибка", loading: false }); }
    }
    setBatchRunning(false);
  };

  const scoreColor = (score?: number) => {
    if (score === undefined) return C.muted;
    if (score >= 4) return C.success;
    if (score >= 2.5) return C.warning;
    return C.error;
  };

  return (
    <IslamicFinanceLayout>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {(["single", "batch", "portfolio"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", border: "none", background: "none",
            fontSize: 14, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? C.primary : C.muted,
            borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2, cursor: "pointer",
          }}>
                          {t === "single" ? "🔍 Одиночный" : t === "batch" ? "📋 Батч (сравнение)" : "📊 Портфель"}
          </button>
        ))}
      </div>

      {tab === "single" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Компания (UzSE / ЦКТСБ)</div>
            <CompanySearchInput onSelect={c => setSelectedCompany(c)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Харам-выручка (%)</div>
              <input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="0–5" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Долговая нагрузка (%)</div>
              <input type="number" value={debtRatio} onChange={e => setDebtRatio(e.target.value)} placeholder="0–33" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Процентный доход (%)</div>
              <input type="number" value={interestPct} onChange={e => setInterestPct(e.target.value)} placeholder="0–5" style={inputStyle} />
            </div>
          </div>
          <button onClick={handleScreen} disabled={loading} style={{
            padding: "12px 24px", borderRadius: 8, border: "none",
            background: loading ? C.muted : C.primary, color: "#fff",
            fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", width: "100%",
          }}>
            {loading ? "Анализирую..." : "🔍 Провести скрининг"}
          </button>
          {error && <div style={{ color: C.error, fontSize: 13 }}>{error}</div>}
          {result && <ScreeningResultCard result={result} />}
        </div>
      )}

      {tab === "batch" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: C.muted }}>Добавьте компании для пакетной проверки и сравнения результатов</div>
          {batchItems.map((item, idx) => (
            <div key={item.id} style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 10, background: C.card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Компания {idx + 1}</span>
                {batchItems.length > 2 && (
                  <button onClick={() => setBatchItems(prev => prev.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", color: C.error, cursor: "pointer", fontSize: 18 }}>×</button>
                )}
              </div>
              <CompanySearchInput onSelect={c => updateBatchItem(item.id, { company: c })} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                <input type="number" placeholder="Харам %" value={item.haramPct} onChange={e => updateBatchItem(item.id, { haramPct: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="Долг %" value={item.debtRatio} onChange={e => updateBatchItem(item.id, { debtRatio: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="Процент %" value={item.interestPct} onChange={e => updateBatchItem(item.id, { interestPct: e.target.value })} style={inputStyle} />
              </div>
              {item.loading && <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Анализирую...</div>}
              {item.error && <div style={{ color: C.error, fontSize: 12, marginTop: 6 }}>{item.error}</div>}
              {item.result && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: scoreColor(Number(item.result.score)) }}>{item.result.score?.toFixed(1)}</span>
                  <ShariahStatusBadge status={item.result.status} score={item.result.score} />
                  <span style={{ fontSize: 12, color: C.muted }}>{item.result.company_name}</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setBatchItems(prev => [...prev, newItem(String(Date.now()))])} style={{
              padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.primary}`,
              background: "white", color: C.primary, fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>+ Добавить компанию</button>
            <button onClick={runBatch} disabled={batchRunning || !batchItems.some(i => i.company)} style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: batchRunning ? C.muted : C.primary, color: "#fff",
              fontWeight: 600, fontSize: 14, cursor: batchRunning ? "not-allowed" : "pointer",
            }}>
              {batchRunning ? "Проверяю..." : "▶ Запустить батч"}
            </button>
          </div>

          {batchItems.some(i => i.result) && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 12 }}>📊 Сравнение результатов</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Компания", "Скор 0–5", "Статус", "Харам %", "Долг %"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${C.border}`, color: C.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchItems.filter(i => i.result).map(item => (
                    <tr key={item.id}>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.result!.company_name}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: scoreColor(Number(item.result!.score)) }}>{item.result!.score?.toFixed(1)}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}><ShariahStatusBadge status={item.result!.status} score={item.result!.score} /></td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.haramPct || "—"}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.debtRatio || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

              {/* Portfolio Tab */}
        {tab === "portfolio" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text }}>📊 Массовый скрининг портфеля</h3>
              <button onClick={() => { runPortfolioScreening(); }} style={{ padding: "8px 16px", background: C.primary, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                {portfolioLoading ? "Загрузка..." : "🔄 Запустить скрининг"}
              </button>
            </div>
            {portfolioResults.length === 0 && !portfolioLoading && (
              <p style={{ color: C.muted, fontSize: 13 }}>Нажмите "Запустить скрининг" для проверки всех компаний портфеля.</p>
            )}
            {portfolioResults.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Компания", "Скор 0-5", "Статус", "Харам %", "Долг %"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: `1px solid ${C.border}`, color: C.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolioResults.map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{r.company_name}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: scoreColor(Number(r.score)) }}>{r.score}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}><ShariahStatusBadge status={r.status} score={(r as any).score} /></td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{r.haram_revenue_pct ?? "-"}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>{r.debt_ratio ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      )}
    </IslamicFinanceLayout>
  );
}
