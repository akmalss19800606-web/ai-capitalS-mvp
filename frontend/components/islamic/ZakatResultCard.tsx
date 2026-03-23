"use client";
import { ZakatResult } from "./api";
import CurrencyDisplay from "./CurrencyDisplay";
import { C } from "./IslamicFinanceLayout";

interface Props { result: ZakatResult; }

const cardStyle: React.CSSProperties = {
  background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
  padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export default function ZakatResultCard({ result }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
  const isDue = result.is_zakat_due;

  return (
    <div style={{
      ...cardStyle,
      background: isDue ? "#ecfdf5" : "#f9fafb",
      borderColor: isDue ? C.primary : C.border,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{isDue ? "✅" : "ℹ️"}</span>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Результат расчёта</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
            {isDue ? "Закат обязателен" : "Закат не обязателен"}
          </p>
        </div>
      </div>

      {isDue && (
        <div style={{ marginBottom: 16, background: C.card, borderRadius: 12, border: `1px solid ${C.primary}`, padding: 16 }}>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Сумма заката</p>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>
            <CurrencyDisplay uzs={result.zakat_due_uzs} usd={result.zakat_due_usd} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 13 }}>
        {[
          ["Активы", result.assets_total_uzs],
          ["Обязательства", result.liabilities_uzs],
          ["Чистые активы", result.net_assets_uzs],
          ["Нисаб", result.nisab_uzs],
        ].map(([label, val]) => (
          <div key={String(label)} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 12 }}>
            <p style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{label}</p>
            <p style={{ fontWeight: 600, color: C.text }}>{fmt(val as number)} UZS</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: C.muted, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 12, lineHeight: 1.6 }}>
        {result.explanation}
      </p>
    </div>
  );
}
