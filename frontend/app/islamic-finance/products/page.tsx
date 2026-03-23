"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<IslamicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

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

  const categories = ["", "debt", "equity", "lease", "service", "social"];

  return (
    <IslamicFinanceLayout
      title="Исламские продукты"
      titleIcon="💳"
      subtitle="Каталог финансовых инструментов: мурабаха, мушарака, иджара, сукук и др."
      tipText="Выберите категорию для фильтрации. Каждый продукт соответствует стандартам AAOIFI."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 160, background: "#f3f4f6", borderRadius: 16 }} />)}
          </div>
        ) : products.length === 0 ? (
          <p style={{ textAlign: "center", padding: 40, color: C.muted }}>Продукты не найдены</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {products.map(p => (
              <div key={p.id} style={{
                background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15, color: C.text, margin: 0 }}>{p.name_ru}</h3>
                    {p.name_ar && <p style={{ fontSize: 14, color: C.primary, margin: "2px 0", fontFamily: "serif" }}>{p.name_ar}</p>}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 8,
                    background: C.infoBg, color: C.primary,
                  }}>
                    {CATEGORY_LABELS[p.category] || p.category}
                  </span>
                </div>
                {p.description_ru && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, margin: 0 }}>{p.description_ru}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                  {p.aaoifi_ref && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: C.successBg, color: C.success, fontFamily: "monospace" }}>{p.aaoifi_ref}</span>}
                  {p.risk_level && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "#fef3c7", color: RISK_COLORS[p.risk_level] || C.muted }}>{p.risk_level}</span>}
                  <span style={{ fontSize: 10, color: C.muted }}>{p.product_type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </IslamicFinanceLayout>
  );
}
