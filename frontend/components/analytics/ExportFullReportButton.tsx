'use client';

import React, { useState } from 'react';

interface ExportFullReportButtonProps {
  portfolioId: number;
  disabled?: boolean;
}

export function ExportFullReportButton({ portfolioId, disabled }: ExportFullReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    if (!token) { alert('Необходимо войти в систему'); setLoading(false); return; }

    try {
      const res = await fetch('/api/v1/analytics/export/full-report', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio_id: 1 }),
      });
      if (!res.ok) { const err = await res.text(); alert(`Ошибка: ${err}`); setLoading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report_nsbu_ifrs.xlsx';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (e) {
      setError(`Не удалось скачать отчёт: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleExport}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium transition"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Генерация отчёта...
          </>
        ) : (
          <>
            <span>📥</span>
            Экспорт полного отчёта
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
