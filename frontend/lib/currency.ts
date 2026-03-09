/**
 * Утилита форматирования сумм в UZS.
 * Этап 0, Сессия 0.2 — Валюта UZS.
 *
 * Стандарт: 1 250 000,50 UZS (пробел — разделитель тысяч, запятая — десятичный)
 */

/**
 * Форматирует число в формат UZS: "1 250 000,50 UZS"
 */
export function formatUZS(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0,00 UZS";

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0,00 UZS";

  // Разделяем целую и дробную часть
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split(".");

  // Форматируем целую часть с пробелами как разделитель тысяч
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // Собираем: знак + целая + запятая + дробная + " UZS"
  const sign = num < 0 ? "-" : "";
  return `${sign}${formatted},${decPart} UZS`;
}

/**
 * Форматирует число как валюту с указанным кодом.
 * Если currency === "UZS" — использует узбекский формат.
 * Иначе — стандартный формат с точкой.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "UZS"
): string {
  if (currency.toUpperCase() === "UZS") return formatUZS(amount);

  if (amount === null || amount === undefined || amount === "") return `0.00 ${currency}`;

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `0.00 ${currency}`;

  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const sign = num < 0 ? "-" : "";
  return `${sign}${formatted}.${decPart} ${currency}`;
}

/**
 * Сокращённый формат для больших сумм:
 * 1 500 000 -> "1,5 млн UZS"
 * 2 300 000 000 -> "2,3 млрд UZS"
 */
export function formatUZSShort(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "0 UZS";

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 UZS";

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(1).replace(".", ",");
    return `${sign}${val} млрд UZS`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(1).replace(".", ",");
    return `${sign}${val} млн UZS`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(".", ",");
    return `${sign}${val} тыс UZS`;
  }

  return formatUZS(amount);
}

/**
 * Парсит строку UZS обратно в число: "1 250 000,50 UZS" -> 1250000.5
 */
export function parseUZS(formatted: string): number {
  if (!formatted) return 0;
  const cleaned = formatted
    .replace(/\s*UZS\s*$/i, "")  // Убираем "UZS"
    .replace(/\s/g, "")           // Убираем пробелы
    .replace(",", ".");            // Запятая -> точка
  return parseFloat(cleaned) || 0;
}
