interface Props {
  status: "compliant" | "questionable" | "noncompliant" | "pending";
  score?: number;
  size?: "sm" | "md" | "lg";
}

const CONFIG = {
  compliant:    { label: "Соответствует",     bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", icon: "✅" },
  questionable: { label: "Сомнительно",       bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: "⚠️" },
  noncompliant: { label: "Не соответствует",  bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: "❌" },
  pending:      { label: "Ожидает",           bg: "#f9fafb", color: "#374151", border: "#e5e7eb", icon: "🔄" },
};

export default function ShariahStatusBadge({ status, score, size = "md" }: Props) {
  const cfg = CONFIG[status];
  const sz = size === "sm" ? { px: 8, py: 2, fs: 11 } : size === "lg" ? { px: 16, py: 8, fs: 15 } : { px: 12, py: 4, fs: 13 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999,
      fontWeight: 500, border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.color,
      padding: `${sz.py}px ${sz.px}px`, fontSize: sz.fs,
    }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {score !== undefined && (
        <span style={{ marginLeft: 4, opacity: 0.7 }}>{Number(score).toFixed(1)}/5</span>
      )}
    </span>
  );
}
