/**
 * Shared formatting helpers. All monetary values are Philippine pesos because
 * AquaTrack models a Philippine water refilling station.
 */

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pesoFormatterPrecise = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('en-PH', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-PH', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value, { precise = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return precise ? '₱0.00' : '₱0';
  return precise ? pesoFormatterPrecise.format(number) : pesoFormatter.format(number);
}

export function formatCompactCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '₱0';
  return `₱${compactFormatter.format(number)}`;
}

export function formatNumber(value, { decimals = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return decimals ? decimalFormatter.format(number) : numberFormatter.format(number);
}

export function formatCompactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return compactFormatter.format(number);
}

export function formatPercent(value, { decimals = 1, symbol = true } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return symbol ? '0%' : '0';
  const rounded = Number(number.toFixed(decimals));
  return symbol ? `${rounded}%` : String(rounded);
}

/**
 * Parses either a date-only string ("2026-11-03") or a full ISO timestamp.
 * Date-only values are treated as local dates so day labels never shift.
 */
export function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const stringValue = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
    const [year, month, day] = stringValue.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, { month = 'short', year = 'numeric', day = 'numeric' } = {}) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PH', { month, day, year }).format(date);
}

export function formatDateShort(value) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
}

export function formatDateTime(value) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function todayLong() {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

export function initials(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AQ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function titleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Join class names, skipping falsey values. */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}
