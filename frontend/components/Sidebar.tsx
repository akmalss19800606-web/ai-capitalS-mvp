'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, zIndex as zIndexTokens,
} from '@/lib/design-tokens';

/* --- SVG Icon helper --- */
function Icon({ paths, size = 20, ...rest }: { paths: React.ReactNode; size?: number; [k: string]: unknown }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths}
    </svg>
  );
}

/* --- Navigation structure (translation keys) --- */
interface NavGroup { titleKey: string; items: NavItem[] }
interface NavItem { labelKey: string; path: string; icon: React.ReactNode }

/* REF-010: Reorganized navigation groups */
const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'main',
    items: [
            { labelKey: 'dashboard', path: '/dashboard',
        icon: <Icon paths={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} /> },
    ],
  },
  {
    titleKey: 'analytics',
    items: [
      { labelKey: 'portfolios', path: '/analytics/portfolios',
        icon: <Icon paths={<><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M10 5h4v2h-4z"/></>} /> },
      { labelKey: 'decisions', path: '/analytics/decisions',
        icon: <Icon paths={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M9 14h6"/><path d="M9 18h6"/></>} /> },
      { labelKey: 'analytics', path: '/analytics/analytics',
        icon: <Icon paths={<><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>} /> },
      { labelKey: 'stressTest', path: '/analytics/stress-test',
        icon: <Icon paths={<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>} /> },
      { labelKey: 'charts', path: '/analytics/visualizations',
        icon: <Icon paths={<><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></>} /> },
    ],
  },
  {
    titleKey: 'research',
    items: [
      { labelKey: 'dueDiligence', path: '/due-diligence',
        icon: <Icon paths={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></>} /> },
      { labelKey: 'islamicFinance', path: '/islamic-finance',
        icon: <Icon paths={<><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><path d="M12 12v10"/><path d="M7 9.5v7"/><path d="M17 9.5v7"/></>} /> },
      { labelKey: 'marketUz', path: '/uz-market',
        icon: <Icon paths={<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>} /> },
      { labelKey: 'investmentCalculator', path: '/calculator',
        icon: <Icon paths={<><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h4"/><path d="M8 18h4"/></>} /> },
    ],
  },
  {
    titleKey: 'tools',
    items: [
      { labelKey: 'reports', path: '/report',
        icon: <Icon paths={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></>} /> },
      { labelKey: 'integrations', path: '/integrations',
        icon: <Icon paths={<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>} /> },
      { labelKey: 'collaboration', path: '/collaboration',
        icon: <Icon paths={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} /> },
      { labelKey: 'settings', path: '/settings',
        icon: <Icon paths={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} /> },
    ],
  },
];

/* --- Chevron icons --- */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
);
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

/* --- Exported: get active nav item for Header breadcrumb --- */
export function getActiveNavItem(pathname: string, t: unknown): { label: string; icon: React.ReactNode } | undefined {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === pathname || (item.path !== '/' && pathname.startsWith(item.path))) {
        const label = (t.nav.items as any)[item.labelKey] || item.labelKey;
        return { label, icon: item.icon };
      }
    }
  }
  return undefined;
}

/* --- Sidebar Component --- */
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  const navigate = (path: string) => {
    router.push(path);
    onMobileClose();
  };

  const sidebarWidth = collapsed ? 68 : 256;

  /* --- Render nav groups (shared between desktop & mobile) --- */
  const renderNavGroups = (isMobile: boolean) => (
    <div style={{ padding: `${spacing[2]} 0`, flex: 1, overflowY: 'auto' }}>
      {NAV_GROUPS.map((group, gi) => {
        const groupTitle = (t.nav.groups as any)[group.titleKey] || group.titleKey;
        return (
          <div key={gi} style={{ marginBottom: spacing[2] }}>
            {(!collapsed || isMobile) && (
              <div style={{
                padding: `${spacing[2]} ${spacing[4]}`,
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                color: semantic.textMuted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
              }}>
                {groupTitle}
              </div>
            )}
            {collapsed && !isMobile && gi > 0 && (
              <div style={{ height: 1, background: semantic.border, margin: `${spacing[2]} ${spacing[3]}` }} />
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              const label = (t.nav.items as any)[item.labelKey] || item.labelKey;
              const isCollapsedDesktop = collapsed && !isMobile;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  title={isCollapsedDesktop ? label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: isCollapsedDesktop ? `${spacing[2]} 0` : `${spacing[2]} ${spacing[4]}`,
                    justifyContent: isCollapsedDesktop ? 'center' : 'flex-start',
                    margin: isCollapsedDesktop ? '2px 0' : `1px ${spacing[2]}`,
                    borderRadius: isCollapsedDesktop ? '0' : radius.lg,
                    backgroundColor: isActive ? semantic.bgActive : 'transparent',
                    color: isActive ? colors.primary[700] : semantic.textSecondary,
                    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                    fontSize: typography.fontSize.sm,
                    transition: transitions.color,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = semantic.bgHover; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ color: isActive ? colors.primary[600] : semantic.textMuted, display: 'flex', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!isCollapsedDesktop && (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  /* --- Logo block with logo.png --- */
  const renderLogo = (showText: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], padding: `0 ${spacing[3]}` }}>
      <img src="/logo.png" alt="AI Capital Management" style={{ width: 48, height: 48, borderRadius: radius.lg, objectFit: 'cover' }} />
      {showText && (
        <div>
          <div style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm, color: semantic.textPrimary }}>
            {t.appName}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
            {t.appSub}
          </div>
        </div>
      )}
    </div>
  );

  /* --- Version tag --- */
  const versionTag = (
    <div style={{ padding: `${spacing[4]}`, textAlign: 'center', fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
      <span>{t.version}</span>&nbsp;&nbsp;<span style={{ background: colors.primary[100], color: colors.primary[700], padding: '2px 8px', borderRadius: radius.full, fontWeight: typography.fontWeight.semibold }}>MVP</span>
    </div>
  );

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%' }}>
      {/* Logo header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[4]} ${spacing[2]}`, borderBottom: `1px solid ${semantic.border}` }}>
        {renderLogo(!collapsed)}
        {!collapsed && (
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: semantic.textMuted, padding: spacing[1] }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textSecondary)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textMuted)}
          >
            <ChevronLeft />
          </button>
        )}
        {collapsed && (
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: semantic.textMuted, padding: spacing[1], position: 'absolute' as const, right: 4, top: 20 }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textSecondary)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textMuted)}
          >
            <ChevronRight />
          </button>
        )}
      </div>
      {/* Navigation groups */}
      {renderNavGroups(false)}
      {/* Version tag */}
      {!collapsed && versionTag}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        position: 'fixed' as const, top: 0, left: 0, bottom: 0,
        width: sidebarWidth, background: semantic.bgSidebar,
        borderRight: `1px solid ${semantic.border}`,
        transition: 'width 0.2s ease',
        zIndex: zIndexTokens.sidebar,
        overflowX: 'hidden' as const,
        display: 'flex', flexDirection: 'column' as const,
      }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={onMobileClose} style={{
          position: 'fixed' as const, inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: zIndexTokens.overlay,
        }} />
      )}

      {/* Mobile sidebar */}
      <aside style={{
        position: 'fixed' as const, top: 0, left: 0, bottom: 0,
        width: 280, background: semantic.bgSidebar,
        borderRight: `1px solid ${semantic.border}`,
        zIndex: zIndexTokens.modal,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
        display: 'flex', flexDirection: 'column' as const,
        overflowY: 'auto' as const,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${spacing[4]} ${spacing[2]}`, borderBottom: `1px solid ${semantic.border}` }}>
          {renderLogo(true)}
          <button onClick={onMobileClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: semantic.textMuted, padding: spacing[1] }}>
            <XIcon />
          </button>
        </div>
        {/* Nav */}
        {renderNavGroups(true)}
        {/* Version */}
        {versionTag}
      </aside>
    </>
  );
}

/* --- Hamburger button for mobile --- */
export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: semantic.textSecondary, padding: spacing[2],
      borderRadius: radius.md, transition: transitions.color,
    }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <MenuIcon />
    </button>
  );
}
