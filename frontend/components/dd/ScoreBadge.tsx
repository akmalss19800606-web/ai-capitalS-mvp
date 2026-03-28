'use client';
import React from 'react';

const C = {
  success: '#22c55e',
  successLight: '#f0fdf4',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  error: '#ef4444',
  errorLight: '#fef2f2',
  white: '#ffffff',
} as const;

// ─── Score Badge ──────────────────────────────────────────────────────────
export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 75 ? C.success : score >= 55 ? C.warning : C.error;
  const bg = score >= 75 ? C.successLight : score >= 55 ? C.warningLight : C.errorLight;
  const isLg = size === 'lg';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        borderRadius: isLg ? 12 : 8,
        fontSize: isLg ? 28 : 13,
        padding: isLg ? '12px 24px' : '3px 10px',
        color,
        backgroundColor: bg,
        border: `1.5px solid ${color}30`,
        minWidth: isLg ? 80 : 44,
      }}
    >
      {score.toFixed(1)}
    </span>
  );
}

// ─── Risk Level Badge ─────────────────────────────────────────────────────
export function RiskBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    low: { label: 'Низкий', color: C.success, bg: C.successLight },
    medium: { label: 'Умеренный', color: C.warning, bg: C.warningLight },
    high: { label: 'Высокий', color: '#ea580c', bg: '#fff7ed' },
    critical: { label: 'Критический', color: C.error, bg: C.errorLight },
  };
  const m = map[level] || map.medium;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 600,
        fontSize: 12,
        padding: '4px 12px',
        borderRadius: 8,
        color: m.color,
        backgroundColor: m.bg,
        border: `1px solid ${m.color}25`,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: m.color,
      }} />
      {m.label}
    </span>
  );
}
