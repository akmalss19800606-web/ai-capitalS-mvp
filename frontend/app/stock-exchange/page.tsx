"use client";

import React, { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { stockExchange } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#20808D", "#A84B2F", "#1B474D", "#BCE2E7", "#944454", "#FFC553", "#848456", "#6E522B"];

type TabKey = "overview" | "issuers" | "trades" | "charts";

export default function StockExchangePage() {
  const { t } = useLocale();
  const st = (key: string) => (t.stockPage as any)[key];

  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<any>(null);
  const [issuers, setIssuers] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
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
      const [ov, iss, tr] = await Promise.all([
        stockExchange.overview().catch(() => null),
        stockExchange.issuers().catch(() => []),
        stockExchange.trades({ limit: 50 }).catch(() => []),
      ]);
      setOverview(ov);
      setIssuers(iss);
      setTrades(tr);
    } catch (e: any) {
      setError(e.message || "Error");
    }
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await stockExchange.initCatalog();
      await stockExchange.sync();
      await loadData();
    } catch (e: any) {
      setError(e.message || "Sync error");
    }
    setSyncing(false);
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: st("tabOverview"), icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
    { key: "issuers", label: st("tabIssuers"), icon: "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" },
    { key: "trades", label: st("tabTrades"), icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" },
    { key: "charts", label: st("tabCharts"), icon: "M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #E8E8E8",
  };

  const kpiStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: "center" as const,
    flex: 1,
    minWidth: 180,
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
            {st("title")}
          </h1>
          <p style={{ color: "#7A7974", fontSize: 14, margin: "4px 0 0" }}>
            {st("subtitle")}
          </p>
        </div>
        <button
          onClick={handleSync}
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
          {syncing ? st("syncing") : st("syncBtn")}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FFF3F0", color: "#A13544", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F5F5F5", borderRadius: 10, padding: 4 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
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
        <div style={{ textAlign: "center", padding: 60, color: "#7A7974" }}>{st("loading")}</div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab overview={overview} st={st} kpiStyle={kpiStyle} cardStyle={cardStyle} />}
          {tab === "issuers" && <IssuersTab issuers={issuers} st={st} cardStyle={cardStyle} />}
          {tab === "trades" && <TradesTab trades={trades} st={st} cardStyle={cardStyle} />}
          {tab === "charts" && <ChartsTab overview={overview} issuers={issuers} st={st} cardStyle={cardStyle} />}
        </>
      )}
    </div>
  );
}

/* ─── Tab: Overview ─── */
function OverviewTab({ overview, st, kpiStyle, cardStyle }: any) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{st("totalTrades")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A2E" }}>
            {overview?.total_trades_today?.toLocaleString() || "0"}
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{st("totalVolume")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#01696F" }}>
            {overview?.total_volume_uzs_today ? `${(overview.total_volume_uzs_today / 1e6).toFixed(1)} M` : "0"} UZS
          </div>
        </div>
        <div style={kpiStyle}>
          <div style={{ fontSize: 12, color: "#7A7974", marginBottom: 4 }}>{st("activeIssuers")}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1A2E" }}>
            {overview?.active_issuers || "0"}
          </div>
        </div>
      </div>

      {/* Most Traded */}
      {overview?.most_traded?.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{st("mostTraded")}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E8E8E8" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colIssuer")}</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{st("colVolume")}</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{st("colTrades")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.most_traded.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <td style={{ padding: "10px 12px", fontSize: 14 }}>
                    <div style={{ fontWeight: 600, color: "#1A1A2E" }}>{item.name || item.code}</div>
                    <div style={{ fontSize: 11, color: "#7A7974" }}>{item.code}</div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14, fontWeight: 500 }}>
                    {item.volume?.toLocaleString()} UZS
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 14 }}>
                    {item.trades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!overview?.most_traded?.length && (
        <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#7A7974" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#D4D1CA" style={{ marginBottom: 12 }}>
            <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
          </svg>
          <p>{st("noData")}</p>
          <p style={{ fontSize: 13 }}>{st("syncHint")}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Issuers ─── */
function IssuersTab({ issuers, st, cardStyle }: any) {
  const [filter, setFilter] = useState("");

  const filtered = issuers.filter((iss: any) =>
    (iss.name_ru || "").toLowerCase().includes(filter.toLowerCase()) ||
    (iss.code || "").toLowerCase().includes(filter.toLowerCase()) ||
    (iss.sector || "").toLowerCase().includes(filter.toLowerCase())
  );

  // Группировка по секторам
  const sectors: Record<string, number> = {};
  issuers.forEach((iss: any) => {
    const s = iss.sector || "Другое";
    sectors[s] = (sectors[s] || 0) + 1;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(sectors).map(([name, count]) => (
          <div key={name} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13,
            background: filter === name ? "#01696F" : "#F0F0F0",
            color: filter === name ? "#fff" : "#555",
            cursor: "pointer", fontWeight: 500,
          }} onClick={() => setFilter(filter === name ? "" : name)}>
            {name} ({count})
          </div>
        ))}
      </div>

      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder={st("searchPlaceholder")}
        style={{
          width: "100%", padding: "10px 16px", borderRadius: 8,
          border: "1px solid #E0E0E0", fontSize: 14, marginBottom: 16,
          outline: "none",
        }}
      />

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E8E8E8" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colCode")}</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colIssuer")}</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colType")}</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colMarket")}</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colSector")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((iss: any) => (
              <tr key={iss.id} style={{ borderBottom: "1px solid #F0F0F0" }}>
                <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "monospace", color: "#555" }}>
                  {iss.code?.slice(0, 16)}...
                </td>
                <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500 }}>{iss.name_ru || iss.name_uz}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{iss.security_type}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: iss.market === "STK" ? "#E8F5E9" : "#E3F2FD",
                    color: iss.market === "STK" ? "#2E7D32" : "#1565C0",
                  }}>{iss.market}</span>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "#555" }}>{iss.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "#7A7974" }}>{st("noIssuers")}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Trades ─── */
function TradesTab({ trades, st, cardStyle }: any) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{st("recentTrades")}</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #E8E8E8" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colTime")}</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colIssuer")}</th>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{st("colType")}</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{st("colPrice")}</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{st("colQty")}</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, color: "#7A7974" }}>{st("colVolume")}</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((tr: any, i: number) => (
              <tr key={i} style={{ borderBottom: "1px solid #F0F0F0" }}>
                <td style={{ padding: "8px 10px", fontSize: 13, color: "#555" }}>
                  {tr.trade_time ? new Date(tr.trade_time).toLocaleString("ru-RU") : tr.trade_date}
                </td>
                <td style={{ padding: "8px 10px", fontSize: 14, fontWeight: 500 }}>
                  {tr.issuer_name || tr.issuer_code}
                </td>
                <td style={{ padding: "8px 10px", fontSize: 13 }}>{tr.security_type}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 14, fontWeight: 500 }}>
                  {tr.trade_price?.toLocaleString()} UZS
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 14 }}>
                  {tr.quantity?.toLocaleString()}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 14, fontWeight: 500, color: "#01696F" }}>
                  {tr.volume_uzs?.toLocaleString()} UZS
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "#7A7974" }}>{st("noTrades")}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Charts ─── */
function ChartsTab({ overview, issuers, st, cardStyle }: any) {
  // Данные для pie chart — распределение по секторам
  const sectors: Record<string, number> = {};
  (issuers || []).forEach((iss: any) => {
    const s = iss.sector || "Другое";
    sectors[s] = (sectors[s] || 0) + 1;
  });
  const pieData = Object.entries(sectors).map(([name, value]) => ({ name, value }));

  // Данные для bar chart — объёмы торгов топ эмитентов
  const barData = (overview?.most_traded || []).map((item: any) => ({
    name: (item.name || item.code || "").slice(0, 15),
    volume: item.volume || 0,
    trades: item.trades || 0,
  }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{st("sectorDistribution")}</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#7A7974" }}>{st("noData")}</div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{st("volumeByIssuer")}</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString() + " UZS"} />
              <Bar dataKey="volume" fill="#20808D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#7A7974" }}>{st("noData")}</div>
        )}
      </div>
    </div>
  );
}
