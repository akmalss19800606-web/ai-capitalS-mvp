'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getActiveNavItem, HamburgerButton } from './Sidebar';
import { useLocale, setStoredLocale, getStoredLocale } from '@/lib/i18n';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography, zIndex as zIndexTokens,
} from '@/lib/design-tokens';
import { useTheme } from '@/lib/theme';

/* ─── Header Component ─── */
interface HeaderProps {
  onHamburgerClick: () => void;
}

/* Safe fetch for user info — never redirects on failure */
async function fetchUserSafe(): Promise<{ full_name: string; email: string } | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    const res = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { full_name: data.full_name || '', email: data.email || '' };
  } catch {
    return null;
  }
}

/* ─── UI-001: Theme Toggle Button ─── */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: radius.lg,
        border: `1px solid ${semantic.border}`,
        background: 'none', cursor: 'pointer',
        color: semantic.textSecondary,
        transition: transitions.color,
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = semantic.bgHover; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {isDark ? (
        /* Sun icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export default function Header({ onHamburgerClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const activeItem = getActiveNavItem(pathname, t);

  // FE-21: Removed pathname from deps — fetch user only once, not on every navigation
  useEffect(() => {
    fetchUserSafe().then(u => {
      if (u) setUser(u);
      else setUser({ full_name: t.header.defaultUser, email: '' });
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const langs = [
    { code: 'ru', label: 'Русский', flag: 'RU' },
    { code: 'uz', label: "O'zbek", flag: 'UZ' },
    { code: 'en', label: 'English', flag: 'EN' },
  ];
  const currentLang = getStoredLocale();

  return (
    <header role="banner" aria-label="Верхняя панель" style={{
      backgroundColor: semantic.bgCard,
      borderBottom: `1px solid ${semantic.border}`,
      padding: `0 ${spacing[6]}`,
      height: '60px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: zIndexTokens.sticky,
      boxShadow: shadows.xs,
    }}>
      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        <div className="hamburger-wrapper">
          <HamburgerButton onClick={onHamburgerClick} />
        </div>
        {activeItem && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <span style={{ color: colors.primary[600], display: 'flex', alignItems: 'center' }}>
              {activeItem.icon}
            </span>
            <span style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: semantic.textPrimary,
            }}>
              {activeItem.label}
            </span>
          </div>
        )}
      </div>

      {/* Right: theme toggle + language + status + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        {/* UI-001: Theme toggle */}
        <ThemeToggle />

        {/* Language switcher */}
        <div ref={langRef} className="relative">
          <button onClick={() => setLangOpen(!langOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: spacing[1],
              background: 'none', border: `1px solid ${semantic.border}`,
              cursor: 'pointer', padding: `5px ${spacing[2]}`, borderRadius: radius.lg,
              fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium,
              color: semantic.textSecondary,
              transition: transitions.color,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = semantic.bgHover; }}
            onMouseLeave={e => { if (!langOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
            </svg>
            {langs.find(l => l.code === currentLang)?.flag || 'RU'}
          </button>

          {langOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: spacing[1],
              width: '140px', backgroundColor: semantic.bgCard, borderRadius: radius.xl,
              border: `1px solid ${semantic.border}`, boxShadow: shadows.dropdown,
              padding: spacing[1], zIndex: zIndexTokens.dropdown,
            }}>
              {langs.map(l => (
                <button key={l.code}
                  onClick={() => { setStoredLocale(l.code as any); setLangOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: spacing[2],
                    padding: `7px ${spacing[2]}`, border: 'none', borderRadius: radius.md,
                    cursor: 'pointer', backgroundColor: currentLang === l.code ? semantic.bgActive : 'transparent',
                    fontSize: typography.fontSize.sm,
                    color: currentLang === l.code ? colors.primary[600] : semantic.textSecondary,
                    fontWeight: currentLang === l.code ? typography.fontWeight.semibold : typography.fontWeight.normal,
                    textAlign: 'left', transition: transitions.color,
                  }}
                  onMouseEnter={e => { if (currentLang !== l.code) e.currentTarget.style.backgroundColor = semantic.bgHover; }}
                  onMouseLeave={e => { if (currentLang !== l.code) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ fontWeight: typography.fontWeight.semibold, minWidth: '24px' }}>{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System status */}
        <div className="header-status" style={{
          display: 'flex', alignItems: 'center', gap: spacing[1],
          padding: `${spacing[1]} ${spacing[2]}`, borderRadius: radius.md,
          backgroundColor: colors.success[50],
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.success[500],
          }} />
          <span style={{
            fontSize: typography.fontSize.sm, color: colors.success[700],
            fontWeight: typography.fontWeight.medium,
          }}>
            {t.systemActive}
          </span>
        </div>

        {/* User dropdown */}
        <div ref={dropdownRef} className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: spacing[2],
              background: 'none', border: '1px solid transparent',
              cursor: 'pointer', padding: `${spacing[1]} ${spacing[2]}`, borderRadius: radius.xl,
              transition: transitions.color,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = semantic.bgHover;
              e.currentTarget.style.borderColor = semantic.border;
            }}
            onMouseLeave={e => {
              if (!dropdownOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: radius.full,
              background: colors.gradient.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: semantic.textInverse, fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.bold, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div className="header-user-info" style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold,
                color: semantic.textPrimary,
                whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.full_name || t.loading}
              </div>
              <div style={{ fontSize: '10px', color: semantic.textMuted, marginTop: '1px' }}>
                {t.certificateShort}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={semantic.textMuted}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: transitions.normal, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: spacing[1],
              width: '220px', backgroundColor: semantic.bgCard, borderRadius: radius.xl,
              border: `1px solid ${semantic.border}`, boxShadow: shadows.dropdown,
              padding: spacing[1], zIndex: zIndexTokens.dropdown,
            }}>
              <div style={{
                padding: `${spacing[2]} ${spacing[3]}`,
                borderBottom: `1px solid ${semantic.borderLight}`, marginBottom: spacing[1],
              }}>
                <div style={{
                  fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold,
                  color: semantic.textPrimary,
                }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginTop: '2px' }}>
                  {user?.email}
                </div>
              </div>

              <button onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: spacing[2],
                  padding: `${spacing[2]} ${spacing[3]}`, border: 'none', borderRadius: radius.lg,
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: typography.fontSize.base, color: semantic.textSecondary, textAlign: 'left',
                  transition: transitions.color,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                {t.header.settings}
              </button>

              <button onClick={() => { setDropdownOpen(false); router.push('/settings/security'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: spacing[2],
                  padding: `${spacing[2]} ${spacing[3]}`, border: 'none', borderRadius: radius.lg,
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: typography.fontSize.base, color: semantic.textSecondary, textAlign: 'left',
                  transition: transitions.color,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = semantic.bgHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                {t.header.security}
              </button>

              <div style={{ margin: `${spacing[1]} 0`, borderTop: `1px solid ${semantic.borderLight}` }} />

              <button onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: spacing[2],
                  padding: `${spacing[2]} ${spacing[3]}`, border: 'none', borderRadius: radius.lg,
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: typography.fontSize.base, color: colors.error[600], textAlign: 'left',
                  transition: transitions.color,
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.error[50])}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {t.header.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
