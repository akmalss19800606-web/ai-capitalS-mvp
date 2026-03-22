interface Props {
  uzs: number;
  usd?: number;
  className?: string;
}

export default function CurrencyDisplay({ uzs, usd, className = "" }: Props) {
  const fmtUZS = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(uzs);
  const fmtUSD = usd !== undefined ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd) : null;

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="font-semibold">{fmtUZS} <span className="text-xs text-gray-500">UZS</span></span>
      {fmtUSD && <span className="text-xs text-gray-400">≈ {fmtUSD}</span>}
    </span>
  );
}
