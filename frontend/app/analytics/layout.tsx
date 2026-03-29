'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, zIndex as zIndexTokens,
} from '@/lib/design-tokens';

/* ─── Tab definitions ─────────────────────────────────────────────────────── */
const TABS = [
  { key: 'portfolios',     path: '/analytics/portfolios',     labelRu: 'Портфели',      labelEn: 'Portfolios' },
  { key: 'decisions',      path: '/analytics/decisions',      labelRu: 'Решения',       labelEn: 'Decisions' },
  { key: 'kpi',            path: '/analytics/kpi',            labelRu: 'Аналитика KPI', labelEn: 'KPI Analytics' },
  { key: 'stress-testing', path: '/analytics/stress-testing', labelRu: 'Стресс-тест',   labelEn: 'Stress Test' },
  { key: 'charts',         path: '/analytics/charts',         labelRu: 'Визуализации',  labelEn: 'Charts' },
];

/* ─── SVG Icons ───────────────────────────────────────────────────────────── */
function IconAnalytics() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/* ─── Layout Component ────────────────────────────────────────────────────── */
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  /* Redirect /analytics → /analytics/portfolios */
  useEffect(() => {
    if (pathname === '/analytics') {
      router.replace('/analytics/portfolios');
    }
  }, [pathname, router]);

  const activeTab = TABS.find(tab => pathname.startsWith(tab.path))?.key || 'portfolios';

  const handleExportExcel = () => {
    /* TODO: implement Excel export */
    alert('Excel export — coming soon');
  };

  return (
    <div style={{
      padding: spacing.xl,
      maxWidth: '1440px',
      margin: '0 auto',
      fontFamily: typography.fontFamily,
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
        gap: spacing.md,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <div style={{ color: colors.primary[500] }}><IconAnalytics /></div>
          <h1 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral[900],
            margin: 0,
          }}>
            {t('analyticsTitle', 'Аналитика')}
          </h1>
        </div>

        <button
          onClick={handleExportExcel}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.md}`,
            background: colors.neutral[0],
            color: colors.neutral[700],
            border: `1px solid ${colors.neutral[200]}`,
            borderRadius: radius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            cursor: 'pointer',
            transition: transitions.fast,
          }}
        >
          <IconExport />
          Excel
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        gap: '2px',
        borderBottom: `2px solid ${colors.neutral[200]}`,
        marginBottom: spacing.xl,
        overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path)}
              style={{
                padding: `${spacing.sm} ${spacing.lg}`,
                fontSize: typography.fontSize.sm,
                fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
                color: isActive ? colors.primary[600] : colors.neutral[500],
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${colors.primary[500]}` : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: transitions.fast,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.labelRu}
            </button>
          );
        })}
      </div>

      {/* ── Page content ── */}
      {children}
    </div>
  );
}
