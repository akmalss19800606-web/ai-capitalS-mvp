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
  const [tab, setTab] = useState<"single" | "batch">("single");

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

  const getMode = () =>
    (typeof window !== "undefined" && localStorage.getItem("islamic_mode")) || "individual";

  const handleScreen = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await islamicApi.screenCompany({
        company_id: selectedCompany?.id,
        company_name: selectedCompany?.name_ru || "\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044f",
        haram_revenue_pct: haramPct ? Number(haramPct) : undefined,
        debt_ratio: debtRatio ? Number(debtRatio) : undefined,
        interest_income_pct: interestPct ? Number(interestPct) : undefined,
        mode: getMode(),
      });
      setResult(res);
    } catch {
      setError("\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044e.");
    } finally {
      setLoading(false);
    }
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
      } catch {
        updateBatchItem(item.id, { error: "\u041e\u0448\u0438\u0431\u043a\u0430", loading: false });
      }
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
    <IslamicFinanceLayout
      title="\u0428\u0430\u0440\u0438\u0430\u0442\u0441\u043a\u0438\u0439 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433"
      titleIcon="\ud83d\udd0d"
      subtitle="AAOIFI SS No. 62 \u00b7 \u043e\u0446\u0435\u043d\u043a\u0430 0\u20135"
      tipText="\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e \u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0435 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438 \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044f \u0448\u0430\u0440\u0438\u0430\u0442\u0443"
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `2px solid ${C.border}`, paddingBottom: 0 }}>
        {(["single", "batch"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", border: "none", background: "none",
            fontSize: 14, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? C.primary : C.muted,
            borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2, cursor: "pointer",
          }}>
            {t === "single" ? "\ud83d\udd0d \u041e\u0434\u0438\u043d\u043e\u0447\u043d\u044b\u0439" : "\ud83d\udccb \u0411\u0430\u0442\u0447 (\u0441\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435)"}
          </button>
        ))}
      </div>

      {tab === "single" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>
              {"\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f (UzSE / \u0426\u041a\u0422\u0421\u0411)"}
            </label>
            <CompanySearchInput onSelect={setSelectedCompany} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"\u0425\u0430\u0440\u0430\u043c-\u0432\u044b\u0440\u0443\u0447\u043a\u0430 (%)"}</label>
              <input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="0\u20135" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"\u0414\u043e\u043b\u0433\u043e\u0432\u0430\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0430 (%)"}</label>
              <input type="number" value={debtRatio} onChange={e => setDebtRatio(e.target.value)} placeholder="0\u201333" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"\u041f\u0440\u043e\u0446\u0435\u043d\u0442\u043d\u044b\u0439 \u0434\u043e\u0445\u043e\u0434 (%)"}</label>
              <input type="number" value={interestPct} onChange={e => setInterestPct(e.target.value)} placeholder="0\u20135" style={inputStyle} />
            </div>
          </div>
          <button onClick={handleScreen} disabled={loading} style={{
            padding: "12px 32px", borderRadius: 8, border: "none",
            background: loading ? C.muted : C.primary, color: "#fff",
            cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
          }}>
            {loading ? "\u0410\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e..." : "\ud83d\udd0d \u041f\u0440\u043e\u0432\u0435\u0441\u0442\u0438 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433"}
          </button>
          {error && <div style={{ padding: 12, background: C.errorBg, borderRadius: 8, color: C.error, fontSize: 14 }}>{error}</div>}
          {result && <ScreeningResultCard result={result} />}
        </div>
      )}

      {tab === "batch" && (
        <div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            {"\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438 \u0434\u043b\u044f \u043f\u0430\u043a\u0435\u0442\u043d\u043e\u0439 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 \u0438 \u0441\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u044f \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432"}
          </p>
          {batchItems.map((item, idx) => (
            <div key={item.id} style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{"\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f"} {idx + 1}</span>
                {batchItems.length > 2 && (
                  <button onClick={() => setBatchItems(prev => prev.filter(i => i.id !== item.id))}
                    style={{ background: "none", border: "none", color: C.error, cursor: "pointer", fontSize: 18 }}>\u00d7</button>
                )}
              </div>
              <CompanySearchInput onSelect={c => updateBatchItem(item.id, { company: c })} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
                <input type="number" placeholder="\u0425\u0430\u0440\u0430\u043c %" value={item.haramPct}
                  onChange={e => updateBatchItem(item.id, { haramPct: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="\u0414\u043e\u043b\u0433 %" value={item.debtRatio}
                  onChange={e => updateBatchItem(item.id, { debtRatio: e.target.value })} style={inputStyle} />
                <input type="number" placeholder="\u041f\u0440\u043e\u0446\u0435\u043d\u0442 %" value={item.interestPct}
                  onChange={e => updateBatchItem(item.id, { interestPct: e.target.value })} style={inputStyle} />
              </div>
              {item.loading && <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>\u0410\u043d\u0430\u043b\u0438\u0437\u0438\u0440\u0443\u044e...</div>}
              {item.error && <div style={{ marginTop: 8, fontSize: 13, color: C.error }}>{item.error}</div>}
              {item.result && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: C.card, borderRadius: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 22, color: scoreColor(item.result.score) }}>{item.result.score?.toFixed(1)}</span>
                  <ShariahStatusBadge status={item.result.status} />
                  <span style={{ fontSize: 13, color: C.muted }}>{item.result.company_name}</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={() => setBatchItems(prev => [...prev, newItem(String(Date.now()))])}
              style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${C.primary}`, background: "white", color: C.primary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              + \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e
            </button>
            <button onClick={runBatch} disabled={batchRunning || batchItems.every(i => !i.company)}
              style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: batchRunning ? C.muted : C.primary, color: "#fff", fontWeight: 600, fontSize: 14, cursor: batchRunning ? "not-allowed" : "pointer" }}>
              {batchRunning ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u044e..." : "\u25b6 \u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0431\u0430\u0442\u0447"}
            </button>
          </div>

          {batchItems.some(i => i.result) && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>\ud83d\udcca \u0421\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bg }}>
                      {["\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f", "\u0421\u043a\u043e\u0440 0\u20135", "\u0421\u0442\u0430\u0442\u0443\u0441", "\u0425\u0430\u0440\u0430\u043c %", "\u0414\u043e\u043b\u0433 %"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchItems.filter(i => i.result).map(item => (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.text }}>{item.result!.company_name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: 700, fontSize: 18, color: scoreColor(item.result!.score) }}>{item.result!.score?.toFixed(1)}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}><ShariahStatusBadge status={item.result!.status} /></td>
                        <td style={{ padding: "10px 12px", color: C.text }}>{item.haramPct || "\u2014"}</td>
                        <td style={{ padding: "10px 12px", color: C.text }}>{item.debtRatio || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
