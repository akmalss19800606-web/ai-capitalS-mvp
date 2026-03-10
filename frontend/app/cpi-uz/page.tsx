"use client";

import React, { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { cpiData } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, ReferenceLine,
} from "recharts";

const COLORS = ["#20808D", "#A84B2F", "#1B474D", "#944454", "#FFC553", "#848456"];

type TabKey = "overview" | "categories" | "trends" | "datasets";

export default function CpiPage() {
  const { t } = useLocale();
  const ct = (key: string) => (t.cpiPage as unknown)[key];

  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<unknown>(null);
  const [timeSeries, setTimeSeries] = useState<unknown[]>([]);
  const [datasets, setDatasets] = useState<unknown[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [ov, ts, ds] = await Promise.all([
        cpiData.overview().catch(() => null),
        cpiData.timeSeries({ indicator_code: "1", comparison_type: "month_over_month", limit: 60 }).catch(() => []),
        cpiData.datasets().catch(() => []),
      ]);
      setOverview(ov);
      setTimeSeries(ts);
      setDatasets(ds);
    } catch (e: unknown) {
      setError(e.message || "Error");
    }
    setLoading(false);
  }

  async function handleSyncAll() {
    setSyncing(true);
    try {
      await cpiData.syncAll();
      await loadData();
    } catch (e: unknown) {
      setError(e.message || "Sync error");
    }
    setSyncing(false);
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: ct("tabOverview"), icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
    { key: "categories", label: ct("tabCategories"), icon: "M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z" },
    { key: "trends", label: ct("tabTrends"), icon: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" },
    { key: "datasets", label: ct("tabDatasets"), icon: "M20 6H12l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #E8E8E8",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>{ct("title")}</h1>
          <p style={{ color: "#7A7974", fontSize: 14, margin: "4px 0 0" }}>{ct("subtitle")}</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: syncing ? "#ccc" : "#01696F", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
          {syncing ? ct("syncing") : ct("syncBtn")}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FFF3F0", color: "#A13544", padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F5F5F5", borderRadius: 10, padding: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#01696F" : "#7A7974",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={t.icon}/></svg>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#7A7974" }}>{ct("loading")}</div>
      ) : (
        <>
          {tab === "overview" && <CpiOverviewTab overview={overview} timeSeries={timeSeries} ct={ct} cardStyle={cardStyle} />}
          {tab === "categories" && <CategoriesTab overview={overview} ct={ct} cardStyle={cardStyle} />}
          {tab === "trends" && <TrendsTab timeSeries={timeSeries} ct={ct} cardStyle={cardStyle} />}
          {tab === "datasets" && <DatasetsTab datasets={datasets} ct={ct} cardStyle={cardStyle} onSync={handleSyncAll} />}
        </>
      )}
    </div>
  );
}

/* ─── Tab: Overview ─── */
function CpiOverviewTab({ overview, timeSeries, ct, cardStyle }: unknown) {
  const kpiStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: "center" as const,
    flex: 1,
    minWidth: 160,
  };

  const formatCpi = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    const sign = val > 100 ? "+" : "";
    return `${sign}${(val - 100).toFixed(1)}%`;
  };

  const cpiColor = (val: number | null) => {
    if (!val) return "#555";
    if (val > 101) return "#A13544";
    if (val > 100.5) return "#964219";
    return "#437A22";
  };

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{ct("headlineCpi")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cpiColor(overview?.headline_cpi) }}>
            {formatCpi(overview?.headline_cpi)}
          </div>
          <div style={{ fontSize: 11, color: "#BAB9B4" }}>{overview?.headline_period || "—"}</div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{ct("foodCpi")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cpiColor(overview?.food_cpi) }}>
            {formatCpi(overview?.food_cpi)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{ct("nonFoodCpi")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cpiColor(overview?.non_food_cpi) }}>
            {formatCpi(overview?.non_food_cpi)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{ct("servicesCpi")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cpiColor(overview?.services_cpi) }}>
            {formatCpi(overview?.services_cpi)}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{ct("annualInflation")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#A84B2F" }}>
            {overview?.annual_inflation ? `${(overview.annual_inflation - 100).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Chart */}
      {timeSeries.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{ct("cpiDynamics")}</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const parts = v.split("-");
                  return parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : v;
                }}
              />
              <YAxis domain={[98, 104]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, ct("indexValue")]} />
              <ReferenceLine y={100} stroke="#ccc" strokeDasharray="5 5" label={{ value: "100%", position: "right", fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="#20808D" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {timeSeries.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#7A7974" }}>
          <p>{ct("noData")}</p>
          <p style={{ fontSize: 13 }}>{ct("syncHint")}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Categories ─── */
function CategoriesTab({ overview, ct, cardStyle }: unknown) {
  const categories = overview?.categories || [];

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{ct("categoryBreakdown")}</h3>

        {categories.length > 0 ? (
          <>
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={categories.slice(0, 15).map((c: unknown) => ({
                  name: (c.category_ru || "").slice(0, 20),
                  value: c.latest_value ? c.latest_value - 100 : 0,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
                <YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, ct("change")]} />
                <ReferenceLine x={0} stroke="#999" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categories.slice(0, 15).map((_: unknown, i: number) => (
                    <Cell key={i} fill={categories[i]?.latest_value > 100 ? "#A84B2F" : "#20808D"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E8E8E8" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colCategory")}</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{ct("colValue")}</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{ct("colPrevious")}</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{ct("colChange")}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c: unknown, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F0F0F0" }}>
                    <td style={{ padding: "10px 12px", fontSize: 14 }}>{c.category_ru}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 500 }}>
                      {c.latest_value?.toFixed(1) || "—"}%
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, color: "#7A7974" }}>
                      {c.previous_value?.toFixed(1) || "—"}%
                    </td>
                    <td style={{
                      padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 600,
                      color: (c.change || 0) > 0 ? "#A13544" : (c.change || 0) < 0 ? "#437A22" : "#555",
                    }}>
                      {c.change !== null && c.change !== undefined ? `${c.change > 0 ? "+" : ""}${c.change.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#7A7974" }}>{ct("noData")}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Trends ─── */
function TrendsTab({ timeSeries, ct, cardStyle }: unknown) {
  // Calculate rolling average
  const dataWithMA = timeSeries.map((p: unknown, i: number) => {
    const window = timeSeries.slice(Math.max(0, i - 11), i + 1);
    const avg = window.reduce((s: number, x: unknown) => s + (x.value || 0), 0) / window.length;
    return { ...p, ma12: parseFloat(avg.toFixed(2)) };
  });

  return (
    <div>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{ct("trendAnalysis")}</h3>
        {dataWithMA.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dataWithMA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const parts = v.split("-");
                  return parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : v;
                }}
              />
              <YAxis domain={[98, 104]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number, name: string) => [`${v}%`, name === "ma12" ? ct("movingAvg12") : ct("indexValue")]} />
              <Legend formatter={(v) => v === "ma12" ? ct("movingAvg12") : ct("monthly")} />
              <ReferenceLine y={100} stroke="#ccc" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="value" stroke="#20808D" strokeWidth={2} dot={{ r: 1 }} name="value" />
              <Line type="monotone" dataKey="ma12" stroke="#A84B2F" strokeWidth={2} strokeDasharray="5 5" dot={false} name="ma12" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#7A7974" }}>{ct("noData")}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Datasets ─── */
function DatasetsTab({ datasets, ct, cardStyle, onSync }: unknown) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{ct("availableDatasets")}</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {datasets.map((ds: unknown, i: number) => (
          <div key={i} style={{
            padding: 16, borderRadius: 8, border: "1px solid #E8E8E8",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{ds.description_ru}</div>
              <div style={{ fontSize: 12, color: "#7A7974" }}>
                ID: {ds.id} | {ct("compType")}: {ds.comparison_type}
              </div>
              <div style={{ fontSize: 11, color: "#BAB9B4", marginTop: 2, wordBreak: "break-all" }}>{ds.url}</div>
            </div>
            <div style={{
              padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 500,
              background: "#E8F5E9", color: "#2E7D32",
            }}>
              SDMX
            </div>
          </div>
        ))}
      </div>
      {datasets.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "#7A7974" }}>{ct("noData")}</div>
      )}
    </div>
  );
}
