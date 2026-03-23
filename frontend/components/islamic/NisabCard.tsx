"use client";
import { useEffect, useState } from "react";
import { islamicApi, NisabData } from "./api";
import CurrencyDisplay from "./CurrencyDisplay";
import { C } from "./IslamicFinanceLayout";

export default function NisabCard() {
  const [data, setData] = useState<NisabData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    islamicApi.getNisab()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ height: 16, background: "#f3f4f6", borderRadius: 8, width: "33%", marginBottom: 12 }} />
      <div style={{ height: 32, background: "#f3f4f6", borderRadius: 8, width: "66%" }} />
    </div>
  );

  if (!data) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
      borderRadius: 16,
      border: `1px solid ${C.border}`,
      padding: 24,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 500, color: C.primary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
            Нисаб сегодня · AAOIFI (85г золота)
          </p>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            <CurrencyDisplay uzs={data.nisab_uzs} usd={data.nisab_usd} />
          </div>
        </div>
        <div style={{ fontSize: 28 }}>🕌</div>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 16, fontSize: 12, color: C.muted }}>
        <span>Золото: {new Intl.NumberFormat("ru-RU").format(data.gold_price_per_gram_uzs)} UZS/г</span>
        <span>Обновлено: {new Date(data.updated_at).toLocaleDateString("ru-RU")}</span>
      </div>
    </div>
  );
}
