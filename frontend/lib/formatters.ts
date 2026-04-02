/**
 * Единые форматтеры валюты, процентов, дат и чисел.
 * E0-01 — Форматирование UZS (сум), процентов, дат на русском.
 */

const MONTHS_LONG = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const;

/**
 * Форматирует число с пробелами как разделителями тысяч.
 * formatNumber(1234567) → "1 234 567"
 * formatNumber(1234.56, 2) → "1 234,56"
 */
export function formatNumber(value: number, decimals?: number): string {
  if (value === null || value === undefined || isNaN(value)) return '---';

  const abs = Math.abs(value);
  const fixed = decimals !== undefined ? abs.toFixed(decimals) : abs.toString();
  const [intPart, decPart] = fixed.split('.');

  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = value < 0 ? '\u2212' : '';

  if (decPart !== undefined) {
    return `${sign}${formatted},${decPart}`;
  }
  return `${sign}${formatted}`;
}

/**
 * Форматирует сумму в UZS (сум).
 * formatCurrencyUZS(1500000) → "1 500 000 сум"
 * formatCurrencyUZS(1500000, { compact: true }) → "1,5 млн сум"
 * formatCurrencyUZS(1500000, { decimals: 2 }) → "1 500 000,00 сум"
 */
export function formatCurrencyUZS(
  amount: number | null | undefined,
  options?: { compact?: boolean; decimals?: number },
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '---';

  const { compact = false, decimals } = options ?? {};

  if (compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '\u2212' : '';

    if (abs >= 1_000_000_000_000) {
      const val = (abs / 1_000_000_000_000).toFixed(1).replace('.', ',');
      return `${sign}${val} трлн сум`;
    }
    if (abs >= 1_000_000_000) {
      const val = (abs / 1_000_000_000).toFixed(1).replace('.', ',');
      return `${sign}${val} млрд сум`;
    }
    if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(1).replace('.', ',');
      return `${sign}${val} млн сум`;
    }
  }

  return `${formatNumber(amount, decimals)} сум`;
}

/**
 * Форматирует процент.
 * formatPercent(0.1234) → "12,34%"
 * formatPercent(0.1234, { decimals: 1 }) → "12,3%"
 * formatPercent(0.1234, { signed: true }) → "+12,34%"
 * formatPercent(-0.05, { signed: true }) → "\u221205,00%"
 */
export function formatPercent(
  value: number | null | undefined,
  options?: { decimals?: number; signed?: boolean },
): string {
  if (value === null || value === undefined || isNaN(value)) return '---';

  const { decimals = 2, signed = false } = options ?? {};
  const pct = value * 100;
  const abs = Math.abs(pct).toFixed(decimals).replace('.', ',');

  if (signed) {
    if (pct > 0) return `+${abs}%`;
    if (pct < 0) return `\u2212${abs}%`;
    return `${abs}%`;
  }

  const sign = pct < 0 ? '\u2212' : '';
  return `${sign}${abs}%`;
}

/**
 * Форматирует дату на русском.
 * formatDateRu(new Date()) → "2 апреля 2026"
 * formatDateRu(new Date(), { format: 'short' }) → "02.04.2026"
 * formatDateRu(new Date(), { format: 'monthYear' }) → "апрель 2026"
 */
export function formatDateRu(
  date: Date | string | null | undefined,
  options?: { format?: 'long' | 'short' | 'monthYear' },
): string {
  if (!date) return '---';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '---';

  const { format = 'long' } = options ?? {};

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  switch (format) {
    case 'short':
      return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
    case 'monthYear': {
      const monthNames = [
        'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
        'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
      ];
      return `${monthNames[month]} ${year}`;
    }
    default:
      return `${day} ${MONTHS_LONG[month]} ${year}`;
  }
}
