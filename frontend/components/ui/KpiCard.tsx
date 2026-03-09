'use client';
import React from 'react';
import { colors, semantic, shadows, radius, spacing, transitions, typography } from '../../lib/design-tokens';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
}

export function KpiCard({ label, value, change, trend, icon, subtitle }: KpiCardProps) {
  const trendColor = trend === 'up' ? colors.success[600]
    : trend === 'down' ? colors.error[600]
    : semantic.textMuted;

  const trendArrow = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '';

  return (
    <div style={{
      background: semantic.bgCard,
      borderRadius: radius.xl,
      border: `1px solid ${semantic.border}`,
      boxShadow: shadows.card,
      padding: spacing[5],
      transition: transitions.normal,
      flex: '1 1 0',
      minWidth: '200px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[3],
      }}>
        <span style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: semantic.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wider,
        }}>
          {label}
        </span>
        {icon && (
          <span style={{
            width: 36, height: 36,
            borderRadius: radius.lg,
            background: colors.primary[50],
            color: colors.primary[600],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>
            {icon}
          </span>
        )}
      </div>

      <div style={{
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: semantic.textPrimary,
        lineHeight: typography.lineHeight.tight,
        marginBottom: change ? spacing[2] : 0,
      }}>
        {value}
      </div>

      {(change || subtitle) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginTop: spacing[1],
        }}>
          {change && (
            <span style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: trendColor,
            }}>
              {trendArrow} {change}
            </span>
          )}
          {subtitle && (
            <span style={{
              fontSize: typography.fontSize.sm,
              color: semantic.textMuted,
            }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}