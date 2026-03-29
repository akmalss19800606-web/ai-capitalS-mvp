'use client';

import React, { useEffect, useMemo, useState } from 'react';

const C = {
  card: '#ffffff',
  cardBorder: '#e2e8f0',
};

type ActiveTab = 'nsbu' | 'ifrs' | 'diff';

type ReportRow = {
  label: string;
  amount: string | number;
  note?: string;
};

type ApiReportRow = {
  label?: string;
  name?: string;
  title?: string;
  amount?: string | number;
  value?: string | number;
  note?: string;
  comment?: string;
  description?: string;
};

type ReportsResponse = {
  nsbu?: ApiReportRow[];
  ifrs?: ApiReportRow[];
  diff?: ApiReportRow[];
};

function formatAmount(value: string | number | undefined) {
  if (value === null || value === undefined || value === '') return '—';

  const num = Number(value);
  if (!Number.isNaN(num)) {
    return new Intl.NumberFormat('ru-RU').format(num);
  }

  return String(value);
}

function normalizeRows(rows?: ApiReportRow[]): ReportRow[] {
  if (!rows || !Array.isArray(rows)) return [];

  return rows.map((row, index) => ({
    label:
      row.label ||
      row.name ||
      row.title ||
      `Показатель ${index + 1}`,
    amount: row.amount ?? row.value ?? '—',
    note: row.note || row.comment || row.description || '',
  }));
}

function ReportTable({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: ReportRow[];
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-xl border p-6"
      style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: accent, color: '#fff' }}
        >
          API
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="text-left py-3 pr-3 font-medium">Показатель</th>
              <th className="text-right py-3 pr-3 font-medium">Сумма</th>
              <th className="text-left py-3 font-medium">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.label}-${idx}`} className="border-b border-slate-100">
                <td className="py-3 pr-3 text-slate-800 font-medium">
                  {row.label}
                </td>
                <td className="py-3 pr-3 text-right text-slate-900">
                  {formatAmount(row.amount)}
                </td>
                <td className="py-3 text-slate-500">{row.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PortfoliosPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nsbu');
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState('');
  const [nsbuRows, setNsbuRows] = useState<ReportRow[]>([]);
  const [ifrsRows, setIfrsRows] = useState<ReportRow[]>([]);
  const [diffRows, setDiffRows] = useState<ReportRow[]>([]);

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token') ||
        localStorage.getItem('token') ||
        ''
      : '';

  async function loadReports() {
    setReportsLoading(true);
    setReportsError('');

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/reports`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Ошибка ${res.status}`);
      }

      const data: ReportsResponse = await res.json();

      setNsbuRows(normalizeRows(data.nsbu));
      setIfrsRows(normalizeRows(data.ifrs));
      setDiffRows(normalizeRows(data.diff));
    } catch (error) {
      setReportsError(
        error instanceof Error ? error.message : 'Не удалось загрузить отчёты'
      );
      setNsbuRows([]);
      setIfrsRows([]);
      setDiffRows([]);
    } finally {
      setReportsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExcelUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportStatus('Загружаем файл...');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/import/excel`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: form,
        }
      );

      if (res.ok) {
        setImportStatus('✅ Файл загружен — отчёты обновляются...');
        await loadReports();
      } else {
        setImportStatus(`❌ Ошибка загрузки: ${res.status}`);
      }
    } catch {
      setImportStatus('❌ Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  const currentContent = useMemo(() => {
    if (reportsLoading) {
      return (
        <div
          className="bg-white rounded-xl border p-6 text-sm text-slate-500"
          style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
        >
          ⏳ Загружаем отчёты...
        </div>
      );
    }

    if (reportsError) {
      return (
        <div
          className="bg-white rounded-xl border p-6"
          style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
        >
          <div className="text-red-600 font-medium mb-2">
            Не удалось получить данные отчётов
          </div>
          <div className="text-sm text-slate-500 mb-4">{reportsError}</div>
          <button
            onClick={loadReports}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-700"
          >
            Повторить
          </button>
        </div>
      );
    }

    if (activeTab === 'nsbu') {
      if (!nsbuRows.length) {
        return (
          <div
            className="bg-white rounded-xl border p-6 text-sm text-slate-500"
            style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
          >
            По НСБУ пока нет данных.
          </div>
        );
      }

      return <ReportTable title="НСБУ отчёт" rows={nsbuRows} accent="#2563eb" />;
    }

    if (activeTab === 'ifrs') {
      if (!ifrsRows.length) {
        return (
          <div
            className="bg-white rounded-xl border p-6 text-sm text-slate-500"
            style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
          >
            По МСФО пока нет данных.
          </div>
        );
      }

      return <ReportTable title="МСФО отчёт" rows={ifrsRows} accent="#16a34a" />;
    }

    if (!diffRows.length) {
      return (
        <div
          className="bg-white rounded-xl border p-6 text-sm text-slate-500"
          style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
        >
          Данные по разнице НСБУ / МСФО пока отсутствуют.
        </div>
      );
    }

    return <ReportTable title="Разница НСБУ / МСФО" rows={diffRows} accent="#7c3aed" />;
  }, [activeTab, diffRows, ifrsRows, nsbuRows, reportsError, reportsLoading]);

  return (
    <div className="space-y-6">
      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🗂 Портфели — Финансовый профиль
        </h2>
        <p className="text-sm text-gray-500">
          Загрузите данные из 1С или Excel — система автоматически построит
          отчёты НСБУ и МСФО.
        </p>
      </div>

      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-800">📤 Источник данных</h3>
          <button
            onClick={loadReports}
            className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Обновить отчёты
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-400 transition-all">
            <div className="text-3xl mb-2">🗂</div>
            <p className="font-medium text-gray-700 text-sm">Загрузить из 1С</p>
            <p className="text-xs text-gray-400 mt-1">XML / CSV выгрузка</p>

            <input
              type="file"
              accept=".xml,.csv"
              className="hidden"
              onChange={handleExcelUpload}
              id="upload-1c"
            />
            <label
              htmlFor="upload-1c"
              className="mt-2 inline-block text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-100"
            >
              Выбрать файл
            </label>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-green-400 transition-all">
            <div className="text-3xl mb-2">📊</div>
            <p className="font-medium text-gray-700 text-sm">Загрузить Excel</p>
            <p className="text-xs text-gray-400 mt-1">Шаблон НСБУ + МСФО</p>

            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelUpload}
              id="upload-excel"
            />
            <label
              htmlFor="upload-excel"
              className="mt-2 inline-block text-xs bg-green-50 text-green-600 px-3 py-1 rounded-full cursor-pointer hover:bg-green-100"
            >
              Выбрать файл
            </label>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-violet-400 transition-all">
            <div className="text-3xl mb-2">📥</div>
            <p className="font-medium text-gray-700 text-sm">Скачать шаблон</p>
            <p className="text-xs text-gray-400 mt-1">Пустой НСБУ + МСФО</p>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/portfolios/template/excel`}
              className="mt-2 inline-block text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-full hover:bg-violet-100"
            >
              Скачать .xlsx
            </a>
          </div>
        </div>

        {loading && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
            ⏳ Выполняется загрузка...
          </div>
        )}

        {importStatus && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            {importStatus}
          </div>
        )}
      </div>

      <div
        className="bg-white rounded-xl border p-2"
        style={{ borderColor: C.cardBorder, backgroundColor: C.card }}
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('nsbu')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'nsbu'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            НСБУ
          </button>

          <button
            onClick={() => setActiveTab('ifrs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'ifrs'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            МСФО
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'diff'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Разница
          </button>
        </div>
      </div>

      {currentContent}
    </div>
  );
}