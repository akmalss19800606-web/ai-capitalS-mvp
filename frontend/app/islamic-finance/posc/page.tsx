"use client";
import { useState } from "react";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";

interface PoscFormData {
  companyName: string;
  registrationNumber: string;
  activityType: string;
  screeningDate: string;
  screeningScore: string;
  purificationDone: boolean;
  zakatPaid: boolean;
  ssbApproval: boolean;
}

const ACTIVITY_TYPES = [
  { value: "trade", label: "Торговля" },
  { value: "production", label: "Производство" },
  { value: "services", label: "Услуги" },
  { value: "finance", label: "Финансы" },
  { value: "agriculture", label: "Сельское хозяйство" },
  { value: "it", label: "ИТ и технологии" },
  { value: "real_estate", label: "Недвижимость" },
];

const CHECKLIST_ITEMS = [
  { key: "noRiba", label: "Отсутствие риба (процентных операций)" },
  { key: "noGharar", label: "Отсутствие гарар (чрезмерной неопределённости)" },
  { key: "noMaysir", label: "Отсутствие майсир (азартных элементов)" },
  { key: "noHaram", label: "Отсутствие харам-деятельности (алкоголь, табак, оружие)" },
    { key: "halal", label: "Халяльный источник дохода" },
  { key: "zakatCompliance", label: "Соблюдение обязанности по закяту" },
  { key: "aaoifiCompliance", label: "Соответствие стандартам AAOIFI" },
];

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14, boxSizing: "border-box" as const,
};

export default function PoscPage() {
  const [form, setForm] = useState<PoscFormData>({
    companyName: "", registrationNumber: "", activityType: "",
    screeningDate: "", screeningScore: "",
    purificationDone: false, zakatPaid: false, ssbApproval: false,
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [generated, setGenerated] = useState(false);
  const [certNumber, setCertNumber] = useState("");

  const allChecked = CHECKLIST_ITEMS.every(i => checklist[i.key]);
  const canGenerate = form.companyName && form.activityType && form.screeningScore && allChecked
    && form.purificationDone && form.zakatPaid && form.ssbApproval;

  const handleGenerate = () => {
    const num = `POSC-${Date.now().toString(36).toUpperCase()}`;
    setCertNumber(num);
    setGenerated(true);
  };

  const handleReset = () => {
    setForm({ companyName: "", registrationNumber: "", activityType: "",
      screeningDate: "", screeningScore: "",
      purificationDone: false, zakatPaid: false, ssbApproval: false });
    setChecklist({});
    setGenerated(false);
    setCertNumber("");
  };

  return (
    <IslamicFinanceLayout
      title="Сертификат шариатского соответствия (PoSC)"
      titleIcon="📜"
      subtitle="Генерация Proof of Shariah Compliance — подтверждение соответствия деятельности нормам шариата по AAOIFI и IFSB"
    >
      {!generated ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Company Info */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>
              🏢 Данные компании
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Название компании *</label>
                <input style={inputStyle} value={form.companyName}
                  onChange={e => setForm({...form, companyName: e.target.value})} placeholder="ООО Название" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Рег. номер</label>
                <input style={inputStyle} value={form.registrationNumber}
                  onChange={e => setForm({...form, registrationNumber: e.target.value})} placeholder="123456789" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Вид деятельности *</label>
                <select style={inputStyle} value={form.activityType}
                  onChange={e => setForm({...form, activityType: e.target.value})}>
                  <option value="">Выберите</option>
                  {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 4, display: "block" }}>Оценка скрининга (0–5) *</label>
                <input style={inputStyle} type="number" min="0" max="5" step="0.1"
                  value={form.screeningScore}
                  onChange={e => setForm({...form, screeningScore: e.target.value})} placeholder="4.5" />
              </div>
            </div>
          </div>

          {/* Shariah Checklist */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>
              ✅ Чек-лист шариатского соответствия
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8, border: `1px solid ${checklist[item.key] ? C.success : C.border}`,
                  background: checklist[item.key] ? C.successBg : C.card, cursor: "pointer", transition: "all 0.2s" }}>
                  <input type="checkbox" checked={!!checklist[item.key]}
                    onChange={() => setChecklist({...checklist, [item.key]: !checklist[item.key]})}
                    style={{ width: 18, height: 18, accentColor: C.primary }} />
                  <span style={{ fontSize: 14, color: C.text }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Confirmations */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>
              📎 Подтверждения
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "purificationDone", label: "Очистка дохода (тазкия) выполнена" },
                { key: "zakatPaid", label: "Закят уплачен" },
                { key: "ssbApproval", label: "Одобрение SSB (Шариатского совета) получено" },
              ].map(c => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8, border: `1px solid ${(form as any)[c.key] ? C.success : C.border}`,
                  background: (form as any)[c.key] ? C.successBg : C.card, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form as any)[c.key]}
                    onChange={() => setForm({...form, [c.key]: !(form as any)[c.key]})}
                    style={{ width: 18, height: 18, accentColor: C.primary }} />
                  <span style={{ fontSize: 14, color: C.text }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={!canGenerate}
            style={{ padding: "14px 24px", borderRadius: 12, border: "none",
              background: canGenerate ? C.primary : C.border, color: "#fff",
              fontSize: 16, fontWeight: 600, cursor: canGenerate ? "pointer" : "not-allowed" }}>
            📜 Сгенерировать сертификат
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
            borderRadius: 16, border: `2px solid ${C.success}`, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              Сертификат шариатского соответствия
            </h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>Proof of Shariah Compliance (PoSC)</p>
            <div style={{ background: C.card, borderRadius: 12, padding: 20, textAlign: "left",
              border: `1px solid ${C.border}`, maxWidth: 500, margin: "0 auto" }}>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Номер сертификата</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.primary, marginBottom: 16 }}>{certNumber}</p>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Компания</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 16 }}>{form.companyName}</p>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Вид деятельности</p>
              <p style={{ fontSize: 14, color: C.text, marginBottom: 16 }}>
                {ACTIVITY_TYPES.find(t => t.value === form.activityType)?.label}
              </p>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Оценка скрининга</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: C.success }}>{form.screeningScore} / 5.0</p>
            </div>
            <div style={{ marginTop: 20, padding: 16, background: C.successBg, borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: C.success, fontWeight: 500 }}>
                Дата выдачи: {new Date().toLocaleDateString("ru-RU")} | Стандарт: AAOIFI SS No. 62
              </p>
            </div>
          </div>
          <button onClick={handleReset}
            style={{ padding: "12px 24px", borderRadius: 12, border: `1px solid ${C.border}`,
              background: C.card, color: C.text, fontSize: 14, cursor: "pointer" }}>
            ← Создать новый сертификат
          </button>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
