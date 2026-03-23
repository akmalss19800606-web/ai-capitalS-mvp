"use client";
import { useState } from "react";
import NisabCard from "@/components/islamic/NisabCard";
import ZakatCalculatorForm from "@/components/islamic/ZakatCalculatorForm";
import ZakatResultCard from "@/components/islamic/ZakatResultCard";
import ZakatHistoryTable from "@/components/islamic/ZakatHistoryTable";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, ZakatResult } from "@/components/islamic/api";

const CORP_FIELDS = [
  { key: "current_assets", label: "\u041e\u0431\u043e\u0440\u043e\u0442\u043d\u044b\u0435 \u0430\u043a\u0442\u0438\u0432\u044b (UZS)" },
  { key: "cash", label: "\u0414\u0435\u043d\u0435\u0436\u043d\u044b\u0435 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430 (UZS)" },
  { key: "receivables", label: "\u0414\u0435\u0431\u0438\u0442\u043e\u0440\u043a\u0430 (UZS)" },
  { key: "inventory", label: "\u0417\u0430\u043f\u0430\u0441\u044b / \u0422\u043e\u0432\u0430\u0440\u044b (UZS)" },
  { key: "short_term_liabilities", label: "\u041a\u0440\u0430\u0442\u043a\u043e\u0441\u0440\u043e\u0447\u043d\u044b\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 (UZS)" },
];

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, boxSizing: "border-box" as const,
};

export default function ZakatPage() {
  const [tab, setTab] = useState<"individual" | "corporate">("individual");
  const [result, setResult] = useState<ZakatResult | null>(null);

  // Corporate state
  const [corpValues, setCorpValues] = useState<Record<string, string>>({});
  const [corpResult, setCorpResult] = useState<ZakatResult | null>(null);
  const [corpLoading, setCorpLoading] = useState(false);
  const [corpError, setCorpError] = useState("");

  const handleCorpCalc = async () => {
    setCorpLoading(true); setCorpError(""); setCorpResult(null);
    try {
      const assets: Record<string, string> = {
        cash: corpValues.cash || "0",
        receivables: corpValues.receivables || "0",
        trade_goods: corpValues.inventory || "0",
      };
      const totalAssets = (Number(corpValues.current_assets) || 0);
      const liabilities = corpValues.short_term_liabilities || "0";
      const res = await islamicApi.calculateZakat({
        zakat_type: "trade",
        assets,
        liabilities,
      });
      setCorpResult(res);
    } catch {
      setCorpError("\u041e\u0448\u0438\u0431\u043a\u0430 \u0440\u0430\u0441\u0447\u0451\u0442\u0430. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435.");
    } finally {
      setCorpLoading(false);
    }
  };

  const exportHistoryCSV = () => {
    const table = document.querySelector("table");
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    const csv = rows.map(row =>
      Array.from(row.querySelectorAll("th, td")).map(cell => `"${cell.textContent}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "zakat_history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <IslamicFinanceLayout
      title="\u0417\u0430\u043a\u044f\u0442"
      titleIcon="\ud83d\udcb0"
      subtitle="\u0420\u0430\u0441\u0447\u0451\u0442 \u0437\u0430\u043a\u0430\u0442\u0430 \u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0435 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043e\u0432 AAOIFI \u0438 \u043d\u0430\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043d\u0438\u0441\u0430\u0431\u0430 \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0430"
      tipText="\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c \u0430\u043a\u0442\u0438\u0432\u043e\u0432 \u0438 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432. \u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442 \u0434\u043e\u0441\u0442\u0438\u0433\u043d\u0443\u0442 \u043b\u0438 \u043d\u0438\u0441\u0430\u0431 \u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0435\u0442 2.5% \u0437\u0430\u043a\u0430\u0442."
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `2px solid ${C.border}` }}>
        {(["individual", "corporate"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", border: "none", background: "none",
            fontSize: 14, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? C.primary : C.muted,
            borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2, cursor: "pointer",
          }}>
            {t === "individual" ? "\ud83d\udc64 \u0424\u0438\u0437\u043b\u0438\u0446\u043e" : "\ud83c\udfe2 \u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439"}
          </button>
        ))}
      </div>

      {tab === "individual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <NisabCard />
          <ZakatCalculatorForm onResult={setResult} />
          {result && <ZakatResultCard result={result} />}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>\ud83d\udcc5 \u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u043e\u0432</h3>
              <button onClick={exportHistoryCSV} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`,
                background: C.card, color: C.text, fontSize: 12, cursor: "pointer", fontWeight: 500,
              }}>\u2b07 \u042d\u043a\u0441\u043f\u043e\u0440\u0442 CSV</button>
            </div>
            <ZakatHistoryTable />
          </div>
        </div>
      )}

      {tab === "corporate" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <NisabCard />
          <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16, marginTop: 0 }}>
              \ud83c\udfe2 \u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439 \u0437\u0430\u043a\u044f\u0442 (AAOIFI FAS 9)
            </h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, marginTop: 0 }}>
              \u0420\u0430\u0441\u0447\u0451\u0442 \u0437\u0430\u043a\u044f\u0442\u0430 \u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0435 \u0431\u0430\u043b\u0430\u043d\u0441\u0430 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438. \u0411\u0430\u0437\u0430 = \u041e\u0431\u043e\u0440\u043e\u0442\u043d\u044b\u0435 \u0430\u043a\u0442\u0438\u0432\u044b \u2212 \u041a\u0440\u0430\u0442\u043a\u043e\u0441\u0440\u043e\u0447\u043d\u044b\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {CORP_FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontWeight: 500, marginBottom: 6, color: C.text, fontSize: 13 }}>{f.label}</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={corpValues[f.key] || ""}
                    onChange={e => setCorpValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleCorpCalc} disabled={corpLoading} style={{
              marginTop: 20, padding: "12px 32px", borderRadius: 8, border: "none",
              background: corpLoading ? C.muted : C.primary, color: "#fff",
              cursor: corpLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
            }}>
              {corpLoading ? "\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u044e..." : "\ud83e\uddee \u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u0442\u044c \u043a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439 \u0437\u0430\u043a\u044f\u0442"}
            </button>
          </div>
          {corpError && <div style={{ padding: 12, background: C.errorBg, borderRadius: 8, color: C.error, fontSize: 14 }}>{corpError}</div>}
          {corpResult && <ZakatResultCard result={corpResult} />}
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
