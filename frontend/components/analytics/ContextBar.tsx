'use client';

import React from 'react';
import { Building2, Calendar } from 'lucide-react';
import { useAnalytics } from '@/contexts/AnalyticsContext';

interface ContextBarProps {
  showStandardToggle?: boolean;
}

const MONTH_SHORT: Record<number, string> = {
  0: 'Янв', 1: 'Фев', 2: 'Мар', 3: 'Апр', 4: 'Май', 5: 'Июн',
  6: 'Июл', 7: 'Авг', 8: 'Сен', 9: 'Окт', 10: 'Ноя', 11: 'Дек',
};

function formatPeriodRange(from: string, to: string): string {
  const dFrom = new Date(from);
  const dTo = new Date(to);
  if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) return '---';
  const mFrom = MONTH_SHORT[dFrom.getMonth()];
  const mTo = MONTH_SHORT[dTo.getMonth()];
  return `${mFrom} ${dFrom.getFullYear()} — ${mTo} ${dTo.getFullYear()}`;
}

export default function ContextBar({ showStandardToggle = true }: ContextBarProps) {
  const {
    activeOrgId,
    activeOrgName,
    periodFrom,
    periodTo,
    activeStandard,
    setActiveStandard,
    nsbuReady,
    ifrsReady,
  } = useAnalytics();

  const standards: { key: 'nsbu' | 'ifrs' | 'both'; label: string }[] = [
    { key: 'nsbu', label: 'НСБУ' },
    { key: 'ifrs', label: 'МСФО' },
    { key: 'both', label: 'Оба' },
  ];

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex flex-wrap items-center gap-4 text-sm min-h-[48px]">
      {/* Организация */}
      <div className="flex items-center gap-1.5 text-blue-800">
        <Building2 size={16} className="text-blue-500 shrink-0" />
        {activeOrgId ? (
          <span className="font-medium truncate max-w-[200px]">{activeOrgName}</span>
        ) : (
          <span className="text-blue-400 italic">Выберите организацию</span>
        )}
      </div>

      {/* Разделитель */}
      <div className="w-px h-5 bg-blue-200" />

      {/* Период */}
      <div className="flex items-center gap-1.5 text-blue-800">
        <Calendar size={16} className="text-blue-500 shrink-0" />
        <span>{formatPeriodRange(periodFrom, periodTo)}</span>
      </div>

      {/* Разделитель */}
      {showStandardToggle && <div className="w-px h-5 bg-blue-200" />}

      {/* Переключатель стандарта */}
      {showStandardToggle && (
        <div className="flex bg-white/70 rounded-lg p-0.5 gap-0.5">
          {standards.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveStandard(s.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeStandard === s.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Разделитель */}
      <div className="w-px h-5 bg-blue-200" />

      {/* Статусные бейджи */}
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          nsbuReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          НСБУ: {nsbuReady ? 'загружен' : 'нет данных'}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          ifrsReady ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          МСФО: {ifrsReady ? 'рассчитан' : 'нет данных'}
        </span>
      </div>
    </div>
  );
}
