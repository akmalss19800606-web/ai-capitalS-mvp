"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

const CONTRACTS = [
  { id: "murabaha", name: "Murabakha", icon: "💰", type: "Torgovyy", desc: "Prodazha s nadbavkoy. Bank pokupaet tovar i prodaet klientu s izvestnoy marzhy.", aaoifi: "SS 8", risk: "Nizkiy" },
  { id: "mudaraba", name: "Mudaraba", icon: "🤝", type: "Investitsionnyy", desc: "Partnerstvo: odin vkladyvaet kapital, drugoy — trud i ekspertizu.", aaoifi: "SS 13", risk: "Vysokiy" },
  { id: "musharaka", name: "Musharaka", icon: "🏢", type: "Investitsionnyy", desc: "Sovmestnoye predpriyatiye s razdeleniyem pribyli i ubytkov.", aaoifi: "SS 12", risk: "Sredniy" },
  { id: "ijara", name: "Idzara", icon: "🏠", type: "Arendnyy", desc: "Lizing-soglasheniye. Bank pokupaet aktiv i sdaet v arendu klientu.", aaoifi: "SS 9", risk: "Nizkiy" },
  { id: "salam", name: "Salam", icon: "🌾", type: "Torgovyy", desc: "Predvaritelnaya oplata za tovar s otlozhennoy dostavkoy.", aaoifi: "SS 10", risk: "Sredniy" },
  { id: "istisna", name: "Istisna", icon: "🏗️", type: "Proizvodstvennyy", desc: "Zakaz na izgotovleniye. Oplata etapami za tovar, kotoryy yeshcho ne proizvedon.", aaoifi: "SS 11", risk: "Sredniy" },
  { id: "wakala", name: "Vakala", icon: "📜", type: "Agentskiy", desc: "Dogovor porucheniya. Agent deystvuyet ot imeni klienta za voznagrazhdenie.", aaoifi: "SS 23", risk: "Nizkiy" },
  { id: "qard", name: "Kard Khasan", icon: "❤️", type: "Blagotvoritelnyy", desc: "Besprotsentnyy zaym. Dolzhnik vozvrashchayet tolko osnovnuyu summu.", aaoifi: "SS 19", risk: "Nizkiy" },
];

export default function ContractsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const types = ["all", ...new Set(CONTRACTS.map((c) => c.type))];
  const filtered = filter === "all" ? CONTRACTS : CONTRACTS.filter((c) => c.type === filter);

  return (
    <IslamicFinanceLayout title="Islamskiye kontrakty" titleIcon="📝">
      <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700, color: C.text }}>📝 Islamskiye kontrakty (Uqud)</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === t ? C.primary : C.border}`, background: filter === t ? C.primary : C.card, color: filter === t ? "#fff" : C.text, fontSize: 13, cursor: "pointer" }}>
            {t === "all" ? "Vse" : t}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((c) => (
          <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)} style={{ background: C.card, border: `1px solid ${selected === c.id ? C.primary : C.border}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: c.risk === "Nizkiy" ? C.successBg : c.risk === "Vysokiy" ? C.errorBg : C.warningBg, color: c.risk === "Nizkiy" ? C.success : c.risk === "Vysokiy" ? C.error : C.warning }}>{c.risk}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{c.type} | {c.aaoifi}</div>
            {selected === c.id && (
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>{c.desc}</div>
            )}
          </div>
        ))}
      </div>
    </IslamicFinanceLayout>
  );
}
