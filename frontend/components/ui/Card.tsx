'use client';
import React from 'react';
import { semantic, shadows, radius, spacing, transitions, colors } from '../../lib/design-tokens';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  padding?: string;
  hoverable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  headerRight?: React.ReactNode;
}

export function Card({ children, title, subtitle, padding, hoverable = false, className, style, headerRight }: CardProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className={className}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => hoverable && setHovered(false)}
      style={{
        background: semantic.bgCard,
        borderRadius: radius.xl,
        border: `1px solid ${hovered ? colors.primary[200] : semantic.border}`,
        boxShadow: hovered ? shadows.cardHover : shadows.card,
        padding: padding || spacing[6],
        transition: transitions.normal,
        ...style,
      }}
    >
      {(title || headerRight) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: subtitle ? spacing[1] : spacing[4],
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: semantic.textPrimary,
            margin: 0,
          }}>
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      {subtitle && (
        <p style={{
          fontSize: '13px',
          color: semantic.textMuted,
          margin: `0 0 ${spacing[4]} 0`,
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}