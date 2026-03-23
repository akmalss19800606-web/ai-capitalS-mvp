"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";

const MODEL_LABELS: Record<string, string> = {
  mudaraba: "Мудараба",
  musharaka: "Мушарака",
};

export default function P2PDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (projectId) loadProject(); }, [projectId]);

  const loadProject = async () => {
    setLoading(true); setError("");
    try { setProject(await islamicApi.getP2PProject(projectId)); }
    catch (e: any) { setError(e.message || "Ошибка загрузки проекта"); }
    finally { setLoading(false); }
  };

  const progressPct = project?.funded_amount && project?.target_amount
    ? Math.min(100, Math.round((project.funded_amount / project.target_amount) * 100))
    : 0;

  return (
    <IslamicFinanceLayout title="P2P Проект" titleIcon="🤝">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>← Назад</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Детали P2P проекта</h2>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}><div style={{ fontSize: 32 }}>⏳</div><p>Загрузка...</p></div>}
      {error && <div style={{ padding: 16, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 10, color: C.error }}>❌ {error}</div>}

      {project && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>{project.title}</h3>
                {project.model && <span style={{ display: "inline-block", marginTop: 8, padding: "4px 12px", background: project.model === "mudaraba" ? "#10b981" : "#f59e0b", color: "#fff", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{MODEL_LABELS[project.model] || project.model}</span>}
              </div>
              <div style={{ padding: "8px 16px", background: project.status === "active" ? C.successBg : project.status === "completed" ? C.infoBg : C.warningBg, color: project.status === "active" ? C.success : project.status === "completed" ? C.primary : C.warning, borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
                {project.status === "active" ? "Активный" : project.status === "completed" ? "Завершён" : project.status === "funding" ? "Сбор средств" : project.status}
              </div>
            </div>
            {project.description && <p style={{ margin: "16px 0 0", color: C.text, fontSize: 14, lineHeight: 1.6 }}>{project.description}</p>}
          </div>

          {project.target_amount && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: C.text }}>📈 Прогресс финансирования</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{Number(project.funded_amount || 0).toLocaleString()} UZS</span>
                <span style={{ color: C.muted }}>из {Number(project.target_amount).toLocaleString()} UZS</span>
              </div>
              <div style={{ width: "100%", height: 12, background: C.bg, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct >= 100 ? C.success : C.primary, borderRadius: 6, transition: "width 0.3s" }} />
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: C.muted, textAlign: "right" }}>{progressPct}% собрано</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Мин. вклад", value: project.min_investment ? `${Number(project.min_investment).toLocaleString()} UZS` : null },
              { label: "Ожид. доходность", value: project.expected_return ? `${project.expected_return}%` : null },
              { label: "Срок", value: project.duration ? `${project.duration} мес.` : null },
              { label: "Сектор", value: project.sector },
              { label: "Кол-во инвесторов", value: project.investors_count },
              { label: "Стандарт", value: project.standard },
            ].filter(i => i.value).map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase" }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {project.risks && project.risks.length > 0 && (
            <div style={{ background: C.warningBg, border: `1px solid ${C.warning}`, borderRadius: 14, padding: 20 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.text }}>⚠ Риски</h4>
              <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                {project.risks.map((r: string, i: number) => <li key={i} style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/islamic-finance/p2p")} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>🤝 Все проекты</button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
