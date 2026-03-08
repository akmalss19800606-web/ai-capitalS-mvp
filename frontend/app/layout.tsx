'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// SVG icon component for consistent usage
function Icon({ paths, ...rest }: { paths: React.ReactNode; [key: string]: any }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths}
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: 'Главная панель',
    path: '/',
    icon: (
      <Icon
        paths={<path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />}
      />
    ),
  },
  {
    label: 'Портфели',
    path: '/portfolios',
    icon: (
      <Icon
        paths={
          <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z" />
        }
      />
    ),
  },
  {
    label: 'Решения',
    path: '/decisions',
    icon: (
      <Icon
        paths={
          <>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9h6m-6 4h6m-2-8h.01M9 12h.01" />
          </>
        }
      />
    ),
  },
  {
    label: 'Согласование',
    path: '/workflows',
    icon: (
      <Icon
        paths={
          <>
            <rect x="2" y="6" width="6" height="6" rx="1" />
            <rect x="16" y="6" width="6" height="6" rx="1" />
            <rect x="9" y="14" width="6" height="6" rx="1" />
            <path d="M8 9h8" />
            <path d="M12 9v5" />
          </>
        }
      />
    ),
  },
  {
    label: 'Аналитика',
    path: '/analytics',
    icon: (
      <Icon
        paths={
          <>
            <path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M3 3l3 3M21 3l-3 3M3 21l3-3M21 21l-3-3" />
          </>
        }
      />
    ),
  },
  {
    label: 'AI-Аналитика',
    path: '/ai-analytics',
    icon: (
      <Icon
        paths={
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
        }
      />
    ),
  },
  {
    label: 'Стресс-тест',
    path: '/stress-testing',
    icon: (
      <Icon
        paths={
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polygon points="13 8 8 14 11 14 11 18 16 12 13 12 13 8" />
          </>
        }
      />
    ),
  },
  {
    label: 'Ретроспектива',
    path: '/retrospective',
    icon: (
      <Icon
        paths={
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        }
      />
    ),
  },
  {
    label: 'Due Diligence',
    path: '/due-diligence',
    icon: (
      <Icon
        paths={
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </>
        }
      />
    ),
  },
  {
    label: 'Рынок УЗ',
    path: '/market-uz',
    icon: (
      <Icon
        paths={
          <>
            <path d="M23 6l-9.5 9.5-5-5L1 18" />
            <path d="M17 6h6v6" />
          </>
        }
      />
    ),
  },
  {
    label: 'Визуализации',
    path: '/charts',
    icon: (
      <Icon
        paths={
          <>
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </>
        }
      />
    ),
  },
  {
    label: 'Отчёты',
    path: '/report',
    icon: (
      <Icon
        paths={
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </>
        }
      />
    ),
  },
  {
    label: 'Настройки',
    path: '/settings',
    icon: (
      <Icon
        paths={
          <>
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        }
      />
    ),
  },
];

const NO_SIDEBAR_PATHS = ['/login', '/register'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && showSidebar) setUser('Акмал Солиев');
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  // Find active nav item for topbar title
  const activeItem = NAV_ITEMS.find(
    (n) => n.path === pathname || (n.path !== '/' && pathname.startsWith(n.path))
  );

  return (
    <html lang="ru">
      <head>
        <title>AI Capital Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; background: #f8fafc; color: #1e293b; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          .nav-btn:hover { background-color: #1e293b !important; }
          .nav-btn:hover span { color: #e2e8f0 !important; }
          .logout-btn:hover { background-color: #1e293b !important; color: #e2e8f0 !important; }
        `}</style>
      </head>
      <body>
        {showSidebar ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* SIDEBAR */}
            <aside
              style={{
                width: '248px',
                minWidth: '248px',
                backgroundColor: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                left: 0,
                height: '100vh',
                zIndex: 100,
                boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
              }}
            >
              {/* Logo */}
              <div
                style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid #1e293b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div>
                    <p
                      style={{
                        color: '#f8fafc',
                        fontWeight: '700',
                        fontSize: '14px',
                        lineHeight: '1.2',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      AI Capital
                    </p>
                    <p style={{ color: '#475569', fontSize: '11px', marginTop: '1px' }}>
                      Management
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav
                style={{
                  flex: 1,
                  padding: '10px 0',
                  overflowY: 'auto',
                }}
              >
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.path ||
                    (item.path !== '/' && pathname.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      className="nav-btn"
                      onClick={() => router.push(item.path)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        backgroundColor: isActive ? '#1e3a5f' : 'transparent',
                        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.15s ease',
                        marginBottom: '1px',
                      }}
                    >
                      <span
                        style={{
                          color: isActive ? '#60a5fa' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          color: isActive ? '#e2e8f0' : '#94a3b8',
                          transition: 'color 0.15s',
                          lineHeight: '1.3',
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* User section */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid #1e293b' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#0d1526',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '700',
                      flexShrink: 0,
                    }}
                  >
                    А
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p
                      style={{
                        color: '#e2e8f0',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Акмал Солиев
                    </p>
                    <p
                      style={{
                        color: '#475569',
                        fontSize: '10px',
                        marginTop: '1px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Свидетельство №009932
                    </p>
                  </div>
                </div>
                <button
                  className="logout-btn"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: '7px',
                    border: '1px solid #1e293b',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Выйти из системы
                </button>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main
              style={{
                marginLeft: '248px',
                flex: 1,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top bar */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  padding: '13px 28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'sticky',
                  top: 0,
                  zIndex: 50,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {activeItem && (
                    <>
                      <span
                        style={{
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {activeItem.icon}
                      </span>
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#1e293b',
                        }}
                      >
                        {activeItem.label}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Система активна</span>
                </div>
              </div>

              {/* Page content */}
              <div style={{ padding: '28px', flex: 1 }}>{children}</div>

              {/* Footer */}
              <div
                style={{
                  padding: '14px 28px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    textAlign: 'center',
                    lineHeight: '1.5',
                  }}
                >
                  © 2026 AI Capital Management · Автор: Солиев Акмал Идиевич · Свидетельство об
                  авторском праве №009932
                </p>
              </div>
            </main>
          </div>
        ) : (
          <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>{children}</div>
        )}
      </body>
    </html>
  );
}
