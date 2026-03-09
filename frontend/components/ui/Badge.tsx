'use client';
import React from 'react';
import { statusColors, radius, spacing, typography } from '../../lib/design-tokens';

interface BadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function Badge({ status, label, size = 'md' }: BadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  const c = statusColors[key] || statusColors['draft'];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[1],
      padding: size === 'sm' ? `2px ${spacing[2]}` : `${spacing[1]} ${spacing[3]}`,
      fontSize: size === 'sm' ? '10px' : typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase',
      borderRadius: radius.full,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: size === 'sm' ? 5 : 6,
        height: size === 'sm' ? 5 : 6,
        borderRadius: '50%',
        background: c.text,
      }} />
      {label || status}
    </span>
  );
}