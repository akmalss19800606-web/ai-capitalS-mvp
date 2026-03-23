"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface SukukItem {
  id: number;
  name: string;
  type: "ijara" | "mudaraba" | "musharaka" | "wakala" | "murabaha";
  issuer: string;
  nominal: number;
  currency: string;
  coupon_rate: number;
  maturity_date: string;
  rating: string;
  status: "active" | "matured" | "default";
}

const MOCK_SUKUK: SukukItem[] = [
  { id: 1, name: "\u0421\u0443\u043a\u0443\u043a \u0418\u0434\u0436\u0430\u0440\u0430 UZ-001", type: "ijara", issuer: "\u041d\u0411\u0423", nominal: 1000000000, currency: "UZS", coupon_rate: 18.5, maturity_date: "2026-12-15", rating: "A+", status: "active" },
  { id: 2, name: "\u0421\u0443\u043a\u0443\u043a \u041c\u0443\u0434\u0430\u0440\u0430\u0431\u0430 UZ-002", type: "mudaraba", issuer: "\u0423\u0437\u043f\u0440\u043e\u043c\u0441\u0442\u0440\u043e\u0439\u0431\u0430\u043d\u043a", nominal: 500000000, currency: "UZS", coupon_rate: 20.0, maturity_date: "2027-06-30", rating: "A", status: "active" },
  { id: 3, name: "\u0421\u0443\u043a\u0443\u043a \u0412\u0430\u043a\u0430\u043b\u0430 UZ-003", type: "wakala", issuer: "\u0410\u0441\u0430\u043a\u0430\u0431\u0430\u043d\u043a", nominal: 2000000000, currency: "UZS", coupon_rate: 17.0, maturity_date: "2025-03-01", rating: "BBB+", status: "matured" },
];

const typeLabels: Record<string, string> = {
  ijara: "\u0418\u0434\u0436\u0430\u0440\u0430", mudaraba: "\u041c\u0443\u0434\u0430\u0440\u0430\u0431\u0430", musharaka: "\u041c\u0443\u0448\u0430\u0440\u0430\u043a\u0430",
  wakala: "\u0412\u0430\u043a\u0430\u043b\u0430", murabaha: "\u041c\u0443\u0440\u0430\u0431\u0430\u0445\u0430"
};

export default function SukukPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? MOCK_SUKUK : MOCK_SUKUK.filter(s => s.type === filter);

  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const statusStyle = (s: string) => ({
    active: { bg: "#dcfce7", color: "#166534", label: "\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439" },
    matured: { bg: "#e0e7ff", color: "#3730a3", label: "\u041f\u043e\u0433\u0430\u0448\u0435\u043d" },
    default: { bg: "#fecaca", color: "#991b1b", label: "\u0414\u0435\u0444\u043e\u043b\u0442" },
  }[s] || { bg: C.bg, color: C.muted, label: s });

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          \ud83d\udcc8 \u0421\u0443\u043a\u0443\u043a (\u0418\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0435 \u043e\u0431\u043b\u0438\u0433\u0430\u0446\u0438\u0438)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          \u0420\u0435\u0435\u0441\u0442\u0440 \u0441\u0443\u043a\u0443\u043a\u043e\u0432 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c AAOIFI
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["all", "ijara", "mudaraba", "musharaka", "wakala", "murabaha"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${filter === t ? C.primary : C.border}`,
              background: filter === t ? C.primary : C.card,
              color: filter === t ? "#fff" : C.text
            }}>
              {t === "all" ? "\u0412\u0441\u0435" : typeLabels[t]}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(s => {
            const st = statusStyle(s.status);
            return (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{s.name}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{s.issuer} \u2022 {typeLabels[s.type]}</p>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 8, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { label: "\u041d\u043e\u043c\u0438\u043d\u0430\u043b", value: `${fmt(s.nominal)} ${s.currency}` },
                    { label: "\u041a\u0443\u043f\u043e\u043d", value: `${s.coupon_rate}%` },
                    { label: "\u041f\u043e\u0433\u0430\u0448\u0435\u043d\u0438\u0435", value: s.maturity_date },
                    { label: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433", value: s.rating },
                  ].map((item, i) => (
                    <div key={i} style={{ background: C.bg, borderRadius: 8, padding: 8 }}>
                      <p style={{ margin: 0, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>{item.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: C.text }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p style={{ color: C.muted, textAlign: "center", padding: 40 }}>\u041d\u0435\u0442 \u0441\u0443\u043a\u0443\u043a\u043e\u0432 \u043f\u043e \u0444\u0438\u043b\u044c\u0442\u0440\u0443</p>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
