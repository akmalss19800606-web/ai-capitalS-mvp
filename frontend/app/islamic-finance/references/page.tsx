"use client";
import { useEffect, useState, useMemo } from "react";
import { islamicApi, ReferenceItem } from "@/components/islamic/api";
import StandardRefBadge from "@/components/islamic/StandardRefBadge";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const ORG_FILTERS = [
  { key: "", label: "Все" },
  { key: "aaoifi_standard", label: "AAOIFI" },
  { key: "ifsb_standard", label: "IFSB" },
  { key: "local_regulation", label: "Местные" },
];

const ORG_COLORS: Record<string, string> = {
  aaoifi_standard: C.primary,
  ifsb_standard: C.success,
  local_regulation: "#f59e0b",
};

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    islamicApi.getStandards(org || undefined)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [org]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item =>
      item.name_ru.toLowerCase().includes(q) ||
      (item.description_ru && item.description_ru.toLowerCase().includes(q)) ||
      (item.topic && item.topic.toLowerCase().includes(q))
    );
  }, [items, search]);

  const orgLabel = (type: string) =>
    type === "aaoifi_standard" ? "AAOIFI" : type === "ifsb_standard" ? "IFSB" : "Местный";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
    background: C.card, outline: "none", boxSizing: "border-box",
  };

  return (
    <IslamicFinanceLayout
      title="Стандарты AAOIFI и IFSB"
      titleIcon="📜"
      subtitle="Нормативная база исламских финансов"
      tipText="Фильтруйте стандарты по организации или ищите по названию. Нажмите на карточку для полного описания."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Поиск стандартов..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />

        {/* Org filter + count */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>
            Найдено: {filtered.length}
          </span>
        </div>

        {/* Items */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 80, borderRadius: 12, background: C.border, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 14 }}>Стандарты не найдены</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(item => {
              const isExpanded = expandedId === item.id;
              const color = ORG_COLORS[item.type] || C.muted;
              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  style={{
                    background: C.card, borderRadius: 12,
                    border: `1px solid ${isExpanded ? color : C.border}`,
                    padding: 20, cursor: "pointer", transition: "all 0.2s",
                    boxShadow: isExpanded ? `0 0 0 2px ${color}20` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        {item.topic && (
                          <span style={{
                            display: "inline-block", padding: "2px 10px", borderRadius: 6,
                            background: C.infoBg, color: C.primary, fontSize: 11, fontWeight: 500,
                          }}>
                            {item.topic}
                          </span>
                        )}
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 6,
                          background: `${color}15`, color: color, fontWeight: 600,
                        }}>
                          {orgLabel(item.type)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>
                        {item.name_ru}
                      </h3>
                      {!isExpanded && item.description_ru && (
                        <p style={{
                          fontSize: 13, color: C.muted, lineHeight: 1.5, margin: "6px 0 0",
                          overflow: "hidden", textOverflow: "ellipsis",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {item.description_ru}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      {item.description_ru && (
                        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, margin: "0 0 12px" }}>
                          {item.description_ru}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <StandardRefBadge type={item.type} name={item.name_ru} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
