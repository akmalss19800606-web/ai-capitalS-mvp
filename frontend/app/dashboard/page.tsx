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
interface NewsItem {
  id: number;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: string;
  published_at: string;
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

async function fetchNewsAPI() {
  const res = await fetch(`${API}/api/v1/news?limit=6`, {
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`News API error ${res.status}`);
  return res.json();
}

// === A: Ticker Bar Component ===
function TickerBar({ items }: { items: TickerItem[] }) {
  if (!items.length) return <div className="h-8" />;
  return (
    <div className="relative overflow-hidden bg-gray-900 text-white py-2 rounded-lg">
      <div className="flex animate-marquee whitespace-nowrap">
        {items.concat(items).map((item, i) => (
          <span key={i} className="mx-4 inline-flex items-center gap-2 text-sm">
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
    <div className={`bg-white rounded-2xl shadow p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-500 mb-3">{title}</h3>
      <div>{children}</div>
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
    <div className="grid grid-cols-4 gap-1">
      {sectors.flatMap(s => s.stocks).map(stock => (
        <div key={stock.ticker} className={`${getColor(stock.change_percent)} rounded p-2 text-center text-xs`}>
          <div className="font-bold">{stock.ticker}</div>
          <div>{stock.change_percent > 0 ? "+" : ""}{stock.change_percent.toFixed(1)}%</div>
          <div>{stock.price.toLocaleString()}</div>
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
        <div key={s.code} className="flex items-center gap-2">
          <span className="text-sm w-32 truncate">{s.name}<span className="text-gray-400">({s.stocks_count})</span></span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${s.change_percent >= 0 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${Math.min(Math.abs(s.change_percent) * 20, 100)}%` }} />
          </div>
          <span className={`text-sm font-medium w-16 text-right ${s.change_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
            {s.change_percent > 0 ? "+" : ""}{s.change_percent.toFixed(1)}%
          </span>
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
        <div key={c.code} className="flex items-center gap-3 py-1">
          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">{c.code.slice(0, 2)}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm">{c.code}</div>
            <div className="text-xs text-gray-400">{c.name}</div>
          </div>
          <div className="text-right">
            <div className="font-medium text-sm">{c.rate.toLocaleString()} UZS</div>
            <div className={`text-xs ${c.diff >= 0 ? "text-green-600" : "text-red-600"}`}>
              {c.diff >= 0 ? "+" : ""}{c.diff.toFixed(2)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// === Macro Widget ===
function MacroWidget({ data }: { data: MacroData | null }) {
  if (!data) return <div className="h-20" />;
  const items = [
    { label: "Ставка реф.", value: `${data.refinancing_rate}%`, icon: "🏦" },
    { label: "Пром. рост", value: `${data.industrial_growth}%`, icon: "🏭" },
    { label: "Торг. баланс", value: `${data.trade_balance}B$`, icon: "📦" },
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(m => (
        <div key={m.label} className="text-center">
          <div className="text-2xl">{m.icon}</div>
          <div className="text-lg font-bold">{m.value}</div>
          <div className="text-xs text-gray-500">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// === News Widget (NEW) ===
const CATEGORY_LABELS: Record<string, string> = {
  all: "Все",
  official: "Официальные",
  market: "Рынок",
  banks: "Банки",
  investment: "Инвестиции",
};

const SOURCE_COLORS: Record<string, string> = {
  "cbu.uz": "bg-blue-100 text-blue-700",
  "gazeta.uz": "bg-orange-100 text-orange-700",
  "mf.uz": "bg-green-100 text-green-700",
  default: "bg-gray-100 text-gray-600",
};

function NewsWidget({ items, loading }: { items: NewsItem[]; loading: boolean }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? items : items.filter(n => n.category === filter);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-3xl mb-2">📰</div>
        <div className="text-sm">Новости загружаются...</div>
      </div>
    );
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
              filter === key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* News list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filtered.slice(0, 6).map(news => (
          <a
            key={news.id}
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                  {news.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${SOURCE_COLORS[news.source] || SOURCE_COLORS.default}`}>
                    {news.source}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(news.published_at)}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          Обновлено {items.length > 0 ? timeAgo(items[0].published_at) : "—"}
        </span>
        <a href="/uz-market" className="text-xs text-blue-600 hover:underline">
          Все новости →
        </a>
      </div>
    </div>
  );
}

// === Quick Tools (UPDATED) ===
function QuickTools() {
  const tools = [
    { name: "Инвесткалькулятор", href: "/calculator", icon: "🧮" },
    { name: "Портфели", href: "/portfolios", icon: "💼" },
    { name: "Исламские финансы", href: "/islamic-finance", icon: "🕌" },
    { name: "Рынок UZ", href: "/market-uz", icon: "📊" },
    { name: "Стресс-тест", href: "/stress-testing", icon: "🔬" },
    { name: "AI Ассистент", href: "/ai-assistant", icon: "🤖" },
    { name: "Аналитика", href: "/analytics", icon: "📈" },
    { name: "Due Diligence", href: "/due-diligence", icon: "🔍" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tools.map(t => (
        <a key={t.name} href={t.href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm border border-gray-100">
          <span className="text-lg">{t.icon}</span>
          <span>{t.name}</span>
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
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
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
      setError("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    try {
      setNewsLoading(true);
      const data = await fetchNewsAPI();
      setNews(data.items || []);
    } catch {
      // News are non-critical, fail silently
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadNews();
    const dataInterval = setInterval(loadData, 300000);  // 5 min
    const newsInterval = setInterval(loadNews, 900000);  // 15 min
    return () => {
      clearInterval(dataInterval);
      clearInterval(newsInterval);
    };
  }, [loadData, loadNews]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Capital Management</h1>
          <p className="text-sm text-gray-500">Главная панель управления активами</p>
        </div>
        <button onClick={() => { loadData(); loadNews(); }} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Обновить
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
        {/* Heatmap - wide */}
        <WidgetCard title="📈 Тепловая карта биржи UZSE" className="md:col-span-2 xl:col-span-2">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <HeatmapWidget sectors={heatmap} />}
        </WidgetCard>

        {/* Currency */}
        <WidgetCard title="💱 Курсы валют">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <CurrencyWidget items={ticker} />}
        </WidgetCard>

        {/* Sectors */}
        <WidgetCard title="🟦 Сектора экономики">
          {loading ? <div className="h-40 bg-gray-100 animate-pulse rounded" /> : <SectorsWidget sectors={sectors} />}
        </WidgetCard>

        {/* NEWS WIDGET - NEW */}
        <WidgetCard title="📰 Экономические новости UZ" className="xl:col-span-2">
          <NewsWidget items={news} loading={newsLoading} />
        </WidgetCard>

        {/* Quick Tools - full width */}
        <WidgetCard title="⚡ Быстрые инструменты" className="md:col-span-2 xl:col-span-3">
          <QuickTools />
        </WidgetCard>
      </div>
    </div>
  );
}