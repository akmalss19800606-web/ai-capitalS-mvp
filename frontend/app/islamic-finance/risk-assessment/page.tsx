"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const RISK_CATEGORIES = [
  { id: "shariah", name: "Shariatskiy risk", icon: "⚠️", weight: 30, factors: ["Nesootvetstviye AAOIFI", "Haram-aktivy v portfele", "Otsutstviye fatvy SSB"] },
  { id: "market", name: "Rynochnyy risk", icon: "📉", weight: 25, factors: ["Volatilnost sukuk", "Valyutnyy risk UZS/USD", "Likvidnost aktivov"] },
  { id: "credit", name: "Kreditnyy risk", icon: "🏦", weight: 20, factors: ["Defolt emitenta", "Kreditnyy reyting", "Kontragentnyy risk"] },
  { id: "operational", name: "Operatsionnyy risk", icon: "⚙️", weight: 15, factors: ["IT-infrastruktura", "Chelovecheskiy faktor", "Protsessnyye sboi"] },
  { id: "liquidity", name: "Risk likvidnosti", icon: "💧", weight: 10, factors: ["Srok pogasheniya", "Rynok vtorichnykh sdelok", "Cash-flow razryvy"] },
];

export default function RiskAssessmentPage() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);

  const updateScore = (catId: string, value: number) => {
    setScores((prev) => ({ ...prev, [catId]: value }));
  };

  const totalScore = RISK_CATEGORIES.reduce((sum, cat) => {
    const s = scores[cat.id] || 0;
    return sum + (s * cat.weight) / 100;
  }, 0);

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: "Nizkiy", color: C.success, bg: C.successBg };
    if (score >= 50) return { label: "Sredniy", color: C.warning, bg: C.warningBg };
    return { label: "Vysokiy", color: C.error, bg: C.errorBg };
  };

  const risk = getRiskLevel(totalScore);

  return (
    <IslamicFinanceLayout title="Otsenka riskov" titleIcon="🛡️">
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: C.text }}>🛡️ Islamskaya otsenka riskov</h2>
      <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        {RISK_CATEGORIES.map((cat) => (
          <div key={cat.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 20, marginRight: 8 }}>{cat.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>Ves: {cat.weight}%</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{scores[cat.id] || 0}</div>
            </div>
            <input type="range" min={0} max={100} value={scores[cat.id] || 0} onChange={(e: any) => updateScore(cat.id, parseInt(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cat.factors.map((f, i) => (
                <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: C.infoBg, borderRadius: 6, color: C.muted }}>{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowResult(true)} style={{ padding: "12px 32px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>
        Rasschitat risk
      </button>
      {showResult && (
        <div style={{ background: risk.bg, border: `2px solid ${risk.color}`, borderRadius: 14, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: risk.color }}>{totalScore.toFixed(1)}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: risk.color, marginBottom: 8 }}>Uroven riska: {risk.label}</div>
          <div style={{ fontSize: 13, color: C.muted }}>Vzveshennyy ball po 5 kategoriyam riskov islamskikh finansov</div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
