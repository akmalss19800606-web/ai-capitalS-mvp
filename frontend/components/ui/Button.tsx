'use client';
import React from 'react';
import { colors, semantic, radius, spacing, typography, transitions, shadows } from '../../lib/design-tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: `${spacing[1]} ${spacing[3]}`, fontSize: typography.fontSize.sm },
  md: { padding: `${spacing[2]} ${spacing[4]}`, fontSize: typography.fontSize.md },
  lg: { padding: `${spacing[3]} ${spacing[6]}`, fontSize: typography.fontSize.lg },
};

const variantStyles: Record<ButtonVariant, { base: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    base: {
      background: colors.primary[600],
      color: semantic.textInverse,
      border: 'none',
      boxShadow: shadows.xs,
    },
    hover: { background: colors.primary[700] },
  },
  secondary: {
    base: {
      background: semantic.bgCard,
      color: semantic.textPrimary,
      border: `1px solid ${semantic.border}`,
    },
    hover: { background: semantic.bgHover, borderColor: colors.neutral[300] },
  },
  ghost: {
    base: {
      background: 'transparent',
      color: semantic.textSecondary,
      border: '1px solid transparent',
    },
    hover: { background: semantic.bgHover, color: semantic.textPrimary },
  },
  danger: {
    base: {
      background: colors.error[600],
      color: semantic.textInverse,
      border: 'none',
    },
    hover: { background: colors.error[700] },
  },
  success: {
    base: {
      background: colors.success[600],
      color: semantic.textInverse,
      border: 'none',
    },
    hover: { background: colors.success[700] },
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        borderRadius: radius.lg,
        fontWeight: typography.fontWeight.medium,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: transitions.normal,
        width: fullWidth ? '100%' : undefined,
        ...s,
        ...v.base,
        ...(hovered && !disabled ? v.hover : {}),
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}