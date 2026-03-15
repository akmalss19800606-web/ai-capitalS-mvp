"use client";

import { useState, useEffect, useCallback } from "react";

// === Types ===
interface TickerItem {
  code: string;
  name: string;
  rate: number;
  diff: number;
  diff_percent: number;
  sparkline: number[];
  updated_at: string | null;
}

interface HeatmapStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change_percent: number;
  market_cap: number;
}

interface HeatmapSector {
  name: string;
  stocks: HeatmapStock[];
  total_change_percent: number;
}

interface Sector {
  name: string;
  code: string;
  change_percent: number;
  weekly_change_percent: number;
  stocks_count: number;
  top_stocks: string[];
}

interface MacroData {
  refinancing_rate: number;
  industrial_growth: number;
  trade_balance: number;
  updated_at: string | null;
}

// === Helpers ===
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI(path: string) {
  const res = await fetch(`${API}/api/v1/dashboard${path}`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// === A: Ticker Bar Component ===
function TickerBar({ items }: { items: TickerItem[] }) {
  if (!items.length) return <div className="h-10 bg-gray-100 animate-pulse rounded" />;
  return (
    <div className="bg-gray-900 text-white py-2 px-4 rounded-lg overflow-hidden">
      <div className="flex gap-8 animate-marquee whitespace-nowrap">
        {items.concat(items).map((item, i) => (
          <span key={`${item.code}-${i}`} className="inline-flex items-center gap-2 text-sm">
            <span className="font-bold">{item.code}</span>
            <span>{item.rate.toLocaleString()}</span>
            <span className={item.diff >= 0 ? "text-green-400" : "text-red-400"}>
              {item.diff >= 0 ? "+" : ""}{item.diff.toFixed(2)} ({item.diff_percent}%)
            </span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

// === Widget Card Wrapper ===
function WidgetCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

// === C: Heatmap Component ===
function HeatmapWidget({ sectors }: { sectors: HeatmapSector[] }) {
  const getColor = (pct: number) => {
    if (pct > 3) return "bg-green-700 text-white";
    if (pct > 0) return "bg-green-500 text-white";
    if (pct === 0) return "bg-gray-400 text-white";
    if (pct > -3) return "bg-red-500 text-white";
    return "bg-red-700 text-white";
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
      {sectors.flatMap(s => s.stocks).map(stock => (
        <div key={stock.ticker} className={`${getColor(stock.change_percent)} rounded p-2 text-center text-xs`} title={stock.name}>
          <div className="font-bold">{stock.ticker}</div>
          <div>{stock.change_percent > 0 ? "+" : ""}{stock.change_percent.toFixed(1)}%</div>
          <div className="opacity-70">{stock.price.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// === F: Sectors Widget ===
function SectorsWidget({ sectors }: { sectors: Sector[] }) {
  return (
    <div className="space-y-2">
      {sectors.sort((a, b) => b.change_percent - a.change_percent).map(s => (
        <div key={s.code} className="flex items-center justify-between py-1">
          <div>
            <span className="font-medium text-sm">{s.name}</span>
            <span className="text-xs text-gray-400 ml-2">({s.stocks_count})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${s.change_percent >= 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(Math.abs(s.change_percent) * 20, 100)}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${s.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {s.change_percent > 0 ? "+" : ""}{s.change_percent.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// === I: Currency Widget ===
function CurrencyWidget({ items }: { items: TickerItem[] }) {
  return (
    <div className="space-y-2">
      {items.slice(0, 5).map(c => (
        <div key={c.code} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{c.code.slice(0, 2)}</span>
            <div>
              <div className="font-medium text-sm">{c.code}</div>
              <div className="text-xs text-gray-400">{c.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm">{c.rate.toLocaleString()} UZS</div>
            <div className={`text-xs ${c.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {c.diff >= 0 ? "+" : ""}{c.diff.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// === I: Macro Widget ===
function MacroWidget({ data }: { data: MacroData | null }) {
  if (!data) return <div className="h-20 bg-gray-100 animate-pulse rounded" />;
  const items = [
    { label: "\u0421\u0442\u0430\u0432\u043a\u0430 \u0440\u0435\u0444.", value: `${data.refinancing_rate}%`, icon: "\ud83c\udfe6" },
    { label: "\u041f\u0440\u043e\u043c. \u0440\u043e\u0441\u0442", value: `${data.industrial_growth}%`, icon: "\ud83c\udfed" },
    { label: "\u0422\u043e\u0440\u0433. \u0431\u0430\u043b\u0430\u043d\u0441", value: `${data.trade_balance}B$`, icon: "\ud83d\udce6" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(m => (
        <div key={m.label} className="text-center p-2 rounded-lg bg-gray-50">
          <div className="text-lg">{m.icon}</div>
          <div className="font-bold text-sm">{m.value}</div>
          <div className="text-xs text-gray-500">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// === Quick Tools ===
function QuickTools() {
  const tools = [
    { name: "\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440", href: "/calculator", icon: "\ud83e\uddee" },
    { name: "\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u0438", href: "/portfolios", icon: "\ud83d\udcbc" },
    { name: "\u0420\u0435\u0448\u0435\u043d\u0438\u044f", href: "/decisions", icon: "\u2696\ufe0f" },
    { name: "\u0418\u0441\u043b\u0430\u043c. \u0444\u0438\u043d\u0430\u043d\u0441\u044b", href: "/islamic-finance", icon: "\ud83c\udd4c" },
    { name: "\u041e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438", href: "/organizations", icon: "\ud83c\udfe2" },
    { name: "AI \u0410\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442", href: "/ai-assistant", icon: "\ud83e\udd16" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {tools.map(t => (
        <a key={t.href} href={t.href} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-sm">
          <span className="text-lg">{t.icon}</span>
          <span className="font-medium">{t.name}</span>
        </a>
      ))}
    </div>
  );
}

// === Main Dashboard Page ===
export default function DashboardPage() {
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapSector[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tickerRes, heatmapRes, sectorsRes, macroRes] = await Promise.allSettled([
        fetchAPI("/ticker"),
        fetchAPI("/heatmap"),
        fetchAPI("/sectors"),
        fetchAPI("/macro"),
      ]);
      if (tickerRes.status === "fulfilled") setTicker(tickerRes.value.items || []);
      if (heatmapRes.status === "fulfilled") setHeatmap(heatmapRes.value.sectors || []);
      if (sectorsRes.status === "fulfilled") setSectors(sectorsRes.value.sectors || []);
      if (macroRes.status === "fulfilled") setMacro(macroRes.value);
      setError(null);
    } catch (e) {
      setError("\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0434\u0430\u043d\u043d\u044b\u0445");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Capital Management</h1>
          <p className="text-sm text-gray-500">\u0413\u043b\u0430\u0432\u043d\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      {/* Row 1: Ticker Bar */}
      <div className="mb-4">
        <TickerBar items={ticker} />
      </div>

      {/* Row 2: Macro KPI */}
      <div className="mb-6">
        <MacroWidget data={macro} />
      </div>

      {/* Row 3: Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Col 1 */}
        <WidgetCard title="\ud83d\udcc8 \u0422\u0435\u043f\u043b\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430 UZSE" className="md:col-span-2 xl:col-span-2">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <HeatmapWidget sectors={heatmap} />}
        </WidgetCard>

        <WidgetCard title="\ud83d\udcb1 \u0412\u0430\u043b\u044e\u0442\u044b">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <CurrencyWidget items={ticker} />}
        </WidgetCard>

        <WidgetCard title="\ud83c\udfe6 \u0421\u0435\u043a\u0442\u043e\u0440\u0430">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <SectorsWidget sectors={sectors} />}
        </WidgetCard>

        <WidgetCard title="\u26a1 \u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b" className="xl:col-span-2">
          <QuickTools />
        </WidgetCard>
      </div>
    </div>
  );
}
