"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import PurificationCalculator from "@/components/islamic/PurificationCalculator";
import { islamicApi, PurificationResult } from "@/components/islamic/api";

export default function PurificationPage() {
  const [history, setHistory] = useState<PurificationResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = async () => {
    try {
      const data = await islamicApi.getPurificationHistory();
      setHistory(data);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleResult = () => { loadHistory(); };

  return (
    <IslamicFinanceLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PurificationCalculator onResult={handleResult} />

        {/* History */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>
            История очистки
          </h3>
          {historyLoading ? (
            <div style={{ fontSize: 13, color: C.muted }}>Загрузка...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted }}>История пуста. Рассчитайте первую очистку.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Дата</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Позиция</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Дивиденд</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Харам %</th>
                    <th style={{ textAlign: "right", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Очистка</th>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: C.muted, fontWeight: 600 }}>Метод</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", color: C.text }}>{new Date(item.created_at).toLocaleDateString("ru-RU")}</td>
                      <td style={{ padding: "8px 10px", color: C.text }}>{item.position_name}</td>
                      <td style={{ padding: "8px 10px", color: C.text, textAlign: "right" }}>{Number(item.dividend_amount).toLocaleString("ru-RU")}</td>
                      <td style={{ padding: "8px 10px", color: C.text, textAlign: "right" }}>{item.haram_pct}%</td>
                      <td style={{ padding: "8px 10px", color: C.error, fontWeight: 600, textAlign: "right" }}>{Number(item.purification_amount).toLocaleString("ru-RU")}</td>
                      <td style={{ padding: "8px 10px", color: C.muted }}>{item.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </IslamicFinanceLayout>
  );
}
