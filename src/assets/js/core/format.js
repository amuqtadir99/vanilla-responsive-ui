/**
 * Locale-aware value formatting for charts, tables and the assistant.
 * Thin wrappers over Intl with cached formatters.
 *
 *   formatValue(48290, 'currency')          → "$48,290"
 *   formatValue(48290, 'currency-compact')  → "$48K"
 *   formatValue(2.4, 'percent')             → "2.4%"   (value is already a percentage)
 *   formatValue('2026-03', 'month')         → "Mar 2026"
 *
 * @module core/format
 */

const cache = new Map();

function formatter(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

function toDate(value) {
  if (value instanceof Date) return value;
  const s = String(value);
  // "2026-03" (month) → first day of month, parsed as local time.
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-01T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  return new Date(s);
}

/**
 * @param {unknown} value
 * @param {string} [format] number | integer | compact | currency | currency-compact |
 *   percent | date | date-short | month | short-month | text
 * @param {{ currency?: string, locale?: string }} [options]
 * @returns {string}
 */
export function formatValue(value, format = 'number', { currency = 'USD', locale } = {}) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);

  switch (format) {
    case 'integer':
      return formatter(`int|${locale}`, () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })).format(n);
    case 'compact':
      return formatter(`compact|${locale}`, () => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })).format(n);
    case 'currency': {
      // Whole amounts drop the cents ($249); others keep them ($6.95).
      const digits = n % 1 === 0 ? 0 : 2;
      return formatter(`cur|${currency}|${locale}|${digits}`, () => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits })).format(n);
    }
    case 'currency-compact':
      return formatter(`curc|${currency}|${locale}`, () => new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 })).format(n);
    case 'percent':
      return `${formatter(`pct|${locale}`, () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })).format(n)}%`;
    case 'date':
      return formatter(`date|${locale}`, () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })).format(toDate(value));
    case 'date-short':
      return formatter(`dshort|${locale}`, () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })).format(toDate(value));
    case 'month':
      return formatter(`month|${locale}`, () => new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' })).format(toDate(value));
    case 'short-month':
      return formatter(`smonth|${locale}`, () => new Intl.DateTimeFormat(locale, { month: 'short' })).format(toDate(value));
    case 'text':
      return String(value);
    default:
      return Number.isFinite(n)
        ? formatter(`num|${locale}`, () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })).format(n)
        : String(value);
  }
}

/** Percentage change from `previous` to `current`, rounded to one decimal. */
export function percentChange(current, previous) {
  if (!previous) return 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
