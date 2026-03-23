"use client";
import { C } from "./IslamicFinanceLayout";

interface ShariahGaugeProps {
  score: number; // 0-5
  size?: number;
  label?: string;
}

export default function ShariahGauge({ score, size = 200, label }: ShariahGaugeProps) {
  const clampedScore = Math.max(0, Math.min(5, score));
  const pct = clampedScore / 5;
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size * 0.55;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - (startAngle - endAngle) * pct;

  const arcLength = Math.PI * r;
  const filledLength = arcLength * pct;

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);

  const nx = cx + r * Math.cos(sweepAngle);
  const ny = cy - r * Math.sin(sweepAngle);

  const getColor = (s: number) => {
    if (s >= 4) return C.success;
    if (s >= 2.5) return C.warning;
    return C.error;
  };

  const getLabel = (s: number) => {
    if (s >= 4.5) return "\u041e\u0442\u043b\u0438\u0447\u043d\u043e";
    if (s >= 4) return "\u0425\u043e\u0440\u043e\u0448\u043e";
    if (s >= 3) return "\u0414\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u043e";
    if (s >= 2) return "\u041f\u043e\u0434 \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u043c";
    return "\u041d\u0435 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
  };

  const color = getColor(clampedScore);
  const statusLabel = label || getLabel(clampedScore);
  const strokeW = size * 0.08;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Background arc */}
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
          fill="none" stroke={C.border} strokeWidth={strokeW} strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
          fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${filledLength} ${arcLength}`}
        />
        {/* Needle dot */}
        <circle cx={nx} cy={ny} r={strokeW * 0.6} fill={color} />
        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="700" fill={color}>
          {clampedScore.toFixed(1)}
        </text>
        <text x={cx} y={cy + size * 0.1} textAnchor="middle" fontSize={size * 0.07} fill={C.muted}>
          {"\u0438\u0437 5.0"}
        </text>
      </svg>
      <div style={{ marginTop: 4, fontSize: size * 0.07, fontWeight: 600, color, textAlign: "center" }}>
        {statusLabel}
      </div>
      {/* Scale labels */}
      <div style={{ display: "flex", justifyContent: "space-between", width: size * 0.8, marginTop: 2 }}>
        <span style={{ fontSize: 10, color: C.error }}>0</span>
        <span style={{ fontSize: 10, color: C.warning }}>2.5</span>
        <span style={{ fontSize: 10, color: C.success }}>5</span>
      </div>
    </div>
  );
}
