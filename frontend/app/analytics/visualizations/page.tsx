'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { formatCurrencyUZS } from '@/lib/formatters';
import { useAnalytics } from '@/contexts/AnalyticsContext';

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

type VizTab = 'waterfall' | 'tornado' | 'bubble' | 'heatmap';

const TABS: { key: VizTab; label: string }[] = [
  { key: 'waterfall', label: '📊 Каскад (Waterfall)' },
  { key: 'tornado', label: '🌪️ Торнадо' },
  { key: 'bubble', label: '🧠 Пузырьковая' },
  { key: 'heatmap', label: '🔥 Тепловая карта' },
];

interface WaterfallItem {
  name: string;
  value: number;
  cumulative: number;
  type: 'start' | 'positive' | 'negative' | 'total';
}

interface TornadoItem {
  factor: string;
  impact: number;
}

interface BubbleItem {
  name: string;
  x: number;
  y: number;
  size: number;
}

interface HeatCell {
  value: number;
}

// Demo-данные для отображения (если API недоступен)
const DEMO_WATERFALL: WaterfallItem[] = [
  { name: 'Начальный баланс', value: 500_000_000, cumulative: 500_000_000, type: 'start' },
  { name: 'Выручка', value: 120_000_000, cumulative: 620_000_000, type: 'positive' },
  { name: 'Себестоимость', value: -80_000_000, cumulative: 540_000_000, type: 'negative' },
  { name: 'Инвестиции', value: -50_000_000, cumulative: 490_000_000, type: 'negative' },
  { name: 'Дивиденды', value: 30_000_000, cumulative: 520_000_000, type: 'positive' },
  { name: 'Итоговый баланс', value: 520_000_000, cumulative: 520_000_000, type: 'total' },
];

const DEMO_TORNADO: TornadoItem[] = [
  { factor: 'Процентная ставка', impact: -45 },
  { factor: 'Валютный курс USD/UZS', impact: -38 },
  { factor: 'Рост выручки', impact: 42 },
  { factor: 'Инфляция', impact: -30 },
  { factor: 'Рынок недвижимости', impact: 25 },
  { factor: 'Политические риски', impact: -20 },
];

const DEMO_BUBBLE: BubbleItem[] = [
  { name: 'Основные средства', x: 15000000, y: 5, size: 15000000 },
  { name: 'Запасы', x: 8000000, y: 12, size: 8000000 },
  { name: 'Дебиторка', x: 5000000, y: 8, size: 5000000 },
  { name: 'Денежные средства', x: 3000000, y: 2, size: 3000000 },
  { name: 'Кап. вложения', x: 2000000, y: 15, size: 2000000 },
];

const DEMO_HEATMAP = [
  ['Выручка', 100, 85, 70, 60, 50, 40],
  ['Себестоимость', 85, 100, 60, 55, 45, 35],
  ['Чист. прибыль', 70, 60, 100, 50, 40, 30],
  ['Активы', 60, 55, 50, 100, 80, 70],
  ['Капитал', 50, 45, 40, 80, 100, -60],
  ['Обязательства', 40, 35, 30, 70, -60, 100],
];
const DEMO_HEATMAP_MONTHS = ['Выручка', 'Себестоимость', 'Чист. прибыль', 'Активы', 'Капитал', 'Обязательства'];

function WaterfallChartView({ data }: { data: WaterfallItem[] }) {
  const fmt = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} млн`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
    return v.toString();
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-4">📊 Каскадная диаграмма — Движение баланса (UZS)</h4>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tickFormatter={fmt} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            formatter={(val: number) => [formatCurrencyUZS(val), 'Сумма']}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.type === 'start' || entry.type === 'total' ? '#6366f1' :
                  entry.value > 0 ? '#10b981' : '#ef4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TornadoChartView({ data }: { data: TornadoItem[] }) {
  const sorted = [...data].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-4">🌪️ Диаграмма Торнадо — чувствительность к факторам (%)</h4>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="factor" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
          <Tooltip
            formatter={(val: number) => [`${val > 0 ? '+' : ''}${val}%`, 'Влияние']}
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, color: '#f1f5f9' }}
          />
          <Bar dataKey="impact" radius={[0, 6, 6, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.impact > 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BubbleChartView({ data }: { data: BubbleItem[] }) {
  const fmtAxis = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} млн`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} тыс`;
    return v.toString();
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-2">🧠 Пузырьковая диаграмма — Стоимость актива / Доходность / Объём</h4>
      <p className="text-slate-400 text-xs mb-4">Ось X = Стоимость актива (UZS), Ось Y = Доходность (%), Размер = Объём</p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="x" name="Стоимость" tickFormatter={fmtAxis} tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Стоимость актива (UZS)', fill: '#94a3b8', position: 'insideBottom', offset: -5 }} />
          <YAxis dataKey="y" name="Доходность" unit="%" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis dataKey="size" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as BubbleItem;
              return (
                <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600 }}>{d.name}</p>
                  <p style={{ color: '#94a3b8', fontSize: 12 }}>Стоимость: {formatCurrencyUZS(d.x)} | Доходность: {d.y}%</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="#6366f1">
            {data.map((_, i) => (
              <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-4">
        {data.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6] }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeatmapView({ data, months }: { data: (string | number)[][]; months: string[] }) {
  const getColor = (val: number) => {
    if (val > 0) return `rgba(16, 185, 129, ${Math.min(val / 100, 1)})`;
    return `rgba(239, 68, 68, ${Math.min(Math.abs(val) / 100, 1)})`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-4">🔥 Тепловая карта — корреляция финансовых показателей</h4>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left text-slate-400 pr-4 py-2">Показатель</th>
              {months.map(m => (
                <th key={m} className="text-center text-slate-400 px-2 py-2 font-medium">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td className="text-slate-300 pr-4 py-1 font-medium whitespace-nowrap">{row[0]}</td>
                {(row.slice(1) as number[]).map((cell, j) => (
                  <td
                    key={j}
                    className="w-14 h-10 text-center rounded-lg mx-0.5"
                    style={{
                      backgroundColor: getColor(cell),
                      color: Math.abs(cell) > 40 ? 'white' : '#94a3b8',
                    }}
                  >
                    {cell > 0 ? '+' : ''}{cell.toFixed(0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-xs mt-3">🟢 Положительная корреляция &nbsp; 🔴 Отрицательная корреляция &nbsp; Диапазон: -100 … +100</p>
    </div>
  );
}

export default function VisualizationsPage() {
  const [activeTab, setActiveTab] = useState<VizTab>('waterfall');
  const [waterfallData, setWaterfallData] = useState<WaterfallItem[]>(DEMO_WATERFALL);
  const [tornadoData, setTornadoData] = useState<TornadoItem[]>(DEMO_TORNADO);
  const [bubbleData, setBubbleData] = useState<BubbleItem[]>(DEMO_BUBBLE);
  const [heatmapData, setHeatmapData] = useState<(string | number)[][]>(DEMO_HEATMAP);
  const [heatmapMonths, setHeatmapMonths] = useState<string[]>(DEMO_HEATMAP_MONTHS);
  const [isRealData, setIsRealData] = useState(false);
  const { activeStandard } = useAnalytics();

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/visualizations`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || Object.keys(d).length === 0) return;

        // Waterfall: array of WaterfallItem
        if (Array.isArray(d.waterfall) && d.waterfall.length) {
          setWaterfallData(d.waterfall);
          setIsRealData(true);
        }

        // Tornado: array of TornadoItem
        if (Array.isArray(d.tornado) && d.tornado.length) {
          setTornadoData(d.tornado);
        }

        // Bubble: array of BubbleItem
        if (Array.isArray(d.bubble) && d.bubble.length) {
          setBubbleData(d.bubble);
        }

        // Heatmap: array of arrays
        if (Array.isArray(d.heatmap) && d.heatmap.length) {
          setHeatmapData(d.heatmap);
        }
        if (Array.isArray(d.heatmap_months) && d.heatmap_months.length) {
          setHeatmapMonths(d.heatmap_months);
        }
      })
      .catch(() => { /* остаёмся на demo */ });
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">📊 Визуализации</h2>
            <p className="text-sm text-gray-500">4 типа диаграмм: Каскад, Торнадо, Пузырьковая, Тепловая карта</p>
          </div>
          {isRealData ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Данные из 1С</span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Демо-данные</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0]">
        <div className="flex border-b border-[#e2e8f0] px-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'waterfall' && <WaterfallChartView data={waterfallData} />}
          {activeTab === 'tornado' && <TornadoChartView data={tornadoData} />}
          {activeTab === 'bubble' && <BubbleChartView data={bubbleData} />}
          {activeTab === 'heatmap' && <HeatmapView data={heatmapData} months={heatmapMonths} />}
        </div>
      </div>
    </div>
  );
}
