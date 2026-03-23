"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Действующий",   color: C.success,  bg: C.successBg },
  expired:  { label: "Истёкший",    color: C.error,    bg: C.errorBg },
  pending:  { label: "На рассмотрении", color: C.warning,  bg: C.warningBg },
  revoked:  { label: "Отозван",     color: C.muted,    bg: C.bg },
};

export default function PoSCDetailPage() {
  const params = useParams();
  const router = useRouter();
  const certId = params?.id as string;
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (certId) loadCert(); }, [certId]);

  const loadCert = async () => {
    setLoading(true); setError("");
    try { setCert(await islamicApi.getPoscCertificate(certId)); }
    catch (e: any) { setError(e.message || "Ошибка загрузки сертификата"); }
    finally { setLoading(false); }
  };

  const statusCfg = cert ? (STATUS_CONFIG[cert.status] || { label: cert.status, color: C.muted, bg: C.bg }) : null;

  return (
    <IslamicFinanceLayout title="Сертификат PoSC" titleIcon="🏅">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>← Назад</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Детали сертификата Proof of Shariah Compliance</h2>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}><div style={{ fontSize: 32 }}>⏳</div><p>Загрузка...</p></div>}
      {error && <div style={{ padding: 16, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 10, color: C.error }}>❌ {error}</div>}

      {cert && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: C.card, border: `2px solid ${statusCfg?.color || C.border}`, borderRadius: 16, padding: 28, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: statusCfg?.color || C.primary }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 36 }}>🏅</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{cert.company_name || certId}</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>ID: {cert.cert_id || certId}</p>
                  </div>
                </div>
                {cert.issued_at && <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Выдан: {new Date(cert.issued_at).toLocaleDateString("ru-RU")}</p>}
                {cert.expires_at && <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>Действителен до: {new Date(cert.expires_at).toLocaleDateString("ru-RU")}</p>}
              </div>
              {statusCfg && (
                <span style={{ padding: "8px 18px", background: statusCfg.bg, color: statusCfg.color, borderRadius: 20, fontSize: 14, fontWeight: 700, border: `1px solid ${statusCfg.color}` }}>
                  {statusCfg.label}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { label: "Стандарт", value: cert.standard },
              { label: "Версия", value: cert.version },
              { label: "Выдавшая организация", value: cert.issuer },
              { label: "Область", value: cert.scope },
              { label: "Страна", value: cert.country },
              { label: "Проверяющий орган", value: cert.auditor },
            ].filter(i => i.value).map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {cert.requirements && cert.requirements.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: C.text }}>✅ Требования совместимости</h4>
              <div style={{ display: "grid", gap: 8 }}>
                {cert.requirements.map((req: string, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", background: C.successBg, borderRadius: 8, border: `1px solid ${C.success}` }}>
                    <span style={{ color: C.success, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ color: C.text, fontSize: 14 }}>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cert.description && (
            <div style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.primary }}>💬 Описание</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{cert.description}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => window.print()} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>🖨 Распечатать сертификат</button>
            <button onClick={() => router.push("/islamic-finance/posc")} style={{ padding: "10px 20px", background: "transparent", color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>🏅 Все сертификаты</button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
