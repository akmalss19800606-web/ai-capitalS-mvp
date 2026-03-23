"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import CurrencyDisplay from "@/components/islamic/CurrencyDisplay";

export default function PurificationPage() {
  const [totalIncome, setTotalIncome] = useState("");
  const [haramPct, setHaramPct] = useState("");
  const [result, setResult] = useState<{ purify: number; clean: number } | null>(null);

  const calculate = () => {
    const income = Number(totalIncome);
    const pct = Number(haramPct);
    if (income > 0 && pct >= 0 && pct <= 100) {
      const purify = Math.round(income * pct / 100);
      setResult({ purify, clean: income - purify });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
    background: C.card, outline: "none",
  };

  return (
    <IslamicFinanceLayout
      title="Очистка дохода (Тазкия)"
      titleIcon="🧽"
      subtitle="Расчёт суммы очистки дохода от харам-компонентов"
      tipText="Введите общий доход и процент харам-выручки из результатов шариатского скрининга. Сумму очистки необходимо направить на благотворительность."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 15, color: C.text, marginBottom: 16 }}>Параметры расчёта</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Общий доход (UZS)</label>
              <input type="number" value={totalIncome} onChange={e => setTotalIncome(e.target.value)} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Харам-выручка (%)</label>
              <input type="number" value={haramPct} onChange={e => setHaramPct(e.target.value)} placeholder="0" min="0" max="100" step="0.1" style={inputStyle} />
            </div>
          </div>
          <button onClick={calculate} style={{
            marginTop: 16, width: "100%", padding: "12px", borderRadius: 12,
            background: C.primary, color: "#fff", fontWeight: 600, fontSize: 14,
            border: "none", cursor: "pointer",
          }}>
            Рассчитать очистку
          </button>
        </div>

        {result && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{
              background: C.errorBg, borderRadius: 16, border: `1px solid ${C.error}`,
              padding: 20, textAlign: "center",
            }}>
              <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Сумма очистки</p>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.error }}>
                <CurrencyDisplay uzs={result.purify} />
              </div>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Направить на благотворительность</p>
            </div>
            <div style={{
              background: C.successBg, borderRadius: 16, border: `1px solid ${C.success}`,
              padding: 20, textAlign: "center",
            }}>
              <p style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Чистый доход</p>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.success }}>
                <CurrencyDisplay uzs={result.clean} />
              </div>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Халяльный доход</p>
            </div>
          </div>
        )}

        <div style={{ background: C.infoBg, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, color: C.primary, lineHeight: 1.6, margin: 0 }}>
            <strong>Основа:</strong> Стандарт AAOIFI SS No. 21. Если доля харам-дохода превышает 5%, инвестиция не соответствует шариату.
            При доле до 5% очистка обязательна.
          </p>
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
