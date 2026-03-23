"use client";
import { useEffect, useState } from "react";
import { islamicApi, ReferenceItem } from "@/components/islamic/api";
import StandardRefBadge from "@/components/islamic/StandardRefBadge";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const ORG_FILTERS = [
  { key: "", label: "Все" },
  { key: "aaoifi_standard", label: "AAOIFI" },
  { key: "ifsb_standard", label: "IFSB" },
  { key: "local_regulation", label: "Местные" },
];

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState("");

  useEffect(() => {
    setLoading(true);
    islamicApi.getStandards(org || undefined)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [org]);

  const orgLabel = (type: string) =>
    type === "aaoifi_standard" ? "AAOIFI" : type === "ifsb_standard" ? "IFSB" : "Местный";

  return (
    <IslamicFinanceLayout
      title="Стандарты AAOIFI и IFSB"
      titleIcon="📜"
      subtitle="Нормативная база исламских финансов"
      tipText="Фильтруйте стандарты по организации для быстрого поиска нужного документа"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ORG_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setOrg(f.key)}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                border: `1px solid ${org === f.key ? C.primary : C.border}`,
                background: org === f.key ? C.primary : C.card,
                color: org === f.key ? "#fff" : C.muted,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 12, background: C.border, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(item => (
              <div key={item.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                {item.topic && (
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: 6,
                    background: C.infoBg, color: C.primary, fontSize: 12, fontWeight: 500, marginBottom: 8,
                  }}>
                    {item.topic}
                  </span>
                )}
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>{item.name_ru}</h3>
                {item.description_ru && (
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{item.description_ru}</p>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <p style={{ color: C.muted, fontSize: 14 }}>Стандарты не найдены</p>
            )}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
