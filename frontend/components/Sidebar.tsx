'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, zIndex as zIndexTokens,
} from '@/lib/design-tokens';

/* ─── SVG Icon helper ─── */
function Icon({ paths, size = 20, ...rest }: { paths: React.ReactNode; size?: number; [k: string]: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {paths}
    </svg>
  );
}

/* ─── Navigation structure (translation keys) ─── */
interface NavGroup { titleKey: string; items: NavItem[] }
interface NavItem { labelKey: string; path: string; icon: React.ReactNode }

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: 'main',
    items: [
      { labelKey: 'dashboard', path: '/',
        icon: <Icon paths={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} /> },
      { labelKey: 'portfolios', path: '/portfolios',
        icon: <Icon paths={<><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M10 5h4v2h-4z"/></>} /> },
      { labelKey: 'decisions', path: '/decisions',
        icon: <Icon paths={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M9 14h6"/><path d="M9 18h6"/></>} /> },
      { labelKey: 'workflows', path: '/workflows',
        icon: <Icon paths={<><rect x="2" y="6" width="6" height="6" rx="1"/><rect x="16" y="6" width="6" height="6" rx="1"/><rect x="9" y="14" width="6" height="6" rx="1"/><path d="M8 9h8"/><path d="M12 9v5"/></>} /> },
    ],
  },
  {
    titleKey: 'analytics',
    items: [
      { labelKey: 'analytics', path: '/analytics',
        icon: <Icon paths={<><path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z"/><circle cx="12" cy="12" r="3"/></>} /> },
      { labelKey: 'aiAnalytics', path: '/ai-analytics',
        icon: <Icon paths={<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>} /> },
      { labelKey: 'stressTest', path: '/stress-testing',
        icon: <Icon paths={<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>} /> },
      { labelKey: 'retrospective', path: '/retrospective',
        icon: <Icon paths={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} /> },
    ],
  },
  {
    titleKey: 'research',
    items: [
      { labelKey: 'dueDiligence', path: '/due-diligence',
        icon: <Icon paths={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>} /> },
      { labelKey: 'islamicFinance', path: '/islamic-finance',
        icon: <Icon paths={<><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M12 12v10"/><path d="M7 9.5v7"/><path d="M17 9.5v7"/></>} /> },
      { labelKey: 'marketUz', path: '/market-uz',
        icon: <Icon paths={<><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></>} /> },
      { labelKey: 'charts', path: '/charts',
        icon: <Icon paths={<><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>} /> },
      { labelKey: 'dashboardBuilder', path: '/dashboard-builder',
        icon: <Icon paths={<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>} /> },
    ],
  },
  {
    titleKey: 'tools',
    items: [
      { labelKey: 'reports', path: '/report',
        icon: <Icon paths={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></>} /> },
      { labelKey: 'dataExchange', path: '/data-exchange',
        icon: <Icon paths={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} /> },
      { labelKey: 'apiGateway', path: '/api-gateway',
        icon: <Icon paths={<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>} /> },
      { labelKey: 'adapters', path: '/market-adapters',
        icon: <Icon paths={<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></>} /> },
      { labelKey: 'calculator', path: '/calculator',
        icon: <Icon paths={<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></>} /> },
    ],
  },
  {
    titleKey: 'system',
    items: [
      { labelKey: 'collaboration', path: '/collaboration',
        icon: <Icon paths={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} /> },
      { labelKey: 'architecture', path: '/architecture',
        icon: <Icon paths={<><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>} /> },
      { labelKey: 'about', path: '/about',
        icon: <Icon paths={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>} /> },
      { labelKey: 'contacts', path: '/contacts',
        icon: <Icon paths={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>} /> },
      { labelKey: 'security', path: '/settings/security',
        icon: <Icon paths={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} /> },
      { labelKey: 'settings', path: '/settings',
        icon: <Icon paths={<><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></>} /> },
    ],
  },
];

/* ─── Chevron icons ─── */
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const XIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

/* ─── Exported: get active nav item for Header breadcrumb ─── */
export function getActiveNavItem(pathname: string, t: any): { label: string; icon: React.ReactNode } | undefined {
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

/* ─── Sidebar Component ─── */
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

  /* ─── Render nav groups (shared between desktop & mobile) ─── */
  const renderNavGroups = (isMobile: boolean) => (
    <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: `${spacing[2]} 0` }}>
      {NAV_GROUPS.map((group, gi) => {
        const groupTitle = (t.nav.groups as any)[group.titleKey] || group.titleKey;
        return (
          <div key={gi} style={{ marginBottom: spacing[1] }}>
            {(!collapsed || isMobile) && (
              <div style={{
                padding: `${spacing[2]} ${spacing[5]} ${spacing[1]}`,
                fontSize: '10px', fontWeight: typography.fontWeight.semibold,
                color: semantic.textMuted, textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wider,
              }}>
                {groupTitle}
              </div>
            )}
            {collapsed && !isMobile && gi > 0 && (
              <div style={{ margin: `${spacing[1]} ${spacing[3]}`, borderTop: `1px solid ${semantic.borderLight}` }} />
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path ||
                (item.path !== '/' && pathname.startsWith(item.path));
              const label = (t.nav.items as any)[item.labelKey] || item.labelKey;
              const isCollapsedDesktop = collapsed && !isMobile;
              return (
                <button key={item.path} onClick={() => navigate(item.path)}
                  title={isCollapsedDesktop ? label : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: spacing[2], border: 'none', cursor: 'pointer', textAlign: 'left',
                    padding: isCollapsedDesktop ? `${spacing[2]} 0` : `${spacing[2]} ${spacing[4]}`,
                    justifyContent: isCollapsedDesktop ? 'center' : 'flex-start',
                    margin: isCollapsedDesktop ? '2px 0' : `1px ${spacing[2]}`,
                    borderRadius: isCollapsedDesktop ? '0' : radius.lg,
                    backgroundColor: isActive ? semantic.bgActive : 'transparent',
                    transition: transitions.color,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = semantic.bgHover;
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{
                    color: isActive ? colors.primary[600] : semantic.textMuted,
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                    transition: transitions.color,
                  }}>
                    {item.icon}
                  </span>
                  {!isCollapsedDesktop && (
                    <span style={{
                      fontSize: typography.fontSize.base, fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                      color: isActive ? colors.primary[700] : semantic.textSecondary,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: transitions.color,
                    }}>
                      {label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  /* ─── Logo block with logo.png ─── */
  const renderLogo = (showText: boolean) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], overflow: 'hidden' }}>
      <img
        src="/logo.png"
        alt="AI Capital"
        width={34}
        height={34}
        style={{ borderRadius: radius.xl, flexShrink: 0 }}
      />
      {showText && (
        <div style={{ whiteSpace: 'nowrap' }}>
          <div style={{
            fontWeight: typography.fontWeight.bold,
            fontSize: typography.fontSize.md,
            color: semantic.textPrimary,
            lineHeight: typography.lineHeight.tight,
          }}>
            {t.appName}
          </div>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: semantic.textMuted,
            marginTop: '1px',
          }}>
            {t.appSub}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Version tag ─── */
  const versionTag = (
    <div style={{
      padding: `${spacing[3]} ${spacing[5]}`,
      borderTop: `1px solid ${semantic.borderLight}`,
      display: 'flex', alignItems: 'center', gap: spacing[1],
    }}>
      <span style={{ fontSize: '10px', color: semantic.textMuted, fontWeight: typography.fontWeight.medium }}>
        {t.version}
      </span>
      <span style={{
        fontSize: '9px', padding: `1px ${spacing[1]}`, borderRadius: radius.sm,
        backgroundColor: colors.warning[100], color: colors.warning[700],
        fontWeight: typography.fontWeight.semibold,
      }}>
        MVP
      </span>
    </div>
  );

  const sidebarContent = (
    <div style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      height: '100vh',
      backgroundColor: semantic.bgSidebar,
      borderRight: `1px solid ${semantic.border}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>
      {/* Logo header */}
      <div style={{
        padding: collapsed ? `${spacing[4]} ${spacing[3]}` : `${spacing[4]} ${spacing[5]}`,
        borderBottom: `1px solid ${semantic.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: '60px',
      }}>
        {renderLogo(!collapsed)}
        {!collapsed && (
          <button onClick={onToggle} title="Свернуть" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: semantic.textMuted,
            padding: spacing[1], borderRadius: radius.md, display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textSecondary)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textMuted)}
          >
            <ChevronLeft />
          </button>
        )}
        {collapsed && (
          <button onClick={onToggle} title="Развернуть" style={{
            position: 'absolute', right: '-12px', top: '20px', width: 24, height: 24,
            borderRadius: radius.full, backgroundColor: semantic.bgCard,
            border: `1px solid ${semantic.border}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: semantic.textMuted, boxShadow: shadows.xs, zIndex: 10,
            transition: transitions.color,
          }}
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
      <aside className="sidebar-desktop" style={{ position: 'relative' }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={onMobileClose}
          style={{
            position: 'fixed', inset: 0, backgroundColor: semantic.bgOverlay,
            zIndex: zIndexTokens.overlay, transition: transitions.normal,
          }}
        />
      )}

      {/* Mobile sidebar */}
      <aside className="sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh',
          zIndex: zIndexTokens.overlay + 10,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button onClick={onMobileClose} style={{
            position: 'absolute', top: spacing[4], right: '-44px',
            width: 36, height: 36, borderRadius: radius.full,
            backgroundColor: semantic.bgCard, border: `1px solid ${semantic.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: shadows.md,
            color: semantic.textMuted,
          }}>
            <XIcon />
          </button>
          <div style={{
            width: 256, height: '100vh', backgroundColor: semantic.bgSidebar,
            borderRight: `1px solid ${semantic.border}`, display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Logo */}
            <div style={{
              padding: `${spacing[4]} ${spacing[5]}`,
              borderBottom: `1px solid ${semantic.borderLight}`,
              display: 'flex', alignItems: 'center', minHeight: '60px',
            }}>
              {renderLogo(true)}
            </div>

            {/* Nav */}
            {renderNavGroups(true)}

            {/* Version */}
            {versionTag}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Hamburger button for mobile ─── */
export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="hamburger-btn" onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', color: semantic.textSecondary,
        padding: spacing[1], borderRadius: radius.lg, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: transitions.color,
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <MenuIcon />
    </button>
  );
}
