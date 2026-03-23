"use client";
import { useState, useEffect } from "react";
import IslamicFinanceLayout, { C } from "../../../components/islamic/IslamicFinanceLayout";
import { islamicApi, IslamicProfile } from "../../../components/islamic/api";

const MADHABS = [
  { value: "hanafi", label: "Ханафи" },
  { value: "maliki", label: "Малики" },
  { value: "shafii", label: "Шафии" },
  { value: "hanbali", label: "Ханбали" },
];

const CURRENCIES = [
  { value: "UZS", label: "Узбекский сум (UZS)" },
  { value: "USD", label: "Доллар США (USD)" },
  { value: "EUR", label: "Евро (EUR)" },
  { value: "SAR", label: "Саудовский риял (SAR)" },
];

const LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "uz", label: "Узбекский" },
  { value: "en", label: "English" },
];

const MODES = [
  { value: "individual", label: "Физическое лицо", icon: "👤", desc: "Личные расчёты закята, скрининг портфеля" },
  { value: "professional", label: "Профессиональный", icon: "🏢", desc: "Корпоративный закят, аналитика, отчёты SSB" },
];

const SCREENING_STANDARDS = [
  { value: "aaoifi", label: "AAOIFI (Международный стандарт)" },
  { value: "ifsb", label: "IFSB (Совет по исламским финансам)" },
  { value: "oic", label: "OIC Fiqh Academy" },
  { value: "cbuz", label: "ЦБ Узбекистана" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<IslamicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [mode, setMode] = useState("individual");
  const [madhab, setMadhab] = useState("hanafi");
  const [currency, setCurrency] = useState("UZS");
  const [language, setLanguage] = useState("ru");
  const [screeningStandard, setScreeningStandard] = useState("aaoifi");
  const [notifications, setNotifications] = useState(true);
  const [zakatReminder, setZakatReminder] = useState(true);

  useEffect(() => {
    islamicApi.getProfile()
      .then((data) => {
        setProfile(data);
        setMode(data.mode || "individual");
        setCurrency(data.default_currency || "UZS");
        setLanguage(data.language || "ru");
      })
      .catch(() => {
        // Используем дефолтные значения если API недоступен
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await islamicApi.updateProfile({ mode, default_currency: currency, language });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, children: React.ReactNode, hint?: string) => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{hint}</p>}
      {children}
    </div>
  );

  const select = (value: string, onChange: (v: string) => void, options: {value: string; label: string}[]) => (
    <select
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`,
        borderRadius: 8, fontSize: 14, color: C.text, background: "#fff",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const toggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        background: checked ? C.primary : C.border,
        position: "relative", transition: "background 0.2s",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </div>
  );

  if (loading) {
    return (
      <IslamicFinanceLayout title="Профиль" titleIcon="👤">
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Загрузка профиля...</div>
      </IslamicFinanceLayout>
    );
  }

  return (
    <IslamicFinanceLayout
      title="Профиль исламских финансов"
      titleIcon="👤"
      subtitle="Настройте мазхаб, предпочтения скрининга и параметры расчётов"
      tipText="Ваши настройки влияют на методы расчёта закята, критерии скрининга и отображение данных"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>

        {/* Левая колонка */}
        <div>
          {/* Режим профиля */}
          <div style={{ padding: 20, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Режим профиля</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MODES.map(m => (
                <div
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  style={{
                    padding: 14, borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${mode === m.value ? C.primary : C.border}`,
                    background: mode === m.value ? C.infoBg : "#fff",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{m.label}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{m.desc}</div>
                    </div>
                    {mode === m.value && (
                      <span style={{ marginLeft: "auto", color: C.primary, fontSize: 18 }}>✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Религиозные настройки */}
          <div style={{ padding: 20, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Религиозные настройки</h3>
            {field("Мазхаб", select(madhab, setMadhab, MADHABS),
              "Влияет на метод расчёта закята и очистки доходов")}
            {field("Стандарт скрининга", select(screeningStandard, setScreeningStandard, SCREENING_STANDARDS),
              "Критерии для оценки халяльности ценных бумаг")}
          </div>
        </div>

        {/* Правая колонка */}
        <div>
          {/* Общие настройки */}
          <div style={{ padding: 20, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Общие настройки</h3>
            {field("Валюта для закята", select(currency, setCurrency, CURRENCIES),
              "Используется для расчётов нисаба и суммы закята")}
            {field("Язык интерфейса", select(language, setLanguage, LANGUAGES))}
          </div>

          {/* Уведомления */}
          <div style={{ padding: 20, background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Уведомления</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Изменения статуса скрининга</div>
                <div style={{ fontSize: 12, color: C.muted }}>Уведомлять при изменении халяль-статуса</div>
              </div>
              {toggle(notifications, setNotifications)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Напоминание о закяте</div>
                <div style={{ fontSize: 12, color: C.muted }}>Напоминать за 30 дней до даты закята</div>
              </div>
              {toggle(zakatReminder, setZakatReminder)}
            </div>
          </div>

          {/* Информация профиля */}
          {profile && (
            <div style={{ padding: 16, background: C.infoBg, borderRadius: 10, border: "1px solid #bae6fd", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>Текущий профиль</div>
              <div style={{ fontSize: 13, color: C.text }}>
                <div>ID: <span style={{ color: C.muted }}>{profile.id?.slice(0, 8)}...</span></div>
                <div>Юрисдикция: <span style={{ color: C.muted }}>{profile.jurisdiction || "UZ"}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div style={{ maxWidth: 900, marginTop: 8 }}>
        {error && (
          <div style={{ padding: 12, background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 8, fontSize: 13, color: C.error, marginBottom: 12 }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{ padding: 12, background: C.successBg, border: `1px solid ${C.success}`, borderRadius: 8, fontSize: 13, color: C.success, marginBottom: 12 }}>
            Профиль успешно сохранён!
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 32px", fontSize: 14, fontWeight: 700,
            background: saving ? C.border : C.primary,
            color: "#fff", border: "none", borderRadius: 10,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {saving ? "Сохраняем..." : "Сохранить настройки"}
        </button>
      </div>
    </IslamicFinanceLayout>
  );
}
