"use client";
import { C } from "./IslamicFinanceLayout";

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  description?: string;
  timestamp: string;
  type: "screening" | "zakat" | "product" | "p2p" | "cert" | "profile" | "general";
  link?: string;
}

const TYPE_COLORS: Record<string, string> = {
  screening: "#3b82f6",
  zakat: "#f59e0b",
  product: "#8b5cf6",
  p2p: "#06b6d4",
  cert: "#10b981",
  profile: "#ec4899",
  general: "#6b7280",
};

interface Props {
  activities: ActivityItem[];
  maxItems?: number;
  title?: string;
  onItemClick?: (item: ActivityItem) => void;
}

export default function ActivityFeed({ activities, maxItems = 10, title = "Последняя активность", onItemClick }: Props) {
  const items = activities.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14, color: C.muted }}>💭 Нет активности</p>
      </div>
    );
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
      <h4 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: C.text }}>📰 {title}</h4>
      <div style={{ display: "grid", gap: 0 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 0",
              borderTop: i > 0 ? `1px solid ${C.border}` : "none",
              cursor: onItemClick ? "pointer" : "default",
              alignItems: "flex-start",
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${TYPE_COLORS[item.type] || C.muted}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.title}
              </p>
              {item.description && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.description}
                </p>
              )}
            </div>
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
              {new Date(item.timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
