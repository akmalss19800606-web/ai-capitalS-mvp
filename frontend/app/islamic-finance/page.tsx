"use client";
import IslamicFinanceLayout from "@/components/islamic/IslamicFinanceLayout";
import { C } from "@/components/islamic/IslamicFinanceLayout";
import { HintBox } from "@/components/islamic/IslamicFinanceUI";

const STATS = [
  { icon: "\u262A\uFE0F", label: "\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u044b", value: "15", sub: "AAOIFI + IFSB" },
  { icon: "\uD83D\uDCCB", label: "\u0422\u0435\u0440\u043c\u0438\u043d\u043e\u0432", value: "30+", sub: "\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439" },
  { icon: "\uD83D\uDD0D", label: "\u0421\u043a\u0440\u0438\u043d\u0438\u043d\u0433", value: "SS No.62", sub: "AAOIFI" },
  { icon: "\uD83D\uDD4C", label: "\u0417\u0430\u043a\u044f\u0442", value: "\u041d\u0438\u0441\u0430\u0431", sub: "UZS/USD" },
  { icon: "\uD83C\uDF0D", label: "\u042e\u0440\u0438\u0441\u0434\u0438\u043a\u0446\u0438\u044f", value: "UZ", sub: "\u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d" },
];

const TOOLS = [
  { icon: "\uD83D\uDD4C", title: "\u0417\u0430\u043a\u044f\u0442", desc: "\u0420\u0430\u0441\u0447\u0451\u0442 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u0447\u0438\u0449\u0435\u043d\u0438\u044f \u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u0430 \u043f\u043e \u043d\u0438\u0441\u0430\u0431\u0443", href: "/islamic-finance/zakat" },
  { icon: "\uD83D\uDD0D", title: "\u0421\u043a\u0440\u0438\u043d\u0438\u043d\u0433", desc: "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0439 \u043f\u043e \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0443 AAOIFI SS No. 62", href: "/islamic-finance/screening" },
  { icon: "\uD83D\uDCD6", title: "\u0413\u043b\u043e\u0441\u0441\u0430\u0440\u0438\u0439", desc: "30+ \u0442\u0435\u0440\u043c\u0438\u043d\u043e\u0432 \u0438\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0445 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432 \u0441 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u044f\u043c\u0438", href: "/islamic-finance/glossary" },
  { icon: "\uD83D\uDCDC", title: "\u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u044b", desc: "AAOIFI \u0438 IFSB \u2014 15 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043e\u0432 \u0441 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435\u043c", href: "/islamic-finance/references" },
];

export default function IslamicFinancePage() {
  const indicators = STATS.map(s => ({ icon: s.icon, label: s.label, value: s.value }));

  return (
    <IslamicFinanceLayout
      title={"\u0418\u0441\u043b\u0430\u043c\u0441\u043a\u0438\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u044b"}
      titleIcon={"\u262A\uFE0F"}
      subtitle={"\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b \u0434\u043b\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u043e\u0432 \u0438 \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u0432 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0438 \u0441 \u043d\u043e\u0440\u043c\u0430\u043c\u0438 \u0448\u0430\u0440\u0438\u0430\u0442\u0430 \u00b7 \u0421\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u044b AAOIFI \u0438 IFSB \u00b7 \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d (UZS)"}
      indicators={indicators}
    >
      {/* Tools Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {TOOLS.map((tool) => (
          <a
            key={tool.title}
            href={tool.href}
            style={{
              display: "block", padding: 20, background: C.card, borderRadius: 12,
              border: `1px solid ${C.border}`, textDecoration: "none",
              transition: "all 0.2s", cursor: "pointer",
            }}
            onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = "0 4px 12px rgba(59,130,246,0.1)"; }}
            onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>{tool.icon}</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>{tool.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{tool.desc}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Info */}
      <div style={{ marginTop: 20 }}>
        <HintBox type="info">
          {"\u0412\u0441\u0435 \u0440\u0430\u0441\u0447\u0451\u0442\u044b \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044e\u0442 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u0430\u043c AAOIFI \u0438 IFSB. \u0414\u0430\u043d\u043d\u044b\u0435 \u0430\u0434\u0430\u043f\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u044b \u0434\u043b\u044f \u0440\u044b\u043d\u043a\u0430 \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0430."}
        </HintBox>
      </div>
    </IslamicFinanceLayout>
  );
}
