"use client";
import { C } from "./IslamicFinanceLayout";

export interface MacroIndicator {
  icon: string;
  label: string;
  value: string | number;
  change?: number;
  unit?: string;
  source?: string;
  updated_at?: string;
}

interface Props {
  indicator: MacroIndicator;
  compact?: boolean;
}

export default function MacroIndicatorCard({ indicator, compact }: Props) {
  const isPositive = indicator.change && indicator.change > 0;
  const isNegative = indicator.change && indicator.change < 0;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: compact ? 10 : 14,
      padding: compact ? 12 : 18,
      display: "flex",
      flexDirection: "column",
      gap: compact ? 6 : 10,
      transition: "box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: compact ? 20 : 28 }}>{indicator.icon}</span>
          <span style={{ fontSize: compact ? 11 : 12, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
            {indicator.label}
          </span>
        </div>
        {indicator.change !== undefined && indicator.change !== 0 && (
          <span style={{
            fontSize: compact ? 10 : 12,
            fontWeight: 700,
            color: isPositive ? C.success : isNegative ? C.error : C.muted,
            background: isPositive ? C.successBg : isNegative ? C.errorBg : C.bg,
            padding: "2px 8px",
            borderRadius: 6,
          }}>
            {isPositive ? "↑" : "↓"} {Math.abs(indicator.change).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: compact ? 20 : 28, fontWeight: 800, color: C.text }}>
          {typeof indicator.value === "number" ? indicator.value.toLocaleString() : indicator.value}
        </span>
        {indicator.unit && (
          <span style={{ fontSize: compact ? 11 : 13, color: C.muted, fontWeight: 500 }}>{indicator.unit}</span>
        )}
      </div>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {indicator.source && <span style={{ fontSize: 10, color: C.muted }}>Источник: {indicator.source}</span>}
          {indicator.updated_at && <span style={{ fontSize: 10, color: C.muted }}>{new Date(indicator.updated_at).toLocaleDateString("ru-RU")}</span>}
        </div>
      )}
    </div>
  );
}
