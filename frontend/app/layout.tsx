'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getStoredLocale } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import OnboardingWizard from '@/components/OnboardingWizard';
import './globals.css';

const NO_SIDEBAR_PATHS = ['/login', '/register'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.includes(pathname);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [htmlLang, setHtmlLang] = useState('ru');
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* Persist collapsed state + locale + onboarding check */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') setSidebarCollapsed(true);
      setHtmlLang(getStoredLocale());

      // UI-003: Check if onboarding is needed
      const token = localStorage.getItem('token');
      if (token && !localStorage.getItem('onboarding_complete')) {
        fetch('/api/v1/onboarding/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data && !data.completed) {
              setShowOnboarding(true);
            } else if (data?.completed) {
              localStorage.setItem('onboarding_complete', 'true');
            }
          })
          .catch(() => { /* ignore */ });
      }
    }
  }, []);

  /* Listen for locale changes (from useLocale hook) */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const lang = document.documentElement.lang;
      if (lang && lang !== htmlLang) setHtmlLang(lang);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, [htmlLang]);

  const toggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const sidebarWidth = sidebarCollapsed ? 68 : 256;

  return (
    <html lang={htmlLang}>
      <head>
        <title>AI Capital Management</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      </head>
      <body>
        <ThemeProvider>
        {/* UI-003: Onboarding Wizard */}
        {showOnboarding && (
          <OnboardingWizard onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('onboarding_complete', 'true');
          }} />
        )}
        {showSidebar ? (
          <div className="flex min-h-screen">
            {/* ACC-001: Skip to main content */}
            <a href="#main-content" className="skip-link">
              Перейти к содержимому
            </a>
            {/* Sidebar */}
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={toggleCollapse}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
            />

            {/* Main area */}
            <main
              id="main-content"
              role="main"
              className="main-area flex-1 min-h-screen flex flex-col"
              style={{ marginLeft: `${sidebarWidth}px` }}
            >
              {/* Header */}
              <Header onHamburgerClick={() => setMobileOpen(true)} />

              {/* Page content */}
              <div className="page-content p-6 flex-1" role="region" aria-label="Основное содержимое">
                {children}
              </div>

              {/* Footer */}
              <Footer />
            </main>
          </div>
        ) : (
          <div className="min-h-screen bg-neutral-50">
            {children}
          </div>
        )}
        </ThemeProvider>
      </body>
    </html>
  );
}
