'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

const NO_SIDEBAR_PATHS = ['/login', '/register'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* Persist collapsed state */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const sidebarWidth = sidebarCollapsed ? 68 : 256;

  return (
    <html lang="ru">
      <head>
        <title>AI Capital Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          /* ─── Base resets ─── */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            color: #111827;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* ─── Scrollbar ─── */
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

          /* ─── Desktop: sidebar visible, hamburger hidden ─── */
          .sidebar-desktop { display: block; }
          .sidebar-mobile { display: none; }
          .sidebar-mobile-overlay { display: none; }
          .hamburger-wrapper { display: none; }

          /* ─── Tablet (≤ 1024px): collapse sidebar ─── */
          @media (max-width: 1024px) {
            .sidebar-desktop { display: none !important; }
            .sidebar-mobile { display: block !important; }
            .sidebar-mobile-overlay { display: block !important; }
            .hamburger-wrapper { display: flex !important; }
            .main-area {
              margin-left: 0 !important;
            }
          }

          /* ─── Mobile (≤ 640px): smaller paddings ─── */
          @media (max-width: 640px) {
            .page-content { padding: 16px !important; }
            .header-status { display: none !important; }
            .header-user-info { display: none !important; }
            .footer-location { display: none !important; }
          }

          /* ─── Selection color ─── */
          ::selection { background: #dbeafe; color: #1e40af; }

          /* ─── Smooth transitions on main area ─── */
          .main-area {
            transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
          }
        `}</style>
      </head>
      <body>
        {showSidebar ? (
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={toggleCollapse}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
            />

            {/* Main area */}
            <main
              className="main-area"
              style={{
                marginLeft: `${sidebarWidth}px`,
                flex: 1,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <Header onHamburgerClick={() => setMobileOpen(true)} />

              {/* Page content */}
              <div className="page-content" style={{ padding: '24px', flex: 1 }}>
                {children}
              </div>

              {/* Footer */}
              <Footer />
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
