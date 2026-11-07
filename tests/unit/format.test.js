import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cx,
  formatCompactCurrency,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatNumber,
  formatPercent,
  initials,
  parseDateValue,
  titleCase,
} from '../../src/utils/format.js';

describe('formatCurrency', () => {
  it('formats whole pesos without decimals', () => {
    assert.equal(formatCurrency(661132), '₱661,132');
  });

  it('formats precise values with two decimals', () => {
    assert.equal(formatCurrency(1234.5, { precise: true }), '₱1,234.50');
  });

  it('falls back to zero for non-numeric input', () => {
    assert.equal(formatCurrency('not-a-number'), '₱0');
    assert.equal(formatCurrency(Number.POSITIVE_INFINITY, { precise: true }), '₱0.00');
  });
});

describe('compact number formatting', () => {
  it('abbreviates large currency values', () => {
    assert.equal(formatCompactCurrency(661132), '₱661.1K');
  });

  it('abbreviates large counts', () => {
    assert.equal(formatCompactNumber(1234567), '1.2M');
  });

  it('falls back to zero for invalid input', () => {
    assert.equal(formatCompactCurrency('invalid'), '₱0');
    assert.equal(formatCompactNumber('invalid'), '0');
  });
});

describe('formatNumber', () => {
  it('adds thousands separators and rounds to whole numbers by default', () => {
    assert.equal(formatNumber(1234567), '1,234,567');
  });

  it('supports up to two decimals', () => {
    assert.equal(formatNumber(12.345, { decimals: true }), '12.35');
  });

  it('falls back to zero for invalid input', () => {
    assert.equal(formatNumber('invalid'), '0');
  });
});

describe('formatPercent', () => {
  it('rounds to one decimal and appends a percent sign', () => {
    assert.equal(formatPercent(12.345), '12.3%');
  });

  it('supports a custom precision and no symbol', () => {
    assert.equal(formatPercent(12.345, { decimals: 2, symbol: false }), '12.35');
  });

  it('falls back to zero for invalid input', () => {
    assert.equal(formatPercent('invalid'), '0%');
    assert.equal(formatPercent('invalid', { symbol: false }), '0');
  });
});

describe('dates', () => {
  it('parses date-only strings as local dates without timezone drift', () => {
    const date = parseDateValue('2026-11-03');
    assert.deepEqual(
      [date.getFullYear(), date.getMonth(), date.getDate()],
      [2026, 10, 3]
    );
  });

  it('parses full ISO timestamps and rejects invalid values', () => {
    assert.equal(parseDateValue('2026-11-03T14:05:00').getHours(), 14);
    assert.equal(parseDateValue(''), null);
    assert.equal(parseDateValue('not-a-date'), null);
  });

  it('formats a long date, a short date and a timestamp', () => {
    assert.equal(formatDate('2026-11-03'), 'Nov 3, 2026');
    assert.equal(formatDateShort('2026-11-03'), 'Nov 3');
    assert.equal(formatDateTime('2026-11-03T14:05:00'), 'Nov 3, 2026, 2:05 PM');
  });

  it('returns an em dash for missing dates', () => {
    assert.equal(formatDate(null), '—');
    assert.equal(formatDateShort(undefined), '—');
    assert.equal(formatDateTime('nope'), '—');
  });
});

describe('text helpers', () => {
  it('builds initials from first and last names', () => {
    assert.equal(initials('Maria Santos'), 'MS');
    assert.equal(initials(' Admin '), 'AD');
    assert.equal(initials(''), 'AQ');
  });

  it('converts snake_case to title case', () => {
    assert.equal(titleCase('bank_transfer'), 'Bank Transfer');
  });

  it('joins truthy class names only', () => {
    assert.equal(cx('a', false, null, undefined, 'b', ''), 'a b');
  });
});
