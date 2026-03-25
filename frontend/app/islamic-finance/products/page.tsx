"use client";
import { useEffect, useState, useMemo } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface Product {
  id: number;
  product_id: string;
  name: string;
  name_ar?: string;
  category: string;
  description?: string;
  shariah_basis?: string;
  risk_level?: string;
  data_json?: Record<string, any>;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORY_LABELS: Record<string, string> = {
  debt: "Долговые", equity: "Долевые", lease: "Аренда",
  service: "Услуги", social: "Социальные",
};

const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий",
};

const RISK_COLORS: Record<string, string> = {
  low: C.success, medium: "#f59e0b", high: C.error,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    fetch(`${API}/api/v1/islamic/products?${params}`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.name_ar && p.name_ar.includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, search]);

  const categories = ["", "debt", "equity", "lease", "service", "social"];

  return (
    <IslamicFinanceLayout title="Исламские финансовые продукты" subtitle="Каталог продуктов соответствующих шариату">
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <input type="text" placeholder="🔍 Поиск..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{width:"100%",padding:"10px 12px",borderRadius:12,border:`1px solid ${C.border}`,fontSize:14,background:C.card}} />
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
            {filtered.map(p => {
              const isExp = expandedId === p.id;
              const dj = p.data_json || {};
              return (
                <div key={p.id} onClick={() => setExpandedId(isExp?null:p.id)}
                  style={{background:C.card,borderRadius:16,
                    border:`1px solid ${isExp?C.primary:C.border}`,
                    padding:20,display:"flex",flexDirection:"column",gap:8,
                    cursor:"pointer",transition:"all 0.2s"}}>
                  <h3 style={{margin:0,fontSize:16}}>{p.name}</h3>
                  {p.name_ar && <div style={{fontSize:13,color:C.muted,direction:"rtl"}}>{p.name_ar}</div>}
                  {dj.transliteration && <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>{dj.transliteration}</div>}
                  <span style={{alignSelf:"flex-start",padding:"2px 10px",borderRadius:12,fontSize:11,
                    background:`${C.primary}15`,color:C.primary}}>
                    {CATEGORY_LABELS[p.category]||p.category}
                  </span>
                  {!isExp && p.description && (
                    <div style={{fontSize:13,color:C.muted,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.description}</div>
                  )}
                  {isExp && (
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                      {p.description && <div style={{fontSize:13,lineHeight:1.5}}>{p.description}</div>}
                      <div style={{fontSize:12,color:C.muted}}>
                        <b>Категория:</b> {CATEGORY_LABELS[p.category]||p.category}
                      </div>
                      {p.risk_level && (
                        <div style={{fontSize:12}}>
                          <b>Риск:</b>{" "}
                          <span style={{color:RISK_COLORS[p.risk_level]||C.text}}>
                            {RISK_LABELS[p.risk_level]||p.risk_level}
                          </span>
                        </div>
                      )}
                      {p.shariah_basis && (
                        <div style={{fontSize:12,color:C.muted}}>
                          <b>AAOIFI:</b> {p.shariah_basis}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                    {p.risk_level && (
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:8,
                        background:`${RISK_COLORS[p.risk_level]||C.border}20`,
                        color:RISK_COLORS[p.risk_level]||C.text}}>
                        {RISK_LABELS[p.risk_level]||p.risk_level}
                      </span>
                    )}
                    <span style={{fontSize:11,color:C.muted}}>
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
