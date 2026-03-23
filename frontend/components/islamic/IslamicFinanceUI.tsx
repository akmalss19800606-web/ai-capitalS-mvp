"use client";
import { ReactNode, CSSProperties } from "react";
import { C } from "./IslamicFinanceLayout";

// ── SectionHeader ──
export function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: C.text, margin: 0 }}>
        {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
        {title}
      </h2>
      {subtitle && <p style={{ color: C.muted, marginTop: 4, fontSize: 13 }}>{subtitle}</p>}
    </div>
  );
}

// ── InfoCard ──
export function InfoCard({ icon, label, value, style }: { icon: string; label: string; value: string | number; style?: CSSProperties }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: 12, background: C.card,
      borderRadius: 10, border: `1px solid ${C.border}`, textAlign: "center", ...style
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  );
}

// ── HintBox ──
export function HintBox({ children, type = "info" }: { children: ReactNode; type?: "info" | "success" | "warning" | "error" }) {
  const styles = {
    info: { bg: C.infoBg, border: "#bae6fd", color: "#0369a1", icon: "\uD83D\uDCA1" },
    success: { bg: C.successBg, border: "#86efac", color: "#15803d", icon: "\u2705" },
    warning: { bg: C.warningBg, border: "#fde047", color: "#854d0e", icon: "\u26A0\uFE0F" },
    error: { bg: C.errorBg, border: C.error, color: C.error, icon: "\u274C" },
  };
  const s = styles[type];
  return (
    <div style={{ padding: 10, background: s.bg, borderRadius: 8, border: `1px solid ${s.border}`, marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: s.color }}>{s.icon} {children}</p>
    </div>
  );
}

// ── FormLabel ──
export function FormLabel({ text, tip, required }: { text: string; tip?: string; required?: boolean }) {
  return (
    <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: C.text, fontSize: 14 }}>
      {text}{required && <span style={{ color: C.error }}> *</span>}
      {tip && <span style={{ cursor: "help", marginLeft: 4, color: C.muted }} title={tip}>{"\u24D8"}</span>}
    </label>
  );
}

// ── FormSelect ──
export function FormSelect({ children, style, ...props }: any) {
  return (
    <select
      {...props}
      style={{
        width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`,
        borderRadius: 8, fontSize: 14, background: "#fff", ...style
      }}
    >
      {children}
    </select>
  );
}

// ── FormInput ──
export function FormInput({ style, ...props }: any) {
  return (
    <input
      {...props}
      style={{
        width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`,
        borderRadius: 8, fontSize: 14, boxSizing: "border-box", ...style
      }}
    />
  );
}

// ── FormTextarea ──
export function FormTextarea({ style, ...props }: any) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%", padding: 10, border: `1px solid ${C.border}`,
        borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", ...style
      }}
    />
  );
}

// ── Chip ──
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500,
        cursor: "pointer", transition: "all 0.2s",
        border: active ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
        background: active ? C.infoBg : "#fff",
        color: active ? C.primary : C.text,
      }}
    >
      {children}
    </button>
  );
}

// ── Slider ──
export function Slider({ value, onChange, min, max, step, label }: {
  value: number; onChange: (e: any) => void; min: number; max: number; step?: number; label: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: C.text }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step || 1} value={value} onChange={onChange}
        style={{ width: "100%", accentColor: C.primary }}
      />
    </div>
  );
}

// ── Grid2 helper ──
export const grid2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" };

// ── ActionButton ──
export function ActionButton({ onClick, disabled, variant = "primary", children, style }: {
  onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "success" | "danger";
  children: ReactNode; style?: CSSProperties;
}) {
  const colors = {
    primary: { bg: C.primary, text: "#fff" },
    secondary: { bg: "#fff", text: C.text },
    success: { bg: "#10b981", text: "#fff" },
    danger: { bg: C.error, text: "#fff" },
  };
  const v = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600,
        border: variant === "secondary" ? `1px solid ${C.border}` : "none",
        background: disabled ? C.muted : v.bg, color: v.text,
        cursor: disabled ? "not-allowed" : "pointer", ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── LoadingBar ──
export function LoadingBar({ progress, text }: { progress: number; text?: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
          width: `${progress}%`, transition: "width 0.5s", borderRadius: 4
        }} />
      </div>
      {text && <p style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 8 }}>{text}</p>}
    </div>
  );
}

// ── EmptyState ──
export function EmptyState({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>{title}</h3>
      {description && <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{description}</p>}
    </div>
  );
}

// ── DataTable ──
export function DataTable({ headers, rows, style }: { headers: string[]; rows: (string | number)[][]; style?: CSSProperties }) {
  return (
    <div style={{ overflowX: "auto", ...style }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 12px", textAlign: "left", borderBottom: `2px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 12, textTransform: "uppercase" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : C.bg }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, color: C.text }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
