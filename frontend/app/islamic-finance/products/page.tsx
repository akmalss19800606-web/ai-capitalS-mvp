"use client";
import { useEffect, useState, useMemo } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface Product {
  id: string;
  slug: string;
  name_ru: string;
  name_ar?: string;
  transliteration?: string;
  product_type?: string;
  category: string;
  allowed_for?: string;
  aaoifi_standard_code?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORY_LABELS: Record<string, string> = {
  debt: "Долговые", equity: "Долевые", lease: "Аренда",
  service: "Услуги", social: "Социальные",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API}/api/v1/islamic/products?${params}`, { headers })
      .then(r => r.json())
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
      (p.transliteration && p.transliteration.toLowerCase().includes(q))
    );
  }, [products, search]);

  const categories = ["", "debt", "equity", "lease", "service", "social"];

  return (
    <IslamicFinanceLayout title="Исламские финансовые продукты" subtitle="Каталог продуктов по стандартам AAOIFI">
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <input
          type="text"
          placeholder="🔍 Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{width:"100%",padding:"10px 12px",borderRadius:12,border:`1px solid ${C.border}`,fontSize:14,background:C.card}}
        />
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {categories.map(cat => (
            <button key={cat} onClick={() => {setCategory(cat);setLoading(true);}}
              style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:500,
                border:`1px solid ${category===cat?C.primary:C.border}`,
                background:category===cat?C.primary:C.card,
                color:category===cat?"#fff":C.text,cursor:"pointer"}}>
              {cat===""?"Все":CATEGORY_LABELS[cat]||cat}
            </button>
          ))}
        </div>
        <div style={{fontSize:13,color:C.muted}}>Найдено: {filtered.length}</div>
        {loading ? (
          <div style={{textAlign:"center",padding:40,color:C.muted}}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:40,color:C.muted}}>Продукты не найдены</div>
        ) : (
          <div style={{display:"grid",gap:16}}>
            {filtered.map(p => {
              const isExp = expandedId === p.id;
              return (
                <div key={p.id} onClick={() => setExpandedId(isExp?null:p.id)}
                  style={{background:C.card,borderRadius:16,
                    border:`1px solid ${isExp?C.primary:C.border}`,
                    padding:20,display:"flex",flexDirection:"column",gap:8,
                    cursor:"pointer",transition:"all 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <h3 style={{margin:0,fontSize:16,fontWeight:600,color:C.text}}>{p.name_ru}</h3>
                      {p.name_ar && <div style={{fontSize:14,color:C.muted,direction:"rtl"}}>{p.name_ar}</div>}
                      {p.transliteration && <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>{p.transliteration}</div>}
                    </div>
                    <span style={{fontSize:11,padding:"3px 10px",borderRadius:12,
                      background:`${C.primary}15`,color:C.primary,fontWeight:500}}>
                      {CATEGORY_LABELS[p.category]||p.category}
                    </span>
                  </div>
                  {isExp && (
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,display:"flex",flexDirection:"column",gap:6}}>
                      {p.product_type && <div style={{fontSize:13}}><strong>Тип:</strong> {p.product_type}</div>}
                      {p.allowed_for && <div style={{fontSize:13}}><strong>Доступно для:</strong> {p.allowed_for === "both" ? "Всех" : p.allowed_for}</div>}
                      {p.aaoifi_standard_code && <div style={{fontSize:13}}><strong>AAOIFI:</strong> {p.aaoifi_standard_code}</div>}
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,color:C.primary,fontWeight:500}}>
                      {isExp?"▲ Свернуть":"▼ Подробнее"}
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
