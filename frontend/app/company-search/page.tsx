"use client";

import React, { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { companyLookup } from "@/lib/api";

export default function CompanySearchPage() {
  const { t } = useLocale();
  const ct = (key: string) => (t.companyPage as any)[key];

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [tab, setTab] = useState<"search" | "catalog">("search");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog(search?: string) {
    try {
      const data = await companyLookup.list({ search, limit: 50 });
      setCompanies(data.items || []);
      setTotal(data.total || 0);
    } catch { /* empty */ }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResult(null);
    try {
      const res = await companyLookup.search(query.trim());
      setResult(res);
      if (res.found) {
        loadCatalog(); // Refresh catalog
      }
    } catch (e: any) {
      setError(e.message || "Error");
    }
    setSearching(false);
  }

  async function handleInit() {
    try {
      await companyLookup.init();
      await loadCatalog();
    } catch (e: any) {
      setError(e.message || "Init error");
    }
  }

  async function handleListSearch() {
    await loadCatalog(listSearch || undefined);
  }

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #E8E8E8",
  };

  const tabs = [
    { key: "search" as const, label: ct("tabSearch"), icon: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" },
    { key: "catalog" as const, label: ct("tabCatalog"), icon: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>{ct("title")}</h1>
          <p style={{ color: "#7A7974", fontSize: 14, margin: "4px 0 0" }}>{ct("subtitle")}</p>
        </div>
        <button
          onClick={handleInit}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "#01696F", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          {ct("initCatalog")}
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

      {tab === "search" && (
        <div>
          {/* Search box */}
          <div style={{ ...cardStyle, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{ct("searchTitle")}</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={ct("searchPlaceholder")}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 8,
                  border: "1px solid #E0E0E0", fontSize: 15, outline: "none",
                }}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{
                  padding: "12px 28px", borderRadius: 8, border: "none",
                  background: searching ? "#ccc" : "#01696F", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: searching ? "not-allowed" : "pointer",
                  minWidth: 140,
                }}
              >
                {searching ? ct("searching") : ct("searchBtn")}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#BAB9B4", marginTop: 8 }}>{ct("searchHint")}</div>
          </div>

          {/* Result */}
          {result && (
            <div style={cardStyle}>
              {result.found && result.company ? (
                <CompanyCard company={result.company} source={result.source} ct={ct} />
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="#D4D1CA" style={{ marginBottom: 12 }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <p style={{ fontSize: 16, color: "#A13544", fontWeight: 500 }}>{result.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "catalog" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <input
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleListSearch()}
              placeholder={ct("catalogSearch")}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 8,
                border: "1px solid #E0E0E0", fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={handleListSearch}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "1px solid #01696F",
                background: "#fff", color: "#01696F",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              {ct("filterBtn")}
            </button>
          </div>

          <div style={{ fontSize: 13, color: "#7A7974", marginBottom: 12 }}>
            {ct("totalFound")}: {total}
          </div>

          <div style={cardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #E8E8E8" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colInn")}</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colName")}</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colDirector")}</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colRegion")}</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colOked")}</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#7A7974" }}>{ct("colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #F0F0F0", cursor: "pointer" }}
                      onClick={() => { setQuery(c.inn); setTab("search"); setResult({ found: true, source: `cache (${c.source})`, company: c }); }}
                    >
                      <td style={{ padding: "10px", fontSize: 13, fontFamily: "monospace", color: "#01696F", fontWeight: 600 }}>{c.inn}</td>
                      <td style={{ padding: "10px", fontSize: 14, fontWeight: 500 }}>{c.short_name || c.name}</td>
                      <td style={{ padding: "10px", fontSize: 13, color: "#555" }}>{c.director || "—"}</td>
                      <td style={{ padding: "10px", fontSize: 13, color: "#555" }}>{c.region || "—"}</td>
                      <td style={{ padding: "10px", fontSize: 12, color: "#7A7974" }}>{c.oked_name ? (c.oked_name.length > 25 ? c.oked_name.slice(0, 25) + "..." : c.oked_name) : "—"}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{
                          padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                          background: c.status === "Действующая" ? "#E8F5E9" : "#FFEBEE",
                          color: c.status === "Действующая" ? "#2E7D32" : "#C62828",
                        }}>{c.status || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {companies.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "#7A7974" }}>
                  {ct("noCatalog")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Company Card ─── */
function CompanyCard({ company, source, ct }: { company: any; source: string; ct: (k: string) => string }) {
  const fields = [
    { label: ct("fieldInn"), value: company.inn, mono: true },
    { label: ct("fieldName"), value: company.name },
    { label: ct("fieldShortName"), value: company.short_name },
    { label: ct("fieldOpf"), value: company.opf },
    { label: ct("fieldStatus"), value: company.status, badge: true },
    { label: ct("fieldDirector"), value: company.director },
    { label: ct("fieldAddress"), value: company.address },
    { label: ct("fieldRegion"), value: company.region },
    { label: ct("fieldOked"), value: company.oked ? `${company.oked} — ${company.oked_name || ""}` : null },
    { label: ct("fieldRegDate"), value: company.registration_date },
    { label: ct("fieldNds"), value: company.nds_status },
    { label: ct("fieldCapital"), value: company.authorized_capital ? `${company.authorized_capital.toLocaleString()} UZS` : null },
    { label: ct("fieldBank"), value: company.bank_name },
    { label: ct("fieldMfo"), value: company.bank_mfo },
    { label: ct("fieldAccount"), value: company.bank_account },
    { label: ct("fieldPhone"), value: company.phone },
    { label: ct("fieldEmail"), value: company.email },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", margin: 0 }}>
          {company.short_name || company.name}
        </h3>
        <span style={{ fontSize: 12, color: "#7A7974", background: "#F5F5F5", padding: "4px 12px", borderRadius: 12 }}>
          {ct("source")}: {source}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
        {fields.map((f, i) => {
          if (!f.value) return null;
          return (
            <div key={i} style={{ borderBottom: "1px solid #F5F5F5", paddingBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#BAB9B4", marginBottom: 2 }}>{f.label}</div>
              {f.badge ? (
                <span style={{
                  padding: "2px 10px", borderRadius: 12, fontSize: 13, fontWeight: 500,
                  background: f.value === "Действующая" ? "#E8F5E9" : "#FFEBEE",
                  color: f.value === "Действующая" ? "#2E7D32" : "#C62828",
                }}>{f.value}</span>
              ) : f.mono ? (
                <div style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 600, color: "#01696F" }}>{f.value}</div>
              ) : (
                <div style={{ fontSize: 14, color: "#1A1A2E" }}>{f.value}</div>
              )}
            </div>
          );
        })}
      </div>

      {company.source_url && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #E8E8E8" }}>
          <a href={company.source_url} target="_blank" rel="noopener noreferrer"
            style={{ color: "#01696F", fontSize: 13, textDecoration: "none" }}>
            {ct("viewSource")} →
          </a>
        </div>
      )}
    </div>
  );
}
