'use client';
import { useState } from 'react';

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

const SCENARIOS = [
  { value: 'crisis_2008', label: '🟥 Кризис 2008' },
  { value: 'covid_2020', label: '🦠 COVID-19 2020' },
  { value: 'rate_hike', label: '📈 Рост ставок' },
  { value: 'currency_shock', label: '💱 Валютный шок' },
  { value: 'commodity_drop', label: '⛏️ Падение сырья' },
  { value: 'custom', label: '⚙️ Пользовательский' },
];

const SEVERITIES = [
  { value: 'mild', label: '🟡 Лёгкий' },
  { value: 'moderate', label: '🟠 Умеренный' },
  { value: 'severe', label: '🔴 Тяжёлый' },
  { value: 'extreme', label: '⚫ Экстремальный' },
];

interface StressResult {
  metric: string;
  baseline_nsbu: number | null;
  baseline_ifrs: number | null;
  stressed_nsbu: number | null;
  stressed_ifrs: number | null;
  delta_pct_nsbu: number | null;
  delta_pct_ifrs: number | null;
  status_nsbu: 'ok' | 'warn' | 'bad';
  status_ifrs: 'ok' | 'warn' | 'bad';
}

function StressResultsTable({
  results,
  stdMode,
}: {
  results: StressResult[];
  stdMode: 'nsbu' | 'ifrs' | 'both';
}) {
  if (!results.length) return null;

  const showNsbu = stdMode === 'nsbu' || stdMode === 'both';
  const showIfrs = stdMode === 'ifrs' || stdMode === 'both';

  const statusColor = (s: 'ok' | 'warn' | 'bad') =>
    s === 'bad' ? 'text-red-400' : s === 'warn' ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6 mt-6">
      <h4 className="text-white font-bold mb-4">🔥 Результаты стресс-теста</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-4">Показатель</th>
              {showNsbu && (
                <>
                  <th className="text-right py-2 pr-4">Базовый (НСБУ)</th>
                  <th className="text-right py-2 pr-4">Стресс (НСБУ)</th>
                  <th className="text-right py-2 pr-4">Δ НСБУ</th>
                </>
              )}
              {showIfrs && (
                <>
                  <th className="text-right py-2 pr-4">Базовый (МСФО)</th>
                  <th className="text-right py-2 pr-4">Стресс (МСФО)</th>
                  <th className="text-right py-2">Δ МСФО</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">{r.metric}</td>
                {showNsbu && (
                  <>
                    <td className="py-2 pr-4 text-right text-slate-400">{r.baseline_nsbu?.toFixed(2) ?? '---'}</td>
                    <td className={`py-2 pr-4 text-right ${statusColor(r.status_nsbu)}`}>{r.stressed_nsbu?.toFixed(2) ?? '---'}</td>
                    <td className={`py-2 pr-4 text-right text-xs ${
                      (r.delta_pct_nsbu ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>{r.delta_pct_nsbu != null ? `${r.delta_pct_nsbu > 0 ? '+' : ''}${r.delta_pct_nsbu.toFixed(1)}%` : '---'}</td>
                  </>
                )}
                {showIfrs && (
                  <>
                    <td className="py-2 pr-4 text-right text-slate-400">{r.baseline_ifrs?.toFixed(2) ?? '---'}</td>
                    <td className={`py-2 pr-4 text-right ${statusColor(r.status_ifrs)}`}>{r.stressed_ifrs?.toFixed(2) ?? '---'}</td>
                    <td className={`py-2 text-right text-xs ${
                      (r.delta_pct_ifrs ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}>{r.delta_pct_ifrs != null ? `${r.delta_pct_ifrs > 0 ? '+' : ''}${r.delta_pct_ifrs.toFixed(1)}%` : '---'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StressTestPage() {
  const [scenario, setScenario] = useState('crisis_2008');
  const [severity, setSeverity] = useState('moderate');
  const [stdMode, setStdMode] = useState<'nsbu' | 'ifrs' | 'both'>('both');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StressResult[]>([]);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  async function runStressTest() {
    setRunning(true);
    setError('');
    setResults([]);
    setAiSummary([]);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/stress-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ scenario, severity, standard: stdMode }),
        }
      );
      if (res.ok) {
        const d = await res.json();
        setResults(d.results || []);
        setAiSummary(d.ai_summary || []);
      } else {
        setError('Ошибка ' + res.status + ': Проверьте наличие данных в разделе Портфели');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">🔥 Стресс-тест НСБУ + МСФО</h2>
        <p className="text-sm text-gray-500">Анализ влияния сценариев на показатели по обоим стандартам</p>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="font-semibold text-gray-800 mb-4">⚙️ Параметры теста</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="text-sm text-gray-600 block mb-2">Сценарий</label>
            <div className="grid grid-cols-2 gap-2">
              {SCENARIOS.map(s => (
                <button key={s.value} onClick={() => setScenario(s.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    scenario === s.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-2">Тяжесть</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map(s => (
                <button key={s.value} onClick={() => setSeverity(s.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    severity === s.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-2">Стандарт отчётности</label>
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1 w-fit">
              {(['nsbu', 'ifrs', 'both'] as const).map(m => (
                <button key={m} onClick={() => setStdMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    stdMode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                  }`}>
                  {m === 'nsbu' ? 'НСБУ' : m === 'ifrs' ? 'МСФО' : 'Оба'}
                </button>
              ))}
            </div>

            <button
              onClick={runStressTest}
              disabled={running}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {running ? '⏳ Запускаем...' : '🔥 Запустить стресс-тест'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}
      </div>

      <StressResultsTable results={results} stdMode={stdMode} />

      {results.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🤖</span>
            <h4 className="font-semibold text-blue-800">AI-рекомендации по результатам стресс-теста</h4>
          </div>
          <div className="space-y-2">
            {aiSummary.length === 0 ? (
              <p className="text-sm text-blue-600">Генерируем рекомендации...</p>
            ) : (
              aiSummary.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">
                    {i === 0 ? '🔧' : i === 1 ? '🛡️' : '📉'}
                  </span>
                  <p className="text-blue-700">{rec}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
