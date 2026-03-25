"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const STANDARDS = [
  {
    id: "aaoifi",
    name: "AAOIFI SS No. 62",
    org: "AAOIFI",
    thresholds: { debt: 30, interest: 30, haram: 5, receivables: 49 },
    desc: "Standart dlya islamskikh fondov i aktsiy",
  },
  {
    id: "djim",
    name: "DJIM (Dow Jones)",
    org: "S&P Dow Jones",
    thresholds: { debt: 33, interest: 33, haram: 5, receivables: 33 },
    desc: "Dow Jones Islamic Market Index",
  },
  {
    id: "ftse",
    name: "FTSE Shariah",
    org: "FTSE Russell",
    thresholds: { debt: 33, interest: 33, haram: 5, receivables: 50 },
    desc: "FTSE Shariah Global Equity Index",
  },
  {
    id: "msci",
    name: "MSCI Islamic",
    org: "MSCI",
    thresholds: { debt: 33.33, interest: 33.33, haram: 5, receivables: 33.33 },
    desc: "MSCI World Islamic Index",
  },
];

interface CheckResult {
  standard: string;
  compliant: boolean;
  score: number;
  details: { name: string; value: number; threshold: number; pass: boolean }[];
}

export default function ComplianceCheckerPage() {
  const [debt, setDebt] = useState("");
  const [interest, setInterest] = useState("");
  const [haram, setHaram] = useState("");
  const [receivables, setReceivables] = useState("");
  const [marketCap, setMarketCap] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);

  const runCheck = () => {
    const mc = parseFloat(marketCap) || 1;
    const res: CheckResult[] = STANDARDS.map((s) => {
      const checks = [
        { name: "Dolg/Kap", value: (parseFloat(debt) / mc) * 100, threshold: s.thresholds.debt, pass: false },
        { name: "Protsent/Kap", value: (parseFloat(interest) / mc) * 100, threshold: s.thresholds.interest, pass: false },
        { name: "Haram-vyruchka", value: parseFloat(haram) || 0, threshold: s.thresholds.haram, pass: false },
        { name: "Debitorka/Kap", value: (parseFloat(receivables) / mc) * 100, threshold: s.thresholds.receivables, pass: false },
      ];
      checks.forEach((c) => (c.pass = c.value <= c.threshold));
      const passed = checks.filter((c) => c.pass).length;
      return { standard: s.name, compliant: passed === 4, score: (passed / 4) * 100, details: checks };
    });
    setResults(res);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 };

  return (
    <IslamicFinanceLayout title="Komplaens-proverka" titleIcon="✅">
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: C.text }}>✅ Komplaens-proverka po standartam</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[["Obshchiy dolg", debt, setDebt], ["Protsentnye aktivy", interest, setInterest], ["Haram-vyruchka %", haram, setHaram], ["Debitorskaya zadolzhennost", receivables, setReceivables], ["Rynochnaya kapitalizatsiya", marketCap, setMarketCap]].map(([label, val, setter]: any, i: number) => (
          <div key={i}>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>{label}</label>
            <input type="number" value={val} onChange={(e: any) => setter(e.target.value)} style={inputStyle} placeholder="0" />
          </div>
        ))}
      </div>
      <button onClick={runCheck} style={{ padding: "12px 32px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>
        Proverit komplaens
      </button>

      {results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {results.map((r, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${r.compliant ? C.success : C.error}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{r.standard}</span>
                <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: r.compliant ? C.successBg : C.errorBg, color: r.compliant ? C.success : C.error }}>
                  {r.compliant ? "Halal" : "Ne sootvetstvuet"}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: r.compliant ? C.success : C.error, marginBottom: 12 }}>{r.score.toFixed(0)}%</div>
              {r.details.map((d, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                  <span>{d.name}</span>
                  <span style={{ color: d.pass ? C.success : C.error, fontWeight: 600 }}>
                    {d.value.toFixed(1)}% / {d.threshold}% {d.pass ? "✅" : "❌"}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, background: C.infoBg, borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>📝 Standarty proverki</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {STANDARDS.map((s) => (
            <div key={s.id} style={{ background: C.card, borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.org} - {s.desc}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                Dolg: {s.thresholds.debt}% | Protsent: {s.thresholds.interest}% | Haram: {s.thresholds.haram}% | Deb: {s.thresholds.receivables}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
