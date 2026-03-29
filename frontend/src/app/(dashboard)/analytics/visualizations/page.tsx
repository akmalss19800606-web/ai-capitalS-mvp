'use client';
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';

type VizTab = 'waterfall' | 'tornado' | 'bubble' | 'heatmap';

const TABS: { key: VizTab; label: string }[] = [
  { key: 'waterfall', label: '📊 Waterfall' },
  { key: 'tornado', label: '🌪️ Tornado' },
  { key: 'bubble', label: '🧠 Bubble' },
  { key: 'heatmap', label: '🔥 Heatmap' },
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
  risk: number;
  return: number;
  volume: number;
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
  { name: 'Акции', risk: 35, return: 18, volume: 120 },
  { name: 'Облигации', risk: 10, return: 8, volume: 200 },
  { name: 'Недвижимость', risk: 15, return: 12, volume: 300 },
  { name: 'Депозиты', risk: 5, return: 5, volume: 500 },
  { name: 'Товары', risk: 50, return: 25, volume: 80 },
  { name: 'Ислам сукук', risk: 8, return: 11, volume: 150 },
];

const DEMO_HEATMAP = [
  ['Акции', 12.5, -3.2, 8.1, 15.4, -2.1, 6.8],
  ['Облигации', 5.2, 4.8, 6.1, -1.2, 7.3, 5.5],
  ['Недвижимость', 3.1, 8.5, -0.5, 4.2, 9.1, 7.0],
  ['Депозиты', 2.0, 2.1, 2.2, 2.0, 2.3, 2.1],
  ['Сукук', 6.5, 5.8, 7.2, 6.0, 5.5, 6.9],
];
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'];

function WaterfallChartView({ data }: { data: WaterfallItem[] }) {
  const fmt = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}м`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}т`;
    return v.toString();
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-4">📊 Waterfall --- Движение баланса (UZS)</h4>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tickFormatter={fmt} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            formatter={(val: number) => [new Intl.NumberFormat('ru-UZ').format(val) + ' UZS', 'Сумма']}
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
      <h4 className="text-white font-bold mb-4">🌪️ Диаграмма Торнадо --- чувствительность к факторам (%)</h4>
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
  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-2">🧠 Bubble Chart --- Риск / Доходность / Объём</h4>
      <p className="text-slate-400 text-xs mb-4">Ось X = Риск (%), Ось Y = Доходность (%), Размер = Объём позиции</p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="risk" name="Риск" unit="%" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Риск (%)', fill: '#94a3b8', position: 'insideBottom', offset: -5 }} />
          <YAxis dataKey="return" name="Доходность" unit="%" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <ZAxis dataKey="volume" range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as BubbleItem;
              return (
                <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8, padding: '8px 12px' }}>
                  <p style={{ color: '#f1f5f9', fontWeight: 600 }}>{d.name}</p>
                  <p style={{ color: '#94a3b8', fontSize: 12 }}>Риск: {d.risk}% | Доходность: {d.return}%</p>
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
    if (val > 0) return `rgba(16, 185, 129, ${Math.min(val / 20, 1)})`;
    return `rgba(239, 68, 68, ${Math.min(Math.abs(val) / 20, 1)})`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 rounded-2xl p-6">
      <h4 className="text-white font-bold mb-4">🔥 Тепловая карта доходности (%)</h4>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left text-slate-400 pr-4 py-2">Актив</th>
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
                      color: Math.abs(cell) > 8 ? 'white' : '#94a3b8',
                    }}
                  >
                    {cell > 0 ? '+' : ''}{cell.toFixed(1)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-xs mt-3">🟢 Положительная доходность &nbsp; 🔴 Отрицательная доходность</p>
    </div>
  );
}

export default function VisualizationsPage() {
  const [activeTab, setActiveTab] = useState<VizTab>('waterfall');
  const [waterfallData, setWaterfallData] = useState<WaterfallItem[]>(DEMO_WATERFALL);
  const [tornadoData, setTornadoData] = useState<TornadoItem[]>(DEMO_TORNADO);
  const [bubbleData, setBubbleData] = useState<BubbleItem[]>(DEMO_BUBBLE);
  const [heatmapData, setHeatmapData] = useState<(string | number)[][]>(DEMO_HEATMAP);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  useEffect(() => {
    // Попытка загрузить реальные данные из API (fallback на demo)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/visualizations`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.waterfall?.length) setWaterfallData(d.waterfall);
        if (d.tornado?.length) setTornadoData(d.tornado);
        if (d.bubble?.length) setBubbleData(d.bubble);
        if (d.heatmap?.length) setHeatmapData(d.heatmap);
      })
      .catch(() => { /* остаёмся на demo */ });
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">📊 Визуализации</h2>
        <p className="text-sm text-gray-500">4 типа диаграмм: Waterfall, Tornado, Bubble Chart, Тепловая карта</p>
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
          {activeTab === 'heatmap' && <HeatmapView data={heatmapData} months={MONTHS} />}
        </div>
      </div>
    </div>
  );
}
