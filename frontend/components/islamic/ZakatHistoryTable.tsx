"use client";
import { useEffect, useState } from "react";
import { islamicApi, ZakatHistoryItem } from "./api";
import { C } from "./IslamicFinanceLayout";

export default function ZakatHistoryTable() {
  const [history, setHistory] = useState<ZakatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    islamicApi.getZakatHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ height: 80, background: "#f3f4f6", borderRadius: 16, animation: "pulse 2s infinite" }} />;
  if (history.length === 0) return (
    <p style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: 24 }}>История расчётов пуста</p>
  );

  const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

  const thStyle: React.CSSProperties = {
    padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500,
    color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: `1px solid ${C.border}`, background: "#f9fafb",
  };
  const tdStyle: React.CSSProperties = {
    padding: "10px 12px", fontSize: 13, color: C.text,
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <h3 style={{ fontWeight: 600, fontSize: 15, color: C.text }}>История расчётов</h3>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Дата</th>
              <th style={thStyle}>Активы</th>
              <th style={thStyle}>Закат</th>
              <th style={thStyle}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? C.card : "#f9fafb" }}>
                <td style={tdStyle}>{new Date(item.created_at).toLocaleDateString("ru-RU")}</td>
                <td style={tdStyle}>{fmt(item.assets_total_uzs)} UZS</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: item.is_zakat_due ? C.primary : C.muted }}>
                  {item.is_zakat_due ? `${fmt(item.zakat_due_uzs)} UZS` : "—"}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                    background: item.is_zakat_due ? "#ecfdf5" : "#f3f4f6",
                    color: item.is_zakat_due ? C.primary : C.muted,
                  }}>
                    {item.is_zakat_due ? "Обязателен" : "Не обязателен"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
