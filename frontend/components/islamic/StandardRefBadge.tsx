interface Props {
  code: string;
  org?: string;
}

const ORG_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  AAOIFI: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  IFSB:   { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
};
const DEFAULT_COLOR = { bg: "#f9fafb", color: "#374151", border: "#e5e7eb" };

export default function StandardRefBadge({ code, org }: Props) {
  const c = (org && ORG_COLORS[org]) || DEFAULT_COLOR;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontFamily: "monospace",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {org && <span style={{ fontWeight: 600 }}>{org}</span>}
      <span>{code}</span>
    </span>
  );
}
