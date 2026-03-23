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
  { href: "/islamic-finance", label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f", icon: "\ud83c\udf19" },
  { href: "/islamic-finance/screening", label: "\u0421\u043a\u0440\u0438\u043d\u0438\u043d\u0433", icon: "\ud83d\udd0d" },
  { href: "/islamic-finance/zakat", label: "\u0417\u0430\u043a\u044f\u0442", icon: "\ud83d\udcb0" },
  { href: "/islamic-finance/purification", label: "\u0422\u0430\u0437\u043a\u0438\u044f", icon: "\ud83e\uddfc" },
  { href: "/islamic-finance/products", label: "\u041f\u0440\u043e\u0434\u0443\u043a\u0442\u044b", icon: "\ud83d\udce6" },
  { href: "/islamic-finance/glossary", label: "\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439", icon: "\ud83d\udcd6" },
  { href: "/islamic-finance/references", label: "\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u044b", icon: "\ud83d\udcdc" },
];

export interface MacroIndicator {
  label: string;
  value: string | number;
  icon: string;
}

export interface IslamicFinanceLayoutProps {
  title: string;
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
  title,
  titleIcon = "\u2600",
  subtitle,
  indicators = [],
  quickAskPlaceholder = "\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u0432\u043e\u043f\u0440\u043e\u0441...",
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
  const [qaAnswer, setQaAnswer] = useState<any>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");

  async function handleQuickAsk() {
    if (!qaQuestion.trim() || !onQuickAsk) return;
    setQaLoading(true);
    setQaError("");
    setQaAnswer(null);
    try {
      const data = await onQuickAsk(qaQuestion);
      setQaAnswer(data);
    } catch (e: any) {
      setQaError(e.message || "\u041e\u0448\u0438\u0431\u043a\u0430 Quick Ask");
    } finally {
      setQaLoading(false);
    }
  }

  const isActive = (href: string) => {
    if (href === "/islamic-finance") return pathname === "/islamic-finance";
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.text, margin: 0 }}>
            {titleIcon} {title}
          </h1>
          {subtitle && (
            <p style={{ color: C.muted, marginTop: 6, fontSize: 14 }}>{subtitle}</p>
          )}
        </div>

        {/* SubNav */}
        <nav style={{
          display: "flex", gap: 4, marginBottom: 20, padding: "4px",
          background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          overflowX: "auto", flexWrap: "nowrap",
        }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#fff" : C.muted,
                background: active ? C.primary : "transparent",
                textDecoration: "none", whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Ask */}
        {quickAskEnabled && onQuickAsk && (
          <div style={{ marginBottom: 20, padding: 20, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, color: C.text }}>
              {"\ud83d\udcac"} Quick Ask {"\u2014"} {"\u0431\u044b\u0441\u0442\u0440\u044b\u0439 \u0432\u043e\u043f\u0440\u043e\u0441"}
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: C.muted }}>
              {"\u0417\u0430\u0434\u0430\u0439\u0442\u0435 \u043b\u044e\u0431\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441 \u2014 AI \u043e\u0442\u0432\u0435\u0442\u0438\u0442 \u0441 \u0446\u0438\u0444\u0440\u0430\u043c\u0438 \u0438 \u0444\u0430\u043a\u0442\u0430\u043c\u0438"}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={qaQuestion}
                onChange={(e: any) => setQaQuestion(e.target.value)}
                onKeyDown={(e: any) => { if (e.key === "Enter" && !qaLoading) handleQuickAsk(); }}
                placeholder={quickAskPlaceholder}
                style={{ flex: 1, padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14 }}
              />
              <button
                onClick={handleQuickAsk}
                disabled={qaLoading || !qaQuestion.trim()}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: qaLoading ? C.muted : C.primary, color: "#fff",
                  cursor: qaLoading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap"
                }}
              >
                {qaLoading ? "AI \u0434\u0443\u043c\u0430\u0435\u0442..." : "\ud83d\udd0d \u0421\u043f\u0440\u043e\u0441\u0438\u0442\u044c"}
              </button>
            </div>
            {qaError && (
              <div style={{ marginTop: 8, padding: 8, background: C.errorBg, borderRadius: 6, color: C.error, fontSize: 13 }}>{qaError}</div>
            )}
            {qaAnswer && (
              <div style={{ marginTop: 12, padding: 16, background: C.infoBg, borderRadius: 8, border: "1px solid #bae6fd" }}>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{qaAnswer.answer}</div>
                {qaAnswer.provider && (
                  <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
                    {"\u041f\u0440\u043e\u0432\u0430\u0439\u0434\u0435\u0440"}: {qaAnswer.provider}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Macro Indicators */}
        {indicators.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            {indicators.map((m, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 140, padding: 12, background: C.card,
                borderRadius: 10, border: `1px solid ${C.border}`, textAlign: "center"
              }}>
                <div style={{ fontSize: 20 }}>{m.icon}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Step Progress Bar */}
        {steps.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: i <= currentStep ? C.primary : C.border,
                    transition: "background 0.3s", cursor: onStepChange ? "pointer" : "default"
                  }}
                  onClick={() => onStepChange && onStepChange(i)}
                />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{steps[currentStep]}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{"\u0428\u0430\u0433"} {currentStep + 1} {"\u0438\u0437"} {steps.length}</div>
            </div>
          </>
        )}

        {/* Tip */}
        {tipText && (
          <div style={{ padding: 10, background: C.infoBg, borderRadius: 8, border: "1px solid #bae6fd", marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#0369a1" }}>{"\ud83d\udca1"} {tipText}</p>
          </div>
        )}

        {/* Main Content */}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "1.5rem", marginBottom: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
