'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getActiveNavItem, HamburgerButton } from './Sidebar';

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
    return { full_name: data.full_name || 'Пользователь', email: data.email || '' };
  } catch {
    return null;
  }
}

export default function Header({ onHamburgerClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeItem = getActiveNavItem(pathname);

  useEffect(() => {
    fetchUserSafe().then(u => {
      if (u) setUser(u);
      else setUser({ full_name: 'Пользователь', email: '' });
    });
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
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

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
    }}>
      {/* Left: hamburger + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="hamburger-wrapper">
          <HamburgerButton onClick={onHamburgerClick} />
        </div>
        {activeItem && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>
              {activeItem.icon}
            </span>
            <span style={{
              fontSize: '15px', fontWeight: 600, color: '#111827',
            }}>
              {activeItem.label}
            </span>
          </div>
        )}
      </div>

      {/* Right: status + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* System status */}
        <div className="header-status" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f0fdf4',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: '#22c55e',
          }} />
          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
            Система активна
          </span>
        </div>

        {/* User dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: '1px solid transparent',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '10px',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
            onMouseLeave={e => {
              if (!dropdownOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div className="header-user-info" style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: '#111827',
                whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.full_name || 'Загрузка...'}
              </div>
              <div style={{
                fontSize: '10px', color: '#9ca3af', marginTop: '1px',
              }}>
                Свидетельство №009932
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '6px',
              width: '220px', backgroundColor: '#fff', borderRadius: '12px',
              border: '1px solid #e5e7eb', boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              padding: '6px', zIndex: 100,
            }}>
              <div style={{
                padding: '10px 12px', borderBottom: '1px solid #f3f4f6', marginBottom: '4px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                  {user?.email}
                </div>
              </div>

              <button onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: '13px', color: '#374151', textAlign: 'left',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                Настройки
              </button>

              <button onClick={() => { setDropdownOpen(false); router.push('/settings/security'); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: '13px', color: '#374151', textAlign: 'left',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Безопасность
              </button>

              <div style={{ margin: '4px 0', borderTop: '1px solid #f3f4f6' }} />

              <button onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', backgroundColor: 'transparent',
                  fontSize: '13px', color: '#dc2626', textAlign: 'left',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Выйти из системы
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
