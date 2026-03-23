"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import MacroIndicatorCard, { MacroIndicator } from "@/components/islamic/MacroIndicatorCard";
import { islamicApi } from "@/components/islamic/api";

interface AnalyticsData {
  total_screenings: number;
  halal_pct: number;
  total_products: number;
  total_zakat: number;
  total_p2p_funded: number;
  active_certs: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [macros, setMacros] = useState<MacroIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analytics, macroData] = await Promise.all([
        islamicApi.getAnalytics(),
        islamicApi.getMacroIndicators(),
      ]);
      setData(analytics);
      setMacros(macroData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const stats = data ? [
    { icon: "🔍", label: "Скринингов", value: data.total_screenings, color: C.primary },
    { icon: "✅", label: "Халяльных %", value: `${data.halal_pct}%`, color: C.success },
    { icon: "💰", label: "Продуктов", value: data.total_products, color: "#8b5cf6" },
    { icon: "💲", label: "Закят (UZS)", value: data.total_zakat?.toLocaleString(), color: "#f59e0b" },
    { icon: "🤝", label: "P2P финанс.", value: data.total_p2p_funded?.toLocaleString(), color: "#06b6d4" },
    { icon: "🏅", label: "Сертификатов", value: data.active_certs, color: "#10b981" },
  ] : [];

  return (
    <IslamicFinanceLayout title="Аналитика" titleIcon="📊">
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: C.text }}>📊 Аналитика исламских финансов</h2>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}>⏳ Загрузка аналитики...</div>}

      {!loading && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase" }}>{s.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {macros.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: C.text }}>🌍 Макро-индикаторы</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {macros.map((m, i) => <MacroIndicatorCard key={i} indicator={m} />)}
              </div>
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>📈 Тренды</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Скрининг за месяц</p>
                <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 800, color: C.primary }}>—</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>Данные загружаются с сервера</p>
              </div>
              <div style={{ background: C.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>P2P за месяц</p>
                <p style={{ margin: "8px 0 0", fontSize: 32, fontWeight: 800, color: "#06b6d4" }}>—</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>Данные загружаются с сервера</p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/islamic-finance")} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>🏠 Dashboard</button>
            <button onClick={() => router.push("/islamic-finance/zakat/history")} style={{ padding: "10px 20px", background: "transparent", color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>📋 История Закят</button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
