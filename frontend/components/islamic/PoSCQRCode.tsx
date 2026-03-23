"use client";
import { C } from "@/components/islamic/IslamicFinanceLayout";

interface PoSCQRCodeProps {
  certId: string;
  companyName: string;
  status: "compliant" | "pending" | "expired";
  issuedDate: string;
  expiryDate?: string;
  score?: number;
}

export default function PoSCQRCode({ certId, companyName, status, issuedDate, expiryDate, score }: PoSCQRCodeProps) {
  const qrUrl = `https://verify.aicapital.uz/posc/${certId}`;
  const size = 160;
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    compliant: { bg: "#dcfce7", text: "#166534", label: "\u0421\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442" },
    pending: { bg: "#fef9c3", text: "#854d0e", label: "\u041d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435" },
    expired: { bg: "#fecaca", text: "#991b1b", label: "\u0418\u0441\u0442\u0451\u043a" },
  };
  const st = statusColors[status] || statusColors.pending;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
      <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: C.text }}>
        \ud83d\udcf1 QR-\u043a\u043e\u0434 \u0441\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442\u0430 PoSC
      </h4>
      <div style={{
        width: size, height: size, margin: "0 auto 12px",
        background: "#fff", border: `2px solid ${C.border}`, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 4
      }}>
        <svg viewBox="0 0 100 100" width={size - 40} height={size - 40}>
          <rect x="0" y="0" width="30" height="30" fill="#000" />
          <rect x="5" y="5" width="20" height="20" fill="#fff" />
          <rect x="10" y="10" width="10" height="10" fill="#000" />
          <rect x="70" y="0" width="30" height="30" fill="#000" />
          <rect x="75" y="5" width="20" height="20" fill="#fff" />
          <rect x="80" y="10" width="10" height="10" fill="#000" />
          <rect x="0" y="70" width="30" height="30" fill="#000" />
          <rect x="5" y="75" width="20" height="20" fill="#fff" />
          <rect x="10" y="80" width="10" height="10" fill="#000" />
          <rect x="40" y="40" width="20" height="20" fill="#000" />
          <rect x="35" y="0" width="5" height="5" fill="#000" />
          <rect x="45" y="10" width="5" height="5" fill="#000" />
          <rect x="35" y="20" width="5" height="5" fill="#000" />
          <rect x="0" y="40" width="5" height="5" fill="#000" />
          <rect x="10" y="50" width="5" height="5" fill="#000" />
          <rect x="70" y="45" width="5" height="5" fill="#000" />
          <rect x="85" y="55" width="5" height="5" fill="#000" />
          <rect x="45" y="70" width="5" height="5" fill="#000" />
          <rect x="60" y="80" width="5" height="5" fill="#000" />
          <rect x="70" y="70" width="10" height="10" fill="#000" />
          <rect x="85" y="85" width="10" height="10" fill="#000" />
        </svg>
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: C.text }}>{companyName}</p>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.muted, fontFamily: "monospace" }}>ID: {certId}</p>
      <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: 8,
        background: st.bg, color: st.text, fontSize: 12, fontWeight: 600, marginBottom: 8
      }}>
        {st.label}
      </span>
      {score !== undefined && (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: C.muted }}>
          \u0421\u043a\u043e\u0440: <strong style={{ color: C.text }}>{score}%</strong>
        </p>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
        <p style={{ margin: 0 }}>\u0412\u044b\u0434\u0430\u043d: {issuedDate}</p>
        {expiryDate && <p style={{ margin: "2px 0 0" }}>\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u0435\u043d \u0434\u043e: {expiryDate}</p>}
      </div>
      <button
        onClick={() => navigator.clipboard.writeText(qrUrl)}
        style={{
          marginTop: 12, padding: "6px 16px", background: C.primary, color: "#fff",
          border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer"
        }}
      >
        \ud83d\udccb \u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443
      </button>
    </div>
  );
}
