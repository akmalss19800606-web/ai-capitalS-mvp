"use client";
import { useState } from "react";
import { C } from "./IslamicFinanceLayout";
import { islamicApi, PurificationResult } from "./api";
import StandardRefBadge from "./StandardRefBadge";

const METHODS = [
  { value: "dividend_cleansing", label: "Очистка дивидендов" },
  { value: "capital_gain_cleansing", label: "Очистка курсового дохода" },
];

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: `1px solid ${C.border}`, borderRadius: 8,
  fontSize: 14, boxSizing: "border-box" as const,
};

interface Props {
  onResult?: (r: PurificationResult) => void;
}

export default function PurificationCalculator({ onResult }: Props) {
  const [positionName, setPositionName] = useState("");
  const [haramPct, setHaramPct] = useState("");
  const [dividendAmount, setDividendAmount] = useState("");
  const [method, setMethod] = useState("dividend_cleansing");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PurificationResult | null>(null);

  const handleCalc = async () => {
    if (!positionName || !haramPct || !dividendAmount) {
      setError("Заполните все обязательные поля");
      return;
    }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await islamicApi.calculatePurification({
        position_name: positionName,
        haram_pct: Number(haramPct),
        dividend_amount: Number(dividendAmount),
        method,
        notes: notes || undefined,
      });
      setResult(res);
      onResult?.(res);
    } catch {
      setError("Ошибка расчёта. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  const preview = positionName && haramPct && dividendAmount
    ? (Number(dividendAmount) * Number(haramPct) / 100).toFixed(2)
    : null;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>
          Очистка дохода (Purification)
        </h3>
        <StandardRefBadge code="SS 21" org="AAOIFI" />
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
        Расчёт суммы очистки на основе доли харам-дохода в компании.
      </p>

      {/* Position name */}
      <div>
        <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>Название позиции / компании *</label>
        <input
          type="text" placeholder="Например: UZSE Aksiya"
          value={positionName} onChange={e => setPositionName(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Haram % */}
      <div>
        <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>Доля харам-дохода (%) *</label>
        <input
          type="number" min="0" max="100" step="0.01" placeholder="0.00"
          value={haramPct} onChange={e => setHaramPct(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Dividend amount */}
      <div>
        <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>Сумма дивиденда (UZS) *</label>
        <input
          type="number" min="0" placeholder="0"
          value={dividendAmount} onChange={e => setDividendAmount(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Method */}
      <div>
        <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>Метод очистки</label>
        <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label style={{ fontSize: 13, color: C.muted, marginBottom: 4, display: "block" }}>Примечание</label>
        <input
          type="text" placeholder="Необязательно"
          value={notes} onChange={e => setNotes(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Preview */}
      {preview && (
        <div style={{ padding: 12, background: C.infoBg, borderRadius: 8, border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: 13, color: C.text }}>
            Предварительно: <strong>{Number(preview).toLocaleString("ru-RU")} UZS</strong> к очистке
          </div>
        </div>
      )}

      {/* Submit */}
      <button onClick={handleCalc} disabled={loading} style={{
        padding: "10px 24px", fontSize: 14, fontWeight: 600,
        background: C.primary, color: "#fff", border: "none",
        borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
      }}>
        {loading ? "Рассчитываю..." : "Рассчитать очистку"}
      </button>

      {error && <div style={{ color: C.error, fontSize: 13 }}>{error}</div>}

      {/* Result */}
      {result && (
        <div style={{ padding: 16, background: C.successBg || "#f0fdf4", borderRadius: 10, border: `1px solid ${C.success}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.success, marginBottom: 8 }}>
            Результат очистки
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, color: C.text }}>
            <div>Позиция:</div><div style={{ fontWeight: 600 }}>{result.position_name}</div>
            <div>Дивиденд:</div><div>{Number(result.dividend_amount).toLocaleString("ru-RU")} UZS</div>
            <div>Харам %:</div><div>{result.haram_pct}%</div>
            <div>Сумма очистки:</div><div style={{ fontWeight: 700, color: C.error }}>{Number(result.purification_amount).toLocaleString("ru-RU")} UZS</div>
            <div>Метод:</div><div>{result.method}</div>
          </div>
        </div>
      )}
    </div>
  );
}
