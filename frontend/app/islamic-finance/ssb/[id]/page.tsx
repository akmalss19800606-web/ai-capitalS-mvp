"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";

export default function SSBDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fatwaId = params?.id as string;
  const [fatwa, setFatwa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (fatwaId) loadFatwa(); }, [fatwaId]);

  const loadFatwa = async () => {
    setLoading(true); setError("");
    try { setFatwa(await islamicApi.getFatwa(fatwaId)); }
    catch (e: any) { setError(e.message || "Ошибка загрузки фатвы"); }
    finally { setLoading(false); }
  };

  const categoryColors: Record<string, string> = {
    banking: "#3b82f6",
    investment: "#10b981",
    insurance: "#8b5cf6",
    trade: "#f59e0b",
    zakat: "#ef4444",
    general: "#6b7280",
  };

  return (
    <IslamicFinanceLayout title="Фатва SSB" titleIcon="📖">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>← Назад</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Детали фатвы</h2>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}><div style={{ fontSize: 32 }}>⏳</div><p>Загрузка...</p></div>}
      {error && <div style={{ padding: 16, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 10, color: C.error }}>❌ {error}</div>}

      {fatwa && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>📖</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{fatwa.title}</h3>
                    {fatwa.number && <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>№ {fatwa.number}</p>}
                  </div>
                </div>
                {fatwa.category && (
                  <span style={{ padding: "4px 12px", background: categoryColors[fatwa.category] || C.primary, color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    {fatwa.category}
                  </span>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {fatwa.issued_at && <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Дата: {new Date(fatwa.issued_at).toLocaleDateString("ru-RU")}</p>}
                {fatwa.authority && <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>Орган: {fatwa.authority}</p>}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Стандарт", value: fatwa.standard },
              { label: "Шариатский совет", value: fatwa.ssb_name },
              { label: "Тип", value: fatwa.fatwa_type },
              { label: "Язык", value: fatwa.language },
              { label: "Страна", value: fatwa.country },
            ].filter(i => i.value).map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {fatwa.question && (
            <div style={{ background: C.warningBg, border: `1px solid ${C.warning}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.text }}>❓ Вопрос</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{fatwa.question}</p>
            </div>
          )}

          {fatwa.ruling && (
            <div style={{ background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.success }}>✔ Решение</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{fatwa.ruling}</p>
            </div>
          )}

          {fatwa.reasoning && (
            <div style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.primary }}>💬 Обоснование</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{fatwa.reasoning}</p>
            </div>
          )}

          {fatwa.references && fatwa.references.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.text }}>📚 Источники</h4>
              <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                {fatwa.references.map((ref: string, i: number) => (
                  <li key={i} style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>{ref}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => window.print()} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>🖨 Распечатать</button>
            <button onClick={() => router.push("/islamic-finance/ssb")} style={{ padding: "10px 20px", background: "transparent", color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>📖 Все фатвы</button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
