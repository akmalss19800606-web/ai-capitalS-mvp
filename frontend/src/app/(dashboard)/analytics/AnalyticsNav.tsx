'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: '🗂 Портфели', href: '/analytics/portfolios' },
  { label: '⚡ Решения', href: '/analytics/decisions' },
  { label: '📈 Аналитика', href: '/analytics/analytics' },
  { label: '🔥 Стресс-тест', href: '/analytics/stress-test' },
  { label: '📊 Визуализации', href: '/analytics/visualizations' },
];

export default function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
