"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";
import StandardRefBadge from "@/components/islamic/StandardRefBadge";

export default function ReferenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const refId = params?.id as string;
  const [ref, setRef] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (refId) loadRef(); }, [refId]);

  const loadRef = async () => {
    setLoading(true); setError("");
    try { setRef(await islamicApi.getReference(refId)); }
    catch (e: any) { setError(e.message || "Ошибка загрузки стандарта"); }
    finally { setLoading(false); }
  };

  return (
    <IslamicFinanceLayout title="Стандарт" titleIcon="📚">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>← Назад</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Детали стандарта</h2>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}>⏳ Загрузка...</div>}
      {error && <div style={{ padding: 16, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 10, color: C.error }}>❌ {error}</div>}

      {ref && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <span style={{ fontSize: 36 }}>📚</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{ref.title}</h3>
                {ref.code && <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>Код: <strong style={{ color: C.primary }}>{ref.code}</strong></p>}
                {ref.organization && <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>Организация: {ref.organization}</p>}
              </div>
              {ref.standard && <StandardRefBadge standard={ref.standard} />}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Версия", value: ref.version },
              { label: "Год", value: ref.year },
              { label: "Категория", value: ref.category },
              { label: "Язык", value: ref.language },
              { label: "Статус", value: ref.status },
            ].filter(i => i.value).map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase" }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {ref.description && (
            <div style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.primary }}>📝 Описание</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{ref.description}</p>
            </div>
          )}

          {ref.sections && ref.sections.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.text }}>📄 Разделы</h4>
              <div style={{ display: "grid", gap: 6 }}>
                {ref.sections.map((s: string, i: number) => (
                  <div key={i} style={{ padding: "8px 12px", background: C.bg, borderRadius: 8, fontSize: 13, color: C.text }}>{i + 1}. {s}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/islamic-finance/references")} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>📚 Все стандарты</button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
