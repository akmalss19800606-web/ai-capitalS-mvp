"use client";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Project {
  name: string;
  initial_investment: number;
  currency: string;
  revenue_year1: number;
  revenue_growth_rate: number;
  operating_margin: number;
  horizon_years: number;
  discount_rate: number;
  tax_rate: number;
  capex_annual: number;
}

interface ProjectResult {
  name: string;
  npv: number;
  irr: number;
  mirr: number;
  payback_period: number;
  discounted_payback: number;
  profitability_index: number;
  roi_pct: number;
  total_revenue: number;
  total_profit: number;
  yearly_cashflows: number[];
}

const defaultProject = (): Project => ({
  name: "",
  initial_investment: 50000,
  currency: "USD",
  revenue_year1: 30000,
  revenue_growth_rate: 0.15,
  operating_margin: 0.25,
  horizon_years: 5,
  discount_rate: 0.14,
  tax_rate: 0.15,
  capex_annual: 0,
});

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// ==================== BENCHMARK PANEL ====================
function BenchmarkPanel() {
  const [benchmarks, setBenchmarks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/calculator/benchmarks`)
      .then((r) => r.json())
      .then(setBenchmarks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 p-4">Загрузка бенчмарков...</div>;
  if (!benchmarks) return <div className="text-red-400 p-4">Не удалось загрузить</div>;

  const items = [
    { label: "Ставка ЦБ", value: `${benchmarks.cb_rate}%`, icon: "🏛️" },
    { label: "Инфляция", value: `${benchmarks.inflation}%`, icon: "📈" },
    { label: "Кредитная ставка", value: `${benchmarks.lending_rate}%`, icon: "🏦" },
    { label: "Депозит UZS", value: `${benchmarks.deposit_rate}%`, icon: "💰" },
    { label: "TSMI", value: `${benchmarks.tsmi_index}`, icon: "📊" },
    { label: "TSMI YTD", value: `+${benchmarks.tsmi_ytd}%`, icon: "🚀" },
    { label: "USD/UZS", value: `${benchmarks.usd_uzs.toLocaleString()}`, icon: "💱" },
    { label: "ГКО 3Y", value: `${benchmarks.gov_bond_3y}%`, icon: "📜" },
    { label: "ГКО 10Y", value: `${benchmarks.gov_bond_10y}%`, icon: "📜" },
    { label: "Рост ВВП", value: `${benchmarks.gdp_growth}%`, icon: "🌍" },
  ];

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <h3 className="text-white font-bold mb-3">📊 Бенчмарки рынка Узбекистана</h3>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg">{item.icon}</div>
            <div className="text-white font-bold text-sm">{item.value}</div>
            <div className="text-gray-500 text-xs">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== IRR vs BENCHMARKS ====================
function IrrBenchmarkCompare({ irr, currency }: { irr: number; currency: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!irr) return;
    fetch(`${API}/calculator/benchmarks/compare?project_irr=${irr}&currency=${currency}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [irr, currency]);

  if (!data) return null;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <h3 className="text-white font-bold mb-3">🏆 IRR vs Бенчмарки ({data.currency})</h3>
      <div className="space-y-2">
        {data.comparisons?.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
            <span className="text-gray-300 text-sm">{c.benchmark}</span>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{c.benchmark_rate}%</span>
              <span className={`text-sm font-bold ${c.spread > 0 ? "text-green-400" : c.spread < -2 ? "text-red-400" : "text-yellow-400"}`}>
                {c.spread > 0 ? "+" : ""}{c.spread.toFixed(1)}%
              </span>
              <span className="text-xs">{c.verdict}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-3 p-3 rounded-lg text-sm ${data.verdict?.includes("привлекательная") ? "bg-green-900/30 text-green-400" : data.verdict?.includes("безрисковые") ? "bg-yellow-900/30 text-yellow-400" : "bg-red-900/30 text-red-400"}`}>
        {data.verdict}
      </div>
    </div>
  );
}

// ==================== XAI PANEL ====================
function XaiPanel({ project }: { project: Project }) {
  const [xai, setXai] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/calculator/xai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      setXai(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">🧠 XAI — Объяснимость решения</h3>
        <button onClick={analyze} disabled={loading} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white disabled:opacity-40">
          {loading ? "Анализ..." : "Объяснить"}
        </button>
      </div>
      {xai && (
        <div className="space-y-3">
          {/* Feature Importance Bars */}
          <div className="space-y-2">
            {Object.entries(xai.feature_importances || {})
              .sort(([, a]: any, [, b]: any) => b - a)
              .map(([name, pct]: any) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-40 text-right">{name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-white text-xs w-10">{pct}%</span>
                </div>
              ))}
          </div>
          {/* Key Drivers */}
          <div className="flex gap-2 mt-2">
            {xai.key_drivers?.map((d: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-purple-900/40 border border-purple-700 rounded text-xs text-purple-300">
                #{i + 1} {d}
              </span>
            ))}
          </div>
          {/* Explanation */}
          <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
            {xai.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RESULTS TABLE ====================
function ResultsTable({ results }: { results: ProjectResult[] }) {
  const metrics = [
    { key: "npv", label: "NPV", fmt: (v: number) => `$${v.toLocaleString()}`, best: "max" },
    { key: "irr", label: "IRR", fmt: (v: number) => `${(v * 100).toFixed(1)}%`, best: "max" },
    { key: "mirr", label: "MIRR", fmt: (v: number) => `${(v * 100).toFixed(1)}%`, best: "max" },
    { key: "payback_period", label: "Окупаемость", fmt: (v: number) => `${v.toFixed(1)} лет`, best: "min" },
    { key: "profitability_index", label: "PI", fmt: (v: number) => v.toFixed(2), best: "max" },
    { key: "roi_pct", label: "ROI", fmt: (v: number) => `${v.toFixed(1)}%`, best: "max" },
    { key: "total_revenue", label: "Общая выручка", fmt: (v: number) => `$${v.toLocaleString()}`, best: "max" },
    { key: "total_profit", label: "Общая прибыль", fmt: (v: number) => `$${v.toLocaleString()}`, best: "max" },
  ];

  const getBest = (key: string, best: string) => {
    const vals = results.map((r: any) => r[key]);
    return best === "max" ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left text-gray-400 py-2 px-3 text-sm">Метрика</th>
            {results.map((r, i) => (
              <th key={i} className="text-center py-2 px-3" style={{ color: COLORS[i] }}>
                <span className="font-bold text-sm">{r.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const bestVal = getBest(m.key, m.best);
            return (
              <tr key={m.key} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="text-gray-400 py-2 px-3 text-sm">{m.label}</td>
                {results.map((r: any, i) => (
                  <td key={i} className={`text-center py-2 px-3 text-sm font-medium ${r[m.key] === bestVal ? "text-green-400 font-bold" : "text-white"}`}>
                    {m.fmt(r[m.key])}
                    {r[m.key] === bestVal && " 🏆"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== CASHFLOW CHART (text-based) ====================
function CashflowChart({ results }: { results: ProjectResult[] }) {
  if (!results.length) return null;
  const maxYears = Math.max(...results.map((r) => r.yearly_cashflows.length));

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <h3 className="text-white font-bold mb-3">📈 Денежные потоки по годам</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 py-1 px-2">Год</th>
              {results.map((r, i) => (
                <th key={i} className="text-right py-1 px-2" style={{ color: COLORS[i] }}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxYears }).map((_, y) => (
              <tr key={y} className="border-b border-gray-800/50">
                <td className="text-gray-500 py-1 px-2">{y === 0 ? "Инвест." : `Год ${y}`}</td>
                {results.map((r, i) => {
                  const val = r.yearly_cashflows[y] || 0;
                  return (
                    <td key={i} className={`text-right py-1 px-2 font-mono ${val >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function ComparePage() {
  const [projects, setProjects] = useState<Project[]>([
    { ...defaultProject(), name: "Проект A" },
    { ...defaultProject(), name: "Проект B" },
  ]);
  const [results, setResults] = useState<ProjectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"compare" | "benchmarks" | "xai">("compare");

  const addProject = () => {
    if (projects.length >= 5) return;
    const letter = String.fromCharCode(65 + projects.length);
    setProjects([...projects, { ...defaultProject(), name: `Проект ${letter}` }]);
  };

  const removeProject = (idx: number) => {
    if (projects.length <= 2) return;
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const updateProject = (idx: number, field: keyof Project, value: any) => {
    setProjects(projects.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const compare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/calculator/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projects }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResults(data.projects || []);
    } catch (e: any) {
      alert("Ошибка: " + e.message);
    }
    setLoading(false);
  };

  const fields: { key: keyof Project; label: string; type: string; step?: number }[] = [
    { key: "name", label: "Название", type: "text" },
    { key: "initial_investment", label: "Инвестиция ($)", type: "number" },
    { key: "revenue_year1", label: "Выручка Year 1 ($)", type: "number" },
    { key: "revenue_growth_rate", label: "Рост выручки (%)", type: "number", step: 0.01 },
    { key: "operating_margin", label: "Маржа (%)", type: "number", step: 0.01 },
    { key: "horizon_years", label: "Горизонт (лет)", type: "number" },
    { key: "discount_rate", label: "Ставка дисконт.", type: "number", step: 0.01 },
    { key: "tax_rate", label: "Налог (%)", type: "number", step: 0.01 },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">⚖️ Сравнение проектов & Бенчмарки</h1>
          <div className="flex gap-2">
            {(["compare", "benchmarks", "xai"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {tab === "compare" ? "📊 Сравнение" : tab === "benchmarks" ? "🏆 Бенчмарки" : "🧠 XAI"}
              </button>
            ))}
          </div>
        </div>

        {/* Benchmarks Bar */}
        <BenchmarkPanel />

        {activeTab === "compare" && (
          <>
            {/* Project Inputs */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-2 px-2 text-sm w-36">Параметр</th>
                    {projects.map((p, i) => (
                      <th key={i} className="text-center py-2 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                          <span className="text-sm font-bold" style={{ color: COLORS[i] }}>{p.name || `#${i + 1}`}</span>
                          {projects.length > 2 && (
                            <button onClick={() => removeProject(i)} className="text-gray-600 hover:text-red-400 text-xs ml-1">&times;</button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.key} className="border-b border-gray-800/50">
                      <td className="text-gray-400 text-sm py-1 px-2">{f.label}</td>
                      {projects.map((p, i) => (
                        <td key={i} className="py-1 px-2">
                          <input
                            type={f.type}
                            step={f.step}
                            value={p[f.key]}
                            onChange={(e) => updateProject(i, f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm text-center focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button onClick={compare} disabled={loading} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-40">
                {loading ? "⏳ Считаю..." : "📊 Сравнить проекты"}
              </button>
              {projects.length < 5 && (
                <button onClick={addProject} className="px-6 py-3 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-all">
                  + Проект
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 space-y-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-white font-bold mb-3">📋 Результаты сравнения</h3>
                  <ResultsTable results={results} />
                </div>
                <CashflowChart results={results} />
              </div>
            )}
          </>
        )}

        {activeTab === "benchmarks" && results.length > 0 && (
          <div className="mt-6">
            <IrrBenchmarkCompare irr={results[0].irr} currency={projects[0].currency} />
          </div>
        )}

        {activeTab === "xai" && projects.length > 0 && (
          <div className="mt-6">
            <XaiPanel project={projects[0]} />
          </div>
        )}
      </div>
    </div>
  );
}
