"use client";
import { useEffect, useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Rule {
  id: number;
  rule_id: string;
  investor_profile: string;
  risk_tolerance: string;
  recommended_products: string[];
  allocation_pct: Record<string, number> | null;
  notes: string;
}

export default function RecommendationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfile, setFilterProfile] = useState("");
  const [filterRisk, setFilterRisk] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProfile) params.set("profile", filterProfile);
    if (filterRisk) params.set("risk", filterRisk);
    fetch(`${API}/api/v1/islamic/recommendations?${params}`)
      .then(r => r.json())
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [filterProfile, filterRisk]);

  const profiles = ["", "purchase", "investment", "trade", "leasing", "social", "insurance"];
  const risks = ["", "low", "medium", "high", "any"];

  return (
    <IslamicFinanceLayout title="Рекомендации продуктов" subtitle="Подбор исламских финансовых продуктов">
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
        <select value={filterProfile} onChange={e => setFilterProfile(e.target.value)}
          style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14}}>
          <option value="">Все цели</option>
          {profiles.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:14}}>
          <option value="">Все риски</option>
          {risks.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {loading ? (
        <div style={{textAlign:"center",padding:40,color:C.muted}}>Загрузка...</div>
      ) : rules.length === 0 ? (
        <div style={{textAlign:"center",padding:40,color:C.muted}}>Рекомендации не найдены</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {rules.map(r => (
            <div key={r.rule_id} style={{background:C.card,borderRadius:12,
              border:`1px solid ${C.border}`,padding:16,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:14,fontWeight:600}}>Цель: {r.investor_profile}</div>
              <div style={{fontSize:13,color:C.muted}}>Риск: {r.risk_tolerance}</div>
              <div style={{fontSize:13}}>Продукты: {(r.recommended_products||[]).join(", ")}</div>
              {r.notes && <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
