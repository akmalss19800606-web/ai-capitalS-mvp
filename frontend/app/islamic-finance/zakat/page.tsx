"use client";
import { useState } from "react";
import NisabCard from "@/components/islamic/NisabCard";
import ZakatCalculatorForm from "@/components/islamic/ZakatCalculatorForm";
import ZakatResultCard from "@/components/islamic/ZakatResultCard";
import ZakatHistoryTable from "@/components/islamic/ZakatHistoryTable";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, ZakatResult } from "@/components/islamic/api";

const CORP_FIELDS = [
  { key: "current_assets", label: "Оборотные активы (UZS)" },
  { key: "cash", label: "Денежные средства (UZS)" },
  { key: "receivables", label: "Дебиторка (UZS)" },
  { key: "inventory", label: "Запасы / Товары (UZS)" },
  { key: "short_term_liabilities", label: "Краткосрочные обязательства (UZS)" },
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
      setCorpError("Ошибка расчёта. Проверьте данные.");
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
    a.href = url;
    a.download = "zakat_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <IslamicFinanceLayout>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
        {(["individual", "corporate"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", border: "none", background: "none",
            fontSize: 14, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? C.primary : C.muted,
            borderBottom: tab === t ? `2px solid ${C.primary}` : "2px solid transparent",
            marginBottom: -2, cursor: "pointer",
          }}>
            {t === "individual" ? "Физлицо" : "Корпоративный"}
          </button>
        ))}
      </div>

      {tab === "individual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <NisabCard />
          <ZakatCalculatorForm onResult={setResult} />
          {result && <ZakatResultCard result={result} />}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 12 }}>
              История расчётов
            </h3>
            <ZakatHistoryTable />
            <button onClick={exportHistoryCSV} style={{
              marginTop: 10, padding: "6px 16px", fontSize: 13,
              border: `1px solid ${C.border}`, borderRadius: 6,
              background: C.card, color: C.text, cursor: "pointer",
            }}>
              Экспорт CSV
            </button>
          </div>
        </div>
      )}

      {tab === "corporate" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
            Корпоративный закят (AAOIFI FAS 9)
          </h3>
          <p style={{ fontSize: 13, color: C.muted, marginTop: -12 }}>
            Расчёт закята на основе баланса компании. База = Оборотные активы − Краткосрочные обязательства
          </p>
          {CORP_FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>{f.label}</label>
              <input
                type="number" min="0" placeholder="0"
                value={corpValues[f.key] || ""}
                onChange={e => setCorpValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <button onClick={handleCorpCalc} disabled={corpLoading} style={{
            padding: "10px 24px", fontSize: 14, fontWeight: 600,
            background: C.primary, color: "#fff", border: "none",
            borderRadius: 8, cursor: corpLoading ? "not-allowed" : "pointer",
          }}>
            {corpLoading ? "Рассчитываю..." : "Рассчитать корпоративный закят"}
          </button>
          {corpError && <div style={{ color: C.error, fontSize: 13 }}>{corpError}</div>}
          {corpResult && <ZakatResultCard result={corpResult} />}
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
