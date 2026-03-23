import { C } from "./IslamicFinanceLayout";

interface Props {
  uzs: number;
  usd?: number;
  className?: string;
}

export default function CurrencyDisplay({ uzs, usd, className = "" }: Props) {
  const fmtUZS = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(uzs);
  const fmtUSD = usd !== undefined ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd) : null;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
        {fmtUZS} <span style={{ fontSize: 11, color: C.muted }}>UZS</span>
      </span>
      {fmtUSD && (
        <span style={{ fontSize: 12, color: C.muted }}>
                    ≈ {fmtUSD}
        </span>
      )}
    </span>
  );
}
