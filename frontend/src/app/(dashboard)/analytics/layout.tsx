import React from 'react';
import AnalyticsNav from './AnalyticsNav';

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
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/export/excel`}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          📥 Скачать НСБУ + МСФО
        </a>
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
