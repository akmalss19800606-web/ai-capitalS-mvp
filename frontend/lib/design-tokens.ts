/**
 * AI Capital Management — Design Tokens v1.0
 * Единый источник правды для всей дизайн-системы.
 * Этап 1, Сессия 1.1
 */

/* ─── Color Palette ─── */
export const colors = {
  /* Primary — основной акцент (финансовый синий) */
  primary: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1e40af',
    800: '#1e3a8a',
    900: '#172554',
  },

  /* Success — прибыль, рост */
  success: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  /* Warning — внимание, ожидание */
  warning: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },

  /* Error — убыток, ошибка */
  error: {
    50:  '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  /* Neutral — текст, фон, границы */
  neutral: {
    0:   '#ffffff',
    25:  '#fcfcfd',
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  /* Gradient — логотип и акцентные элементы */
  gradient: {
    primary: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    accent:  'linear-gradient(135deg, #0ea5e9, #6366f1)',
    subtle:  'linear-gradient(135deg, #f8fafc, #eff6ff)',
  },
} as const;

/* ─── Semantic Colors (быстрый доступ) ─── */
export const semantic = {
  /* Фоны */
  bgApp:       colors.neutral[50],    // #f8fafc — фон приложения
  bgCard:      colors.neutral[0],     // #ffffff — фон карточек
  bgSidebar:   colors.neutral[0],     // #ffffff — фон сайдбара
  bgHover:     colors.neutral[100],   // #f1f5f9 — hover-состояние
  bgActive:    colors.primary[50],    // #eff6ff — активный элемент
  bgInput:     colors.neutral[0],     // #ffffff — фон полей ввода
  bgOverlay:   'rgba(15, 23, 42, 0.4)', // оверлей модалок

  /* Текст */
  textPrimary:   colors.neutral[900],  // #0f172a — основной текст
  textSecondary: colors.neutral[600],  // #475569 — вторичный текст
  textMuted:     colors.neutral[400],  // #94a3b8 — приглушённый
  textInverse:   colors.neutral[0],    // #ffffff — на тёмном фоне
  textLink:      colors.primary[600],  // #2563eb — ссылки
  textLinkHover: colors.primary[700],  // #1e40af — ссылки hover

  /* Границы */
  border:       colors.neutral[200],  // #e2e8f0 — основная граница
  borderLight:  colors.neutral[100],  // #f1f5f9 — лёгкая граница
  borderFocus:  colors.primary[500],  // #3b82f6 — фокус
  borderInput:  colors.neutral[300],  // #cbd5e1 — поля ввода

  /* Статусы */
  profit:  colors.success[600],  // #16a34a — прибыль
  loss:    colors.error[600],    // #dc2626 — убыток
  hold:    colors.warning[600],  // #ca8a04 — ожидание

  /* Акцент */
  accent:      colors.primary[600],   // #2563eb
  accentHover: colors.primary[700],   // #1e40af
  accentLight: colors.primary[100],   // #dbeafe
} as const;

/* ─── Typography ─── */
export const typography = {
  fontFamily: {
    sans:  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono:  "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },

  fontSize: {
    xs:    '11px',
    sm:    '12px',
    base:  '13px',
    md:    '14px',
    lg:    '16px',
    xl:    '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
    '5xl': '36px',
  },

  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },

  lineHeight: {
    tight:  1.2,
    snug:   1.375,
    normal: 1.5,
    relaxed: 1.625,
  },

  letterSpacing: {
    tight:   '-0.01em',
    normal:  '0',
    wide:    '0.025em',
    wider:   '0.05em',
    widest:  '0.1em',
  },
} as const;

/* ─── Spacing ─── */
export const spacing = {
  0:  '0',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

/* ─── Shadows ─── */
export const shadows = {
  none: 'none',
  xs:   '0 1px 2px rgba(0, 0, 0, 0.04)',
  sm:   '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
  md:   '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
  lg:   '0 10px 15px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.04)',
  xl:   '0 20px 25px rgba(0, 0, 0, 0.08), 0 8px 10px rgba(0, 0, 0, 0.04)',
  card:     '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
  cardHover:'0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
  sidebar:  '1px 0 3px rgba(0, 0, 0, 0.04)',
  dropdown: '0 4px 16px rgba(0, 0, 0, 0.12)',
} as const;

/* ─── Border Radius ─── */
export const radius = {
  none: '0',
  sm:   '4px',
  md:   '6px',
  lg:   '8px',
  xl:   '12px',
  '2xl':'16px',
  full: '9999px',
} as const;

/* ─── Transitions ─── */
export const transitions = {
  fast:   'all 0.1s ease',
  normal: 'all 0.2s ease',
  slow:   'all 0.3s ease',
  color:  'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
  shadow: 'box-shadow 0.2s ease',
  transform: 'transform 0.2s ease',
} as const;

/* ─── Z-Index ─── */
export const zIndex = {
  base:     0,
  dropdown: 100,
  sticky:   200,
  sidebar:  300,
  overlay:  400,
  modal:    500,
  toast:    600,
  tooltip:  700,
} as const;

/* ─── Breakpoints ─── */
export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const;

/* ─── Component Styles (готовые стили для частых паттернов) ─── */
export const componentStyles = {
  card: {
    background: semantic.bgCard,
    borderRadius: radius.xl,
    border: `1px solid ${semantic.border}`,
    boxShadow: shadows.card,
    padding: spacing[6],
  },
  cardHover: {
    boxShadow: shadows.cardHover,
    borderColor: colors.primary[200],
  },
  input: {
    background: semantic.bgInput,
    border: `1px solid ${semantic.borderInput}`,
    borderRadius: radius.lg,
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.md,
    transition: transitions.color,
  },
  inputFocus: {
    borderColor: semantic.borderFocus,
    boxShadow: `0 0 0 3px ${colors.primary[100]}`,
  },
  badge: {
    borderRadius: radius.full,
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
} as const;

/* ─── Status Badge Colors ─── */
export const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  active:      { bg: colors.success[50],  text: colors.success[700], border: colors.success[200] },
  completed:   { bg: colors.success[50],  text: colors.success[700], border: colors.success[200] },
  approved:    { bg: colors.success[50],  text: colors.success[700], border: colors.success[200] },
  draft:       { bg: colors.neutral[100], text: colors.neutral[600], border: colors.neutral[200] },
  in_progress: { bg: colors.primary[50],  text: colors.primary[700], border: colors.primary[200] },
  in_review:   { bg: colors.warning[50],  text: colors.warning[700], border: colors.warning[200] },
  review:      { bg: colors.warning[50],  text: colors.warning[700], border: colors.warning[200] },
  rejected:    { bg: colors.error[50],    text: colors.error[700],   border: colors.error[200] },
  error:       { bg: colors.error[50],    text: colors.error[700],   border: colors.error[200] },
};