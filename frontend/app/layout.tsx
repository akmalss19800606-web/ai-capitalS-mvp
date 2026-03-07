'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { label: 'Мои портфели', path: '/', icon: '📊' },
  { label: 'Решения', path: '/decisions', icon: '📋' },
  { label: 'Due Diligence', path: '/due-diligence', icon: '🔍' },
  { label: 'Рынок Узбекистана', path: '/market-uz', icon: '🇺🇿' },
  { label: 'Калькулятор ROI', path: '/calculator', icon: '🧮' },
  { label: 'Макроэкономика УЗ', path: '/macro-uz', icon: '📈' },
  { label: 'PDF Отчёт', path: '/report', icon: '📄' },
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
    router.push('/login');
  };

  return (
    <html lang="ru">
      <head>
        <title>AI Capital Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
          ::-webkit-scrollbar { width: 6px; } 
          ::-webkit-scrollbar-track { background: #f1f5f9; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        `}</style>
      </head>
      <body>
        {showSidebar ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* SIDEBAR */}
            <aside style={{
              width: '240px', minWidth: '240px', backgroundColor: '#0f172a',
              display: 'flex', flexDirection: 'column', position: 'fixed',
              top: 0, left: 0, height: '100vh', zIndex: 100,
              boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
            }}>
              {/* Лого */}
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📈</div>
                  <div>
                    <p style={{ color: '#f8fafc', fontWeight: '700', fontSize: '13px', lineHeight: '1.2' }}>AI Capital</p>
                    <p style={{ color: '#64748b', fontSize: '11px' }}>Management</p>
                  </div>
                </div>
              </div>

              {/* Навигация */}
              <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
                {NAV_ITEMS.map(item => {
                  const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        backgroundColor: isActive ? '#1e3a5f' : 'transparent',
                        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: isActive ? '600' : '400', color: isActive ? '#e2e8f0' : '#94a3b8' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Пользователь */}
              <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>А</div>
                  <div>
                    <p style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '600' }}>Акмал Солиев</p>
                    <p style={{ color: '#64748b', fontSize: '11px' }}>Свидетельство №009932</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '7px 12px', borderRadius: '7px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}
                >
                  Выйти из системы
                </button>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {/* Top bar */}
              <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/' && pathname.startsWith(n.path))) && (
                    <>
                      <span style={{ fontSize: '16px' }}>{NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/' && pathname.startsWith(n.path)))?.icon}</span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
                        {NAV_ITEMS.find(n => n.path === pathname || (n.path !== '/' && pathname.startsWith(n.path)))?.label}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Система активна</span>
                </div>
              </div>

              {/* Page content */}
              <div style={{ padding: '28px', flex: 1 }}>
                {children}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                  © 2026 AI Capital Management · Автор: Солиев Акмал Идиевич · Свидетельство об авторском праве №009932
                </p>
              </div>
            </main>
          </div>
        ) : (
          <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {children}
          </div>
        )}
      </body>
    </html>
  );
}