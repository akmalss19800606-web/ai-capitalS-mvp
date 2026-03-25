"use client";
import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const C = {
  bg: "#f8f8fc",
  card: "#ffffff",
  primary: "#3b82f6",
  primaryDark: "#2563eb",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  success: "#22c55e",
  successBg: "#f0fdf4",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
  error: "#ef4444",
  errorBg: "#fef2f2",
  infoBg: "#eff6ff",
};

const NAV_ITEMS = [
  { href: "/islamic-finance", label: "Главная", icon: "🌙" },
  { href: "/islamic-finance/screening", label: "Скрининг", icon: "🔍" },
  { href: "/islamic-finance/zakat", label: "Закят", icon: "💰" },
  { href: "/islamic-finance/purification", label: "Тазкия", icon: "🧼" },
  { href: "/islamic-finance/products", label: "Продукты", icon: "📦" },
    { href: "/islamic-finance/posc", label: "Сертификат PoSC", icon: "📜" },
    { href: "/islamic-finance/ssb", label: "SSB / Фатвы", icon: "📚" },
    { href: "/islamic-finance/p2p", label: "P2P Проекты", icon: "🤝" },
  { href: "/islamic-finance/glossary", label: "Глоссарий", icon: "📖" },
  { href: "/islamic-finance/references", label: "Стандарты", icon: "📜" },
    { href: "/islamic-finance/sukuk", label: "Сукук", icon: "📊" },
  { href: "/islamic-finance/takaful", label: "Такафул", icon: "🛡️" },
  { href: "/islamic-finance/waqf", label: "Вакф", icon: "🏛️" },
    { href: "/islamic-finance/profile", label: "Профиль", icon: "⚙️" },
    { href: "/islamic-finance/indices", label: "Индексы", icon: "📈" },
    { href: "/islamic-finance/education", label: "Образование", icon: "🎓" },
    { href: "/islamic-finance/analytics", label: "Аналитика", icon: "📊" },
    { href: "/islamic-finance/compliance-checker", label: "Комплаенс", icon: "✅" },
    { href: "/islamic-finance/risk-assessment", label: "Риски", icon: "🛡️" },
    { href: "/islamic-finance/contracts", label: "Контракты", icon: "📝" },
    { href: "/islamic-finance/reports", label: "Отчеты", icon: "📊" },
];

export interface MacroIndicator {
  label: string;
  value: string | number;
  icon: string;
}

export interface IslamicFinanceLayoutProps {
  title?: string;
  titleIcon?: string;
  subtitle?: string;
  indicators?: MacroIndicator[];
  quickAskPlaceholder?: string;
  quickAskEnabled?: boolean;
  onQuickAsk?: (question: string) => Promise<{answer: string; provider?: string; timestamp?: string}>;
  steps?: string[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
  tipText?: string;
  children: ReactNode;
}

export default function IslamicFinanceLayout({
  title = "Исламские финансы",
  titleIcon = "☀",
  subtitle,
  indicators = [],
  quickAskPlaceholder = "Задайте вопрос...",
  quickAskEnabled = false,
  onQuickAsk,
  steps = [],
  currentStep = 0,
  onStepChange,
  tipText,
  children,
}: IslamicFinanceLayoutProps) {
  const pathname = usePathname();
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<{answer: string; provider?: string; timestamp?: string} | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");

  async function handleQuickAsk() {
    if (!qaQuestion.trim() || !onQuickAsk) return;
    setQaLoading(true); setQaError(""); setQaAnswer(null);
    try {
      const data = await onQuickAsk(qaQuestion);
      setQaAnswer(data);
    } catch (e: any) {
      setQaError(e.message || "Ошибка Quick Ask");
    } finally {
      setQaLoading(false);
    }
  }

  const isActive = (href: string) => {
    if (href === "/islamic-finance") return pathname === "/islamic-finance";
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
          {titleIcon} {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{subtitle}</p>
        )}
      </div>

      {/* SubNav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap", borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 6, fontSize: 13,
              fontWeight: active ? 600 : 400, textDecoration: "none",
              background: active ? C.primary : "transparent",
              color: active ? "#fff" : C.muted,
              transition: "all 0.15s",
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Quick Ask */}
      {quickAskEnabled && onQuickAsk && (
        <div style={{ marginBottom: 24, padding: 16, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            Quick Ask — быстрый вопрос
          </h3>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Задайте любой вопрос — AI ответит с цифрами и фактами
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={qaQuestion}
              onChange={(e: any) => setQaQuestion(e.target.value)}
              onKeyDown={(e: any) => { if (e.key === "Enter" && !qaLoading) handleQuickAsk(); }}
              placeholder={quickAskPlaceholder}
              style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}
            />
            <button onClick={handleQuickAsk} disabled={qaLoading} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600,
              background: C.primary, color: "#fff", border: "none",
              borderRadius: 8, cursor: qaLoading ? "not-allowed" : "pointer",
            }}>
              {qaLoading ? "AI думает..." : "Спросить"}
            </button>
          </div>
          {qaError && (
            <div style={{ color: C.error, fontSize: 13, marginTop: 8 }}>{qaError}</div>
          )}
          {qaAnswer && (
            <div style={{ marginTop: 12, padding: 12, background: C.infoBg, borderRadius: 8, fontSize: 13 }}>
              <div>{qaAnswer.answer}</div>
              {qaAnswer.provider && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  Провайдер: {qaAnswer.provider}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Macro Indicators */}
      {indicators.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {indicators.map((m, i) => (
            <div key={i} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, minWidth: 120 }}>
              <div style={{ fontSize: 18 }}>{m.icon}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Step Progress Bar */}
      {steps.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i <= currentStep ? C.primary : C.border,
                cursor: onStepChange ? "pointer" : "default",
              }} onClick={() => onStepChange && onStepChange(i)} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
            {steps[currentStep]}
            <span style={{ float: "right" }}>Шаг {currentStep + 1} из {steps.length}</span>
          </div>
        </>
      )}

      {/* Tip */}
      {tipText && (
        <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, background: C.infoBg, border: "1px solid #bae6fd", fontSize: 13, color: C.text }}>
          💡 {tipText}
        </div>
      )}

      {/* Main Content */}
      <div>{children}</div>
    </div>
  );
}
