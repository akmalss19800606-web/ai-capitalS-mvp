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
    if (s >= 4.5) return "Отлично";
    if (s >= 4) return "Хорошо";
    if (s >= 3) return "Допустимо";
    if (s >= 2) return "Под вопросом";
    return "Не соответствует";
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
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.16} fontWeight={700} fill={color}>
          {clampedScore.toFixed(1)}
        </text>
        <text x={cx} y={cy + size * 0.09} textAnchor="middle" fontSize={size * 0.07} fill={C.muted}>
          {"из 5.0"}
        </text>
      </svg>
      <div style={{ fontSize: size * 0.08, fontWeight: 600, color, marginTop: 4 }}>
        {statusLabel}
      </div>
      {/* Scale labels */}
      <div style={{ display: "flex", justifyContent: "space-between", width: size * 0.7, marginTop: 2 }}>
        <span style={{ fontSize: size * 0.055, color: C.muted }}>0</span>
        <span style={{ fontSize: size * 0.055, color: C.muted }}>2.5</span>
        <span style={{ fontSize: size * 0.055, color: C.muted }}>5</span>
      </div>
    </div>
  );
}
