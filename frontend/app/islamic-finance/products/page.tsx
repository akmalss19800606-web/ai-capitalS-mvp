"use client";
import { useEffect, useState, useMemo } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import CurrencyDisplay from "@/components/islamic/CurrencyDisplay";

interface IslamicProduct {
  id: string;
  slug: string;
  name_ru: string;
  name_ar?: string;
  transliteration?: string;
  product_type: string;
  category: string;
  description_ru?: string;
  risk_level?: string;
  aaoifi_ref?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  debt: "Долговые", equity: "Долевые", lease: "Аренда",
  service: "Услуги", social: "Социальные",
};

const RISK_COLORS: Record<string, string> = {
  low: C.success, medium: "#f59e0b", high: C.error,
};

const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<IslamicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`/api/v1/islamic/products${category ? `?category=${category}` : ""}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name_ru.toLowerCase().includes(q) ||
      (p.name_ar && p.name_ar.includes(q)) ||
      (p.transliteration && p.transliteration.toLowerCase().includes(q)) ||
      (p.description_ru && p.description_ru.toLowerCase().includes(q))
    );
  }, [products, search]);

  const categories = ["", "debt", "equity", "lease", "service", "social"];

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
    background: C.card, outline: "none", boxSizing: "border-box",
  };

  return (
    <IslamicFinanceLayout
      title="Исламские продукты"
      titleIcon="💳"
      subtitle="Каталог финансовых инструментов: мурабаха, мушарака, иджара, сукук и др."
      tipText="Выберите категорию или введите название для поиска. Нажмите на карточку для подробностей. Каждый продукт соответствует стандартам AAOIFI."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Поиск по названию, описанию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inputStyle}
        />

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setLoading(true); }}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: `1px solid ${category === cat ? C.primary : C.border}`,
                background: category === cat ? C.primary : C.card,
                color: category === cat ? "#fff" : C.text,
                cursor: "pointer",
              }}
            >
              {cat === "" ? "Все" : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>
            Найдено: {filtered.length}
          </span>
        </div>

        {/* Risk legend */}
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.muted }}>
          <span>Уровень риска:</span>
          {Object.entries(RISK_LABELS).map(([key, label]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: RISK_COLORS[key] }} />
              {label}
            </span>
          ))}
        </div>

        {/* Products grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 160, background: "#f3f4f6", borderRadius: 16, animation: "pulse 1.5s infinite" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: 40, color: C.muted }}>Продукты не найдены</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map(p => {
              const isExpanded = expandedId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  style={{
                    background: C.card, borderRadius: 16,
                    border: `1px solid ${isExpanded ? C.primary : C.border}`,
                    padding: 20, boxShadow: isExpanded ? `0 0 0 2px ${C.primary}20` : "0 1px 3px rgba(0,0,0,0.06)",
                    display: "flex", flexDirection: "column", gap: 8,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: 15, color: C.text, margin: 0 }}>{p.name_ru}</h3>
                      {p.name_ar && <p style={{ fontSize: 14, color: C.primary, margin: "2px 0", fontFamily: "serif" }}>{p.name_ar}</p>}
                      {p.transliteration && <p style={{ fontSize: 11, color: C.muted, margin: 0, fontStyle: "italic" }}>{p.transliteration}</p>}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 8,
                      background: C.infoBg, color: C.primary,
                    }}>
                      {CATEGORY_LABELS[p.category] || p.category}
                    </span>
                  </div>

                  {/* Collapsed: short description */}
                  {!isExpanded && p.description_ru && (
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {p.description_ru}
                    </p>
                  )}

                  {/* Expanded: full details */}
                  {isExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                      {p.description_ru && (
                        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>
                          {p.description_ru}
                        </p>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                        <div style={{ padding: 8, background: C.bg, borderRadius: 8 }}>
                          <span style={{ color: C.muted }}>Тип: </span>
                          <span style={{ color: C.text, fontWeight: 500 }}>{p.product_type}</span>
                        </div>
                        <div style={{ padding: 8, background: C.bg, borderRadius: 8 }}>
                          <span style={{ color: C.muted }}>Категория: </span>
                          <span style={{ color: C.text, fontWeight: 500 }}>{CATEGORY_LABELS[p.category] || p.category}</span>
                        </div>
                        {p.risk_level && (
                          <div style={{ padding: 8, background: C.bg, borderRadius: 8 }}>
                            <span style={{ color: C.muted }}>Риск: </span>
                            <span style={{ color: RISK_COLORS[p.risk_level] || C.muted, fontWeight: 600 }}>
                              {RISK_LABELS[p.risk_level] || p.risk_level}
                            </span>
                          </div>
                        )}
                        {p.aaoifi_ref && (
                          <div style={{ padding: 8, background: C.bg, borderRadius: 8 }}>
                            <span style={{ color: C.muted }}>AAOIFI: </span>
                            <span style={{ color: C.success, fontWeight: 500, fontFamily: "monospace" }}>{p.aaoifi_ref}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags row */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                    {p.aaoifi_ref && !isExpanded && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: C.successBg, color: C.success, fontFamily: "monospace" }}>{p.aaoifi_ref}</span>}
                    {p.risk_level && (
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 6,
                        background: "#fef3c7", color: RISK_COLORS[p.risk_level] || C.muted,
                        fontWeight: 500,
                      }}>
                        {RISK_LABELS[p.risk_level] || p.risk_level}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: C.muted }}>{p.product_type}</span>
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>
                      {isExpanded ? "▲ Свернуть" : "▼ Подробнее"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
