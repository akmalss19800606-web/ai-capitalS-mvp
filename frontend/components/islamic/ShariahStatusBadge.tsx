interface Props {
  status: "compliant" | "questionable" | "noncompliant" | "pending";
  score?: number;
  size?: "sm" | "md" | "lg";
}

const CONFIG = {
  compliant:    { label: "Соответствует", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "✅" },
  questionable: { label: "Сомнительно",   color: "bg-amber-100 text-amber-800 border-amber-200",     icon: "⚠️" },
  noncompliant: { label: "Не соответствует", color: "bg-red-100 text-red-800 border-red-200",        icon: "❌" },
  pending:      { label: "Ожидает",        color: "bg-gray-100 text-gray-700 border-gray-200",       icon: "⏳" },
};

export default function ShariahStatusBadge({ status, score, size = "md" }: Props) {
  const cfg = CONFIG[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cfg.color} ${padding}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {score !== undefined && (
        <span className="ml-1 opacity-70">{Number(score).toFixed(1)}/5</span>
      )}
    </span>
  );
}
