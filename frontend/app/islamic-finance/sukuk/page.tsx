"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, SukukItem as ApiSukuk } from "@/components/islamic/api";

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
  { id: 1, name: "Сукук Иджара UZ-001", type: "ijara", issuer: "НБУ", nominal: 1000000000, currency: "UZS", coupon_rate: 18.5, maturity_date: "2026-12-15", rating: "A+", status: "active" },
  { id: 2, name: "Сукук Мудараба UZ-002", type: "mudaraba", issuer: "Узпромстройбанк", nominal: 500000000, currency: "UZS", coupon_rate: 20.0, maturity_date: "2027-06-30", rating: "A", status: "active" },
  { id: 3, name: "Сукук Вакала UZ-003", type: "wakala", issuer: "Асакабанк", nominal: 2000000000, currency: "UZS", coupon_rate: 17.0, maturity_date: "2025-03-01", rating: "BBB+", status: "matured" },
];

const typeLabels: Record<string, string> = {
  ijara: "Иджара", mudaraba: "Мудараба", musharaka: "Мушарака",
  wakala: "Вакала", murabaha: "Мурабаха"
};

export default function SukukPage() {
  const [filter, setFilter] = useState<string>("all");
  const [sukuk, setSukuk] = useState<SukukItem[]>(MOCK_SUKUK);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    islamicApi.getSukukList(filter !== "all" ? filter : undefined)
      .then(data => {
        const mapped = data.map((s: ApiSukuk) => ({
          id: s.id, name: s.name, type: s.sukuk_type as SukukItem["type"],
          issuer: s.issuer, nominal: s.nominal_value, currency: s.currency,
          coupon_rate: s.expected_return_pct, maturity_date: s.maturity_date,
          rating: s.rating || "", status: s.status as SukukItem["status"],
        }));
        if (mapped.length > 0) setSukuk(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);
  const filtered = filter === "all" ? sukuk : sukuk.filter(s => s.type === filter);

  const fmt = (n: number) => n.toLocaleString("ru-RU");
  const statusStyle = (s: string) => ({
    active: { bg: "#dcfce7", color: "#166534", label: "Активный" },
    matured: { bg: "#e0e7ff", color: "#3730a3", label: "Погашен" },
    default: { bg: "#fecaca", color: "#991b1b", label: "Дефолт" },
  }[s] || { bg: "#f3f4f6", color: "#374151", label: s });

  return (
    <IslamicFinanceLayout>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          🏛️ Сукук (Исламские облигации)
        </h2>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>
          Доступные сукук на рынке Узбекистана, соответствующие стандартам AAOIFI
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["all", "ijara", "mudaraba", "musharaka", "wakala", "murabaha"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, cursor: "pointer",
              background: filter === t ? C.primary : "#f3f4f6", color: filter === t ? "#fff" : C.text,
            }}>
              {t === "all" ? "Все" : typeLabels[t]}
            </button>
          ))}
        </div>

        {filtered.map(s => {
          const st = statusStyle(s.status);
          return (
            <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.name}</h3>
                  <p style={{ fontSize: 13, color: C.muted }}>{s.issuer} \u2022 {typeLabels[s.type]}</p>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Номинал</div><div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(s.nominal)} {s.currency}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Купон</div><div style={{ fontSize: 14, fontWeight: 600 }}>{s.coupon_rate}%</div></div>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Погашение</div><div style={{ fontSize: 14, fontWeight: 600 }}>{s.maturity_date}</div></div>
                <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Рейтинг</div><div style={{ fontSize: 14, fontWeight: 600 }}>{s.rating}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </IslamicFinanceLayout>
  );
}
