"use client";
import { useState } from "react";
import CompanySearchInput from "@/components/islamic/CompanySearchInput";
import ScreeningResultCard from "@/components/islamic/ScreeningResultCard";
import { islamicApi, CompanyItem, ScreeningResult } from "@/components/islamic/api";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

export default function ScreeningPage() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [haramPct, setHaramPct] = useState("");
  const [debtRatio, setDebtRatio] = useState("");
  const [interestPct, setInterestPct] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScreen = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await islamicApi.screenCompany({
        company_id: selectedCompany?.id,
        company_name: selectedCompany?.name_ru || "Неизвестная компания",
        haram_revenue_pct: haramPct ? Number(haramPct) : undefined,
        debt_ratio: debtRatio ? Number(debtRatio) : undefined,
        interest_income_pct: interestPct ? Number(interestPct) : undefined,
        mode: (typeof window !== "undefined" && localStorage.getItem("islamic_mode")) || "individual",
      });
      setResult(res);
    } catch {
      setError("Ошибка скрининга. Проверьте авторизацию.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IslamicFinanceLayout
      title="Шариатский скрининг"
      titleIcon="🔍"
      subtitle="AAOIFI SS No. 62 · оценка 0–5"
      tipText="Выберите компанию и укажите финансовые показатели для проверки соответствия шариату"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>{"Параметры скрининга"}</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"Компания (UzSE / ЦКТСБ)"}</label>
            <CompanySearchInput onSelect={setSelectedCompany} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"Харам-выручка (%)"}</label>
              <input
                type="number" value={haramPct} onChange={(e) => setHaramPct(e.target.value)}
                placeholder="0–5"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"Долговая нагрузка (%)"}</label>
              <input
                type="number" value={debtRatio} onChange={(e) => setDebtRatio(e.target.value)}
                placeholder="0–33"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>{"Процентный доход относительно общего дохода (%)"}</label>
              <input
                type="number" value={interestPct} onChange={(e) => setInterestPct(e.target.value)}
                placeholder="0–5"
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            onClick={handleScreen}
            disabled={loading}
            style={{
              padding: "12px 32px", borderRadius: 8, border: "none",
              background: loading ? C.muted : C.primary, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
              marginTop: 20,
            }}
          >
            {loading ? "Анализирую..." : "🔍 Провести скрининг"}
          </button>
        </div>

        {error && (
          <div style={{ padding: 12, background: C.errorBg, borderRadius: 8, border: `1px solid ${C.error}`, color: C.error, fontSize: 14 }}>
            {error}
          </div>
        )}

        {result && <ScreeningResultCard result={result} />}
      </div>
    </IslamicFinanceLayout>
  );
}
