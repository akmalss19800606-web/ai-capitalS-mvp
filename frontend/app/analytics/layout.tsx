import React from 'react';
import AnalyticsNav from './AnalyticsNav';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import ContextBar from '@/components/analytics/ContextBar';
import HeaderExportButton from '@/components/analytics/HeaderExportButton';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AnalyticsProvider>
      <div className="-mx-6 -mt-6 -mb-6" style={{ backgroundColor: '#f8f8fc', minHeight: '100%' }}>
        {/* Заголовок */}
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Аналитика</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Финансовый анализ по стандартам НСБУ и МСФО
            </p>
          </div>
          <HeaderExportButton />
        </div>

        {/* Навигация (клиентский компонент) */}
        <div className="bg-white border-b border-[#e2e8f0] px-6">
          <AnalyticsNav />
        </div>

        {/* Контекстная панель */}
        <ContextBar />

        {/* Контент */}
        <div className="p-6">{children}</div>
      </div>
    </AnalyticsProvider>
  );
}
