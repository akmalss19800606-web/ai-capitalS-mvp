'use client';
import React from 'react';

const C = {
  bg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  primary: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  border: '#e2e8f0',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  'Финансы': '#3b82f6',
  'Юридические': '#8b5cf6',
  'Операционные': '#06b6d4',
  'Рыночные': '#22c55e',
  'Управление': '#f59e0b',
  'ESG': '#ec4899',
};

interface ScoreCard {
  label: string;
  score: number;
  color?: string;
}

interface FinancialHighlightsProps {
  scoreCards: ScoreCard[];
}

export default function FinancialHighlights({ scoreCards }: FinancialHighlightsProps) {
  if (!scoreCards || scoreCards.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      marginBottom: 20,
    }}>
      {scoreCards.map((sc) => {
        const color = sc.color || CATEGORY_COLORS[sc.label] || C.primary;
        const scoreColor = sc.score >= 75 ? C.success : sc.score >= 55 ? color : C.error;
        return (
          <div
            key={sc.label}
            style={{
              backgroundColor: C.white,
              borderRadius: 10,
              boxShadow: C.cardShadow,
              padding: '14px 16px',
              border: `1px solid ${C.border}`,
            }}
          >
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.textMuted,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {sc.label}
            </div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              color: scoreColor,
              marginBottom: 8,
            }}>
              {sc.score.toFixed(1)}
            </div>
            {/* Progress bar */}
            <div style={{
              height: 4,
              backgroundColor: C.bg,
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(sc.score, 100)}%`,
                backgroundColor: scoreColor,
                borderRadius: 2,
                transition: 'width 0.4s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
