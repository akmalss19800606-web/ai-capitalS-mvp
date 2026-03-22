interface Props {
  code: string;
  org?: string;
}

export default function StandardRefBadge({ code, org }: Props) {
  const color = org === "AAOIFI"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : org === "IFSB"
    ? "bg-purple-50 text-purple-700 border-purple-200"
    : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-mono ${color}`}>
      {org && <span className="font-semibold">{org}</span>}
      <span>{code}</span>
    </span>
  );
}
