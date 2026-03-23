"use client";
import { useState, useEffect, useMemo } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import CurrencyDisplay from "@/components/islamic/CurrencyDisplay";
import CompanySearchInput from "@/components/islamic/CompanySearchInput";
import ShariahStatusBadge from "@/components/islamic/ShariahStatusBadge";
import { islamicApi, CompanyItem, ScreeningResult } from "@/components/islamic/api";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 12,
  border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
  background: C.card, outline: "none", boxSizing: "border-box",
};

const INCOME_CATEGORIES = [
  { key: "dividends", label: "\u0414\u0438\u0432\u0438\u0434\u0435\u043d\u0434\u044b", icon: "\ud83d\udcb5" },
  { key: "salary", label: "\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u0430 / \u043f\u0440\u0435\u043c\u0438\u0438", icon: "\ud83d\udcbc" },
  { key: "sale_profit", label: "\u041f\u0440\u0438\u0431\u044b\u043b\u044c \u043e\u0442 \u043f\u0440\u043e\u0434\u0430\u0436\u0438 \u0430\u043a\u0446\u0438\u0439", icon: "\ud83d\udcc8" },
  { key: "other", label: "\u041f\u0440\u043e\u0447\u0438\u0435 \u0434\u043e\u0445\u043e\u0434\u044b", icon: "\ud83d\udce6" },
];

interface HistoryItem {
  date: string;
  company: string;
  haramPct: number;
  totalIncome: number;
  purifyAmount: number;
}

export default function PurificationPage() {
  // Screening link
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);

  // Manual haram %
  const [manualHaramPct, setManualHaramPct] = useState("");
  const [useScreening, setUseScreening] = useState(true);

  // Income by category
  const [incomes, setIncomes] = useState<Record<string, string>>({});

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Fetch screening when company selected
  useEffect(() => {
    if (!selectedCompany) { setScreeningResult(null); return; }
    setScreeningLoading(true);
    islamicApi.screenCompany({
      company_id: selectedCompany.id,
      company_name: selectedCompany.name_ru,
      mode: (typeof window !== "undefined" && localStorage.getItem("islamic_mode")) || "individual",
    }).then(res => { setScreeningResult(res); setScreeningLoading(false); })
      .catch(() => setScreeningLoading(false));
  }, [selectedCompany]);

  const haramPct = useMemo(() => {
    if (useScreening && screeningResult?.haram_revenue_pct !== undefined) {
      return screeningResult.haram_revenue_pct;
    }
    return Number(manualHaramPct) || 0;
  }, [useScreening, screeningResult, manualHaramPct]);

  const totalIncome = useMemo(() =>
    Object.values(incomes).reduce((s, v) => s + (Number(v) || 0), 0)
  , [incomes]);

  const purifyAmount = useMemo(() => Math.round(totalIncome * haramPct / 100), [totalIncome, haramPct]);
  const cleanAmount = totalIncome - purifyAmount;

  const saveToHistory = () => {
    if (totalIncome <= 0 || haramPct <= 0) return;
    const item: HistoryItem = {
      date: new Date().toLocaleDateString("ru-RU"),
      company: selectedCompany?.name_ru || "\u0420\u0443\u0447\u043d\u043e\u0439 \u0432\u0432\u043e\u0434",
      haramPct, totalIncome, purifyAmount,
    };
    setHistory(prev => [item, ...prev]);
  };

  return (
    <IslamicFinanceLayout
      title="\u041e\u0447\u0438\u0441\u0442\u043a\u0430 \u0434\u043e\u0445\u043e\u0434\u0430 (\u0422\u0430\u0437\u043a\u0438\u044f)"
      titleIcon="\ud83e\uddfc"
      subtitle="\u0420\u0430\u0441\u0447\u0451\u0442 \u0441\u0443\u043c\u043c\u044b \u043e\u0447\u0438\u0441\u0442\u043a\u0438 \u0434\u043e\u0445\u043e\u0434\u0430 \u043e\u0442 \u0445\u0430\u0440\u0430\u043c-\u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u043e\u0432"
      tipText="\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e \u0434\u043b\u044f \u0430\u0432\u0442\u043e\u043f\u043e\u0434\u0442\u044f\u0433\u0438\u0432\u0430\u043d\u0438\u044f \u0445\u0430\u0440\u0430\u043c-% \u0438\u0437 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430, \u0438\u043b\u0438 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043d\u0443\u044e. \u0421\u0443\u043c\u043c\u0443 \u043e\u0447\u0438\u0441\u0442\u043a\u0438 \u043d\u0430\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u043d\u0430 \u0431\u043b\u0430\u0433\u043e\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Company + Screening Link */}
        <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 12px" }}>\ud83d\udd17 \u041f\u0440\u0438\u0432\u044f\u0437\u043a\u0430 \u043a \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0443</h3>
          <CompanySearchInput onSelect={setSelectedCompany} />
          {screeningLoading && <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430...</div>}
          {screeningResult && (
            <div style={{ marginTop: 12, padding: 12, background: C.card, borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <ShariahStatusBadge status={screeningResult.status} />
              <span style={{ fontSize: 13, color: C.text }}>
                \u0425\u0430\u0440\u0430\u043c-\u0432\u044b\u0440\u0443\u0447\u043a\u0430: <strong>{screeningResult.haram_revenue_pct ?? "\u043d/\u0434"}%</strong>
              </span>
              <span style={{ fontSize: 13, color: C.muted }}>\u0421\u043a\u043e\u0440: {screeningResult.score?.toFixed(1)}/5</span>
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text, cursor: "pointer" }}>
              <input type="radio" checked={useScreening} onChange={() => setUseScreening(true)} />
              \u0418\u0437 \u0441\u043a\u0440\u0438\u043d\u0438\u043d\u0433\u0430
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text, cursor: "pointer" }}>
              <input type="radio" checked={!useScreening} onChange={() => setUseScreening(false)} />
              \u0412\u0440\u0443\u0447\u043d\u0443\u044e
            </label>
            {!useScreening && (
              <input type="number" placeholder="\u0425\u0430\u0440\u0430\u043c %" value={manualHaramPct}
                onChange={e => setManualHaramPct(e.target.value)}
                style={{ ...inputStyle, width: 120 }} />
            )}
          </div>
        </div>

        {/* Income by Category */}
        <div style={{ background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>\ud83d\udcb0 \u0414\u043e\u0445\u043e\u0434\u044b \u043f\u043e \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f\u043c</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {INCOME_CATEGORIES.map(cat => (
              <div key={cat.key}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6, color: C.text, fontSize: 13 }}>
                  {cat.icon} {cat.label}
                </label>
                <input type="number" min="0" placeholder="0 UZS"
                  value={incomes[cat.key] || ""}
                  onChange={e => setIncomes(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        {/* Auto Result */}
        {totalIncome > 0 && haramPct > 0 && (
          <div style={{ background: C.card, borderRadius: 12, border: `2px solid ${C.primary}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>\ud83e\uddee \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0447\u0438\u0441\u0442\u043a\u0438</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>\u041e\u0431\u0449\u0438\u0439 \u0434\u043e\u0445\u043e\u0434</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}><CurrencyDisplay amount={totalIncome} /></div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>\u0421\u0443\u043c\u043c\u0430 \u043e\u0447\u0438\u0441\u0442\u043a\u0438 ({haramPct}%)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.error }}><CurrencyDisplay amount={purifyAmount} /></div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>\u0427\u0438\u0441\u0442\u044b\u0439 \u0434\u043e\u0445\u043e\u0434</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.success }}><CurrencyDisplay amount={cleanAmount} /></div>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 12, background: C.warningBg, borderRadius: 8, fontSize: 13, color: "#92400e" }}>
              \u26a0 \u0421\u0443\u043c\u043c\u0443 <strong><CurrencyDisplay amount={purifyAmount} /></strong> \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e \u043d\u0430\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0430 \u0431\u043b\u0430\u0433\u043e\u0442\u0432\u043e\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c (\u0441\u0430\u0434\u0430\u043a\u0430).
            </div>
            <button onClick={saveToHistory} style={{
              marginTop: 12, padding: "10px 24px", borderRadius: 8, border: "none",
              background: C.primary, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>\ud83d\udcbe \u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u044e</button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>\ud83d\udcc5 \u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0447\u0438\u0441\u0442\u043e\u043a</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bg }}>
                  {["\u0414\u0430\u0442\u0430", "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f", "\u0425\u0430\u0440\u0430\u043c %", "\u0414\u043e\u0445\u043e\u0434", "\u041e\u0447\u0438\u0441\u0442\u043a\u0430"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 12px", color: C.text }}>{h.date}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: C.text }}>{h.company}</td>
                    <td style={{ padding: "8px 12px", color: C.warning }}>{h.haramPct}%</td>
                    <td style={{ padding: "8px 12px" }}><CurrencyDisplay amount={h.totalIncome} /></td>
                    <td style={{ padding: "8px 12px", color: C.error, fontWeight: 600 }}><CurrencyDisplay amount={h.purifyAmount} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
