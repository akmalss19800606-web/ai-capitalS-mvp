'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

// === ДИЗАЙН-ТОКЕНЫ АНАЛИТИКИ (копировать в каждый файл) ===
const C = {
  // Светлая зона (заголовки, KPI-карточки, навигация)
  pageBg: '#f8f8fc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  navActive: '#3b82f6',
  navActiveText: '#ffffff',
  navInactive: '#64748b',
  badge_blue: 'bg-blue-100 text-blue-700',
  badge_green: 'bg-green-100 text-green-700',
  badge_red: 'bg-red-100 text-red-700',
  badge_yellow: 'bg-yellow-100 text-yellow-700',
  // Тёмная зона (таблицы результатов, графики, расчёты)
  darkBg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900',
  darkCard: 'bg-slate-800/60 border border-slate-700/50 rounded-2xl',
  darkInput: 'bg-slate-900/60 border border-slate-600/50 rounded-xl',
  tabActive: 'bg-violet-600 text-white shadow-lg shadow-violet-500/25',
  tabInactive: 'text-slate-400 hover:text-white hover:bg-slate-700/40',
  btnPrimary: 'bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl',
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-slate-400',
};

const TABS = [
  { label: '🗂 Портфели', href: '/analytics/portfolios' },
  { label: '⚡ Решения', href: '/analytics/decisions' },
  { label: '📈 Аналитика', href: '/analytics/analytics' },
  { label: '🔥 Стресс-тест', href: '/analytics/stress-test' },
  { label: '📊 Визуализации', href: '/analytics/visualizations' },
];

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.pageBg }}>
      {/* Заголовок */}
      <div
        className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ borderColor: C.cardBorder }}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Аналитика</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Финансовый анализ по стандартам НСБУ и МСФО
          </p>
        </div>

        <a
          href={`${
            process.env.NEXT_PUBLIC_API_URL || ''
          }/api/v1/portfolios/export/excel`}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          📥 Скачать НСБУ + МСФО
        </a>
      </div>

      {/* Навигация по вкладкам */}
      <div
        className="bg-white border-b px-6"
        style={{ borderColor: C.cardBorder }}
      >
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive =
              pathname === tab.href || pathname.startsWith(tab.href + '/');

            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент */}
      <div className="p-6">{children}</div>
    </div>
  );
}