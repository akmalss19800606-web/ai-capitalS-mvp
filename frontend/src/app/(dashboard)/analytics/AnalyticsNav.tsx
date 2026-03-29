'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { label: '\uD83D\uDDC2 \u041F\u043E\u0440\u0442\u0444\u0435\u043B\u0438', href: '/analytics/portfolios' },
  { label: '\u26A1 \u0420\u0435\u0448\u0435\u043D\u0438\u044F', href: '/analytics/decisions' },
  { label: '\uD83D\uDCC8 \u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430', href: '/analytics/analytics' },
  { label: '\uD83D\uDD25 \u0421\u0442\u0440\u0435\u0441\u0441-\u0442\u0435\u0441\u0442', href: '/analytics/stress-test' },
  { label: '\uD83D\uDCCA \u0412\u0438\u0437\u0443\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438', href: '/analytics/visualizations' },
];

export default function AnalyticsNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
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
  );
}
