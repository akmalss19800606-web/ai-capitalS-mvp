"use client";
import { C } from "./IslamicFinanceLayout";

interface BarItem {
  label: string;
  value: number;
  limit: number;
  unit?: string;
}

interface Props {
  items: BarItem[];
}

export default function BenchmarkBar({ items }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item) => {
        const pct = Math.min((item.value / (item.limit * 2)) * 100, 100);
        const limitPct = (item.limit / (item.limit * 2)) * 100;
        const over = item.value > item.limit;
        return (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: over ? C.error : C.success }}>
                {item.value.toFixed(1)}{item.unit || "%"}
              </span>
            </div>
            <div style={{ position: "relative", height: 10, background: C.border, borderRadius: 5, overflow: "hidden" }}>
              {/* Value bar */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${pct}%`,
                  background: over ? C.error : C.success,
                  borderRadius: 5,
                  transition: "width 0.3s ease",
                }}
              />
              {/* Limit marker */}
              <div
                style={{
                  position: "absolute",
                  left: `${limitPct}%`,
                  top: -2,
                  width: 2,
                  height: 14,
                  background: C.text,
                  opacity: 0.6,
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              \u043b\u0438\u043c\u0438\u0442: {item.limit}{item.unit || "%"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
