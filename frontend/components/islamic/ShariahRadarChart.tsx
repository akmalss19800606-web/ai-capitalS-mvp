"use client";
import { C } from "./IslamicFinanceLayout";

interface Metric {
  label: string;
  value: number;
  max: number;
}

interface Props {
  metrics: Metric[];
  size?: number;
}

export default function ShariahRadarChart({ metrics, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 30;
  const n = metrics.length;
  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;
  const levels = [0.25, 0.5, 0.75, 1];

  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.sin(i * angleStep),
    cy - r * Math.cos(i * angleStep),
  ];

  const gridLines = levels.map((l) => {
    const pts = Array.from({ length: n }, (_, i) => point(i, R * l));
    return pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  });

  const dataPoints = metrics.map((m, i) => {
    const ratio = Math.min(m.value / m.max, 1);
    return point(i, R * ratio);
  });
  const dataPath = dataPoints.map((p) => `${p[0]},${p[1]}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid polygons */}
      {gridLines.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke={C.border}
          strokeWidth={0.5}
          opacity={0.5}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const [ex, ey] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.border} strokeWidth={0.5} opacity={0.4} />;
      })}

      {/* Data polygon */}
      <polygon
        points={dataPath}
        fill="rgba(37,99,235,0.15)"
        stroke="#2563eb"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#2563eb" />
      ))}

      {/* Labels */}
      {metrics.map((m, i) => {
        const [lx, ly] = point(i, R + 18);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fill: C.muted }}
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}
