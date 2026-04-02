'use client';
import { useState } from 'react';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { NextStepBanner } from '@/components/analytics/NextStepBanner';

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
  { value: 'crisis_2008', label: '🟥 Финансовый кризис 2008 г.' },
  { value: 'covid_2020', label: '🦠 Пандемия COVID-19 (2020 г.)' },
  { value: 'rate_hike', label: '📈 Рост ставки ЦБ' },
  { value: 'currency_shock', label: '💱 Валютный шок' },
  { value: 'commodity_drop', label: '⛏️ Сырьевой шок' },
  { value: 'custom', label: '⚙️ Пользовательский сценарий' },
];

const SEVERITIES = [
  { value: 'mild', label: '🟡 Лёгкий' },
  { value: 'moderate', label: '🟠 Умеренный' },
  { value: 'severe', label: '🔴 Тяжёлый' },
  { value: 'extreme', label: '⚫ Катастрофический' },
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

interface AssetImpact {
  asset: string;
  original_value: number;
  stressed_value: number;
  loss_pct: number;
}

interface SingleStressResult {
  scenario_name: string;
  scenario_description: string;
  shock_parameters: { factor: string; shock_pct: number; description: string }[];
  asset_impacts: AssetImpact[];
  portfolio_value_before: number;
  portfolio_value_after: number;
  total_loss_pct: number;
  max_single_asset_loss_pct: number;
  recovery_time_months: number;
  concentration_risks: { dimension: string; category: string; weight_pct: number; loss_pct: number }[];
}

interface DualResult {
  nsbu: SingleStressResult;
  ifrs: SingleStressResult | null;
  comparison: {
    loss_difference: number;
    asset_impact_diff: number;
    equity_impact_diff: number;
    recovery_diff: number;
    ifrs_available: boolean;
  };
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

/* ── Компонент результата одного стандарта (колонка) ── */
function SingleResultColumn({
  title,
  tagClass,
  result,
}: {
  title: string;
  tagClass: string;
  result: SingleStressResult;
}) {
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tagClass}`}>{title}</span>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Сценарий</span>
          <span className="font-medium text-gray-800">{result.scenario_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Портфель до</span>
          <span className="font-medium text-gray-800">{fmt(result.portfolio_value_before)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Портфель после</span>
          <span className="font-medium text-gray-800">{fmt(result.portfolio_value_after)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Общие потери</span>
          <span className={`font-bold ${result.total_loss_pct < -10 ? 'text-red-600' : result.total_loss_pct < 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {result.total_loss_pct > 0 ? '+' : ''}{result.total_loss_pct.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Макс. потери актива</span>
          <span className="font-medium text-red-600">{result.max_single_asset_loss_pct.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Время восстановления</span>
          <span className="font-medium text-gray-800">{result.recovery_time_months.toFixed(0)} мес.</span>
        </div>
      </div>

      {result.asset_impacts.length > 0 && (
        <div className="mt-4">
          <h5 className="text-xs font-semibold text-gray-500 mb-2 uppercase">Влияние на активы</h5>
          <div className="space-y-1">
            {result.asset_impacts.map((a, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[60%]">{a.asset}</span>
                <span className={a.loss_pct < -10 ? 'text-red-600 font-medium' : a.loss_pct < 0 ? 'text-orange-600' : 'text-green-600'}>
                  {a.loss_pct > 0 ? '+' : ''}{a.loss_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Таблица сравнения НСБУ vs МСФО ── */
function ComparisonTable({
  nsbu,
  ifrs,
  comparison,
}: {
  nsbu: SingleStressResult;
  ifrs: SingleStressResult;
  comparison: DualResult['comparison'];
}) {
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const diffColor = (diff: number) =>
    diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-600';

  const rows = [
    {
      label: 'Общие потери (%)',
      nsbu: nsbu.total_loss_pct.toFixed(2) + '%',
      ifrs: ifrs.total_loss_pct.toFixed(2) + '%',
      diff: comparison.loss_difference,
      diffStr: comparison.loss_difference.toFixed(2) + ' п.п.',
    },
    {
      label: 'Стоимость портфеля до',
      nsbu: fmt(nsbu.portfolio_value_before),
      ifrs: fmt(ifrs.portfolio_value_before),
      diff: ifrs.portfolio_value_before - nsbu.portfolio_value_before,
      diffStr: fmt(ifrs.portfolio_value_before - nsbu.portfolio_value_before),
    },
    {
      label: 'Стоимость портфеля после',
      nsbu: fmt(nsbu.portfolio_value_after),
      ifrs: fmt(ifrs.portfolio_value_after),
      diff: ifrs.portfolio_value_after - nsbu.portfolio_value_after,
      diffStr: fmt(ifrs.portfolio_value_after - nsbu.portfolio_value_after),
    },
    {
      label: 'Макс. потери актива (%)',
      nsbu: nsbu.max_single_asset_loss_pct.toFixed(2) + '%',
      ifrs: ifrs.max_single_asset_loss_pct.toFixed(2) + '%',
      diff: ifrs.max_single_asset_loss_pct - nsbu.max_single_asset_loss_pct,
      diffStr: (ifrs.max_single_asset_loss_pct - nsbu.max_single_asset_loss_pct).toFixed(2) + ' п.п.',
    },
    {
      label: 'Время восстановления (мес.)',
      nsbu: nsbu.recovery_time_months.toFixed(0),
      ifrs: ifrs.recovery_time_months.toFixed(0),
      diff: comparison.recovery_diff,
      diffStr: comparison.recovery_diff.toFixed(1),
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
      <h4 className="font-bold text-gray-900 mb-4">📊 Сравнение НСБУ и МСФО</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">Показатель</th>
              <th className="text-right py-2 pr-4 text-blue-700 font-medium">НСБУ</th>
              <th className="text-right py-2 pr-4 text-purple-700 font-medium">МСФО</th>
              <th className="text-right py-2 text-gray-500 font-medium">Разница</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-700">{r.label}</td>
                <td className="py-2 pr-4 text-right font-medium text-gray-800">{r.nsbu}</td>
                <td className="py-2 pr-4 text-right font-medium text-gray-800">{r.ifrs}</td>
                <td className={`py-2 text-right font-semibold ${diffColor(r.diff)}`}>
                  {r.diff > 0 ? '+' : ''}{r.diffStr}
                </td>
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
  const { activeStandard: stdMode, setActiveStandard: setStdMode } = useAnalytics();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StressResult[]>([]);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Двойной режим
  const [testMode, setTestMode] = useState<'single' | 'dual'>('single');
  const [dualResult, setDualResult] = useState<DualResult | null>(null);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  async function runStressTest() {
    setRunning(true);
    setError('');
    setResults([]);
    setAiSummary([]);
    setDualResult(null);

    try {
      if (testMode === 'dual') {
        // Двойной режим — НСБУ + МСФО
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/stress-test/run/dual`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ scenario, severity: severity === 'mild' ? 0.5 : severity === 'moderate' ? 1.0 : severity === 'severe' ? 1.5 : 2.0 }),
          }
        );
        if (res.ok) {
          const d: DualResult = await res.json();
          setDualResult(d);
        } else {
          setError('Ошибка ' + res.status + ': Проверьте наличие данных в разделе Портфели');
        }
      } else {
        // Одиночный режим — как раньше
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

      {/* ── Переключатель режима ── */}
      <div className="flex gap-2">
        <button
          onClick={() => { setTestMode('single'); setDualResult(null); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            testMode === 'single'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Одиночный режим
        </button>
        <button
          onClick={() => { setTestMode('dual'); setResults([]); setAiSummary([]); }}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            testMode === 'dual'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Двойной режим НСБУ+МСФО
        </button>
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
            {testMode === 'single' && (
              <>
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
              </>
            )}

            {testMode === 'dual' && (
              <div className="mb-2">
                <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-medium">
                  Двойной режим: НСБУ + МСФО одновременно
                </span>
              </div>
            )}

            <button
              onClick={runStressTest}
              disabled={running}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {running ? '⏳ Запускаем...' : testMode === 'dual' ? '🔥 Запустить двойной стресс-тест' : '🔥 Запустить стресс-тест'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* ── Одиночный режим: старые результаты ── */}
      {testMode === 'single' && (
        <>
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
        </>
      )}

      {/* ── Двойной режим: результаты НСБУ + МСФО ── */}
      {testMode === 'dual' && dualResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Левая колонка — НСБУ */}
            <SingleResultColumn
              title="Результаты НСБУ"
              tagClass="bg-blue-100 text-blue-700"
              result={dualResult.nsbu}
            />

            {/* Правая колонка — МСФО */}
            {dualResult.comparison.ifrs_available && dualResult.ifrs ? (
              <SingleResultColumn
                title="Результаты МСФО"
                tagClass="bg-purple-100 text-purple-700"
                result={dualResult.ifrs}
              />
            ) : (
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Результаты МСФО</span>
                </div>
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500 text-sm max-w-xs">
                  Для двойного теста импортируйте данные и запустите МСФО-конвертацию
                </p>
                <a
                  href="/analytics/ifrs-converter"
                  className="mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium underline"
                >
                  Перейти к МСФО-конвертации →
                </a>
              </div>
            )}
          </div>

          {/* Сводная таблица сравнения */}
          {dualResult.comparison.ifrs_available && dualResult.ifrs && (
            <ComparisonTable
              nsbu={dualResult.nsbu}
              ifrs={dualResult.ifrs}
              comparison={dualResult.comparison}
            />
          )}
        </div>
      )}

      <NextStepBanner
        label="Просмотреть визуализации →"
        href="/analytics/visualizations"
        description="Каскадные, торнадо и пузырьковые диаграммы"
      />
    </div>
  );
}
