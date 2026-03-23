"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi } from "@/components/islamic/api";

interface ZakatRecord {
  id: string;
  type: string;
  amount: number;
  zakat_due: number;
  nisab_value: number;
  calculated_at: string;
  status: string;
}

export default function ZakatHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ZakatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await islamicApi.getZakatHistory();
      setRecords(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === "all" ? records : records.filter(r => r.type === filter);
  const totalDue = filtered.reduce((s, r) => s + (r.zakat_due || 0), 0);

  const exportCSV = () => {
    const header = "Дата,Тип,Сумма активов,Закят к выплате,Нисаб,Статус\n";
    const rows = filtered.map(r =>
      `${r.calculated_at},${r.type},${r.amount},${r.zakat_due},${r.nisab_value},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "zakat_history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <IslamicFinanceLayout title="История Закят" titleIcon="📋">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/islamic-finance/zakat")} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 14 }}>← Назад</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>История расчётов</h2>
        </div>
        <button onClick={exportCSV} style={{ padding: "8px 16px", background: C.success, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💾 Экспорт CSV</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "individual", "corporate"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", background: filter === f ? C.primary : "transparent", color: filter === f ? "#fff" : C.text, border: `1px solid ${filter === f ? C.primary : C.border}`, borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {f === "all" ? "Все" : f === "individual" ? "Личный" : "Корпоративный"}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Итого закят к выплате</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: C.primary }}>{totalDue.toLocaleString()} UZS</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Расчётов</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: C.text }}>{filtered.length}</p>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 48, color: C.muted }}>⏳ Загрузка...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
          <p style={{ fontSize: 32 }}>💭</p>
          <p>История расчётов пуста</p>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{new Date(r.calculated_at).toLocaleDateString("ru-RU")}</span>
                <span style={{ padding: "2px 8px", background: r.type === "individual" ? C.infoBg : C.warningBg, color: r.type === "individual" ? C.primary : C.warning, borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                  {r.type === "individual" ? "Личный" : "Корп."}
                </span>
                <span style={{ padding: "2px 8px", background: r.status === "paid" ? C.successBg : C.warningBg, color: r.status === "paid" ? C.success : C.warning, borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                  {r.status === "paid" ? "Выплачен" : "Ожидает"}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Активы: {Number(r.amount).toLocaleString()} UZS | Нисаб: {Number(r.nisab_value).toLocaleString()} UZS</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.primary }}>{Number(r.zakat_due).toLocaleString()} UZS</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>Закят</p>
            </div>
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
