"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";

const TYPE_LABELS: Record<string, string> = {
  murabaha: "Мурабаха",
  ijara: "Иджара",
  mudaraba: "Мудараба",
  musharaka: "Мушарака",
  sukuk: "Сукук",
  takaful: "Такафул",
  qard: "Кард аль-хасан",
};

const TYPE_COLORS: Record<string, string> = {
  murabaha: "#3b82f6",
  ijara: "#8b5cf6",
  mudaraba: "#10b981",
  musharaka: "#f59e0b",
  sukuk: "#ef4444",
  takaful: "#06b6d4",
  qard: "#6b7280",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!productId) return;
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await islamicApi.getProduct(productId);
      setProduct(data);
    } catch (e: any) {
      setError(e.message || "Ошибка загрузки продукта");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IslamicFinanceLayout title="Исламский финансовый продукт" titleIcon="💰">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>
          ← Назад
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Детали продукта</h2>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}><div style={{ fontSize: 32 }}>⏳</div><p>Загрузка...</p></div>}

      {error && (
        <div style={{ padding: 16, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 10, color: C.error, marginBottom: 20 }}>
          ❌ {error} <button onClick={loadProduct} style={{ marginLeft: 12, padding: "4px 12px", background: C.error, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Повторить</button>
        </div>
      )}

      {product && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>{product.name}</h3>
                {product.name_ar && <p style={{ margin: "4px 0 0", fontSize: 16, color: C.muted, fontFamily: "serif" }}>{product.name_ar}</p>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.type && (
                  <span style={{ padding: "6px 14px", background: TYPE_COLORS[product.type] || C.primary, color: "#fff", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {TYPE_LABELS[product.type] || product.type}
                  </span>
                )}
                {product.is_halal !== undefined && (
                  <span style={{ padding: "6px 14px", background: product.is_halal ? C.successBg : C.errorBg, color: product.is_halal ? C.success : C.error, borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1px solid ${product.is_halal ? C.success : C.error}` }}>
                    {product.is_halal ? "✓ Халяльный" : "✗ Не халяльный"}
                  </span>
                )}
              </div>
            </div>
            {product.description && <p style={{ margin: "16px 0 0", color: C.text, lineHeight: 1.7, fontSize: 15 }}>{product.description}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Мин. сумма", value: product.min_amount ? `${Number(product.min_amount).toLocaleString()} UZS` : null },
              { label: "Макс. сумма", value: product.max_amount ? `${Number(product.max_amount).toLocaleString()} UZS` : null },
              { label: "Прибыльность", value: product.profit_rate ? `${product.profit_rate}%` : null },
              { label: "Срок", value: product.term ? `${product.term} мес.` : null },
              { label: "Стандарт", value: product.standard || null },
              { label: "Организация", value: product.organization || null },
            ].filter(i => i.value).map((item, idx) => (
              <div key={idx} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700, color: C.text }}>{item.value}</p>
              </div>
            ))}
          </div>

          {product.conditions && product.conditions.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: C.text }}>📋 Условия</h4>
              <ul style={{ margin: 0, padding: "0 0 0 20px", display: "grid", gap: 8 }}>
                {product.conditions.map((c: string, i: number) => (
                  <li key={i} style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {product.shariah_basis && (
            <div style={{ background: C.infoBg, border: `1px solid ${C.primary}`, borderRadius: 12, padding: 18 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.primary }}>📖 Шариатская основа</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{product.shariah_basis}</p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => router.push("/islamic-finance/products")} style={{ padding: "10px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              💰 Все продукты
            </button>
            <button onClick={() => router.push("/islamic-finance/screening")} style={{ padding: "10px 20px", background: "transparent", color: C.primary, border: `1px solid ${C.primary}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              🔍 Скрининг компании
            </button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
