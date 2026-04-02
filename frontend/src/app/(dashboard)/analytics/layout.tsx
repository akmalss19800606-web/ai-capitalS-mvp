import React from 'react';
import AnalyticsNav from './AnalyticsNav';
import HeaderExportButton from '@/components/analytics/HeaderExportButton';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f8fc' }}>
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

      {/* Контент */}
      <div className="p-6">{children}</div>
    </div>
  );
}
