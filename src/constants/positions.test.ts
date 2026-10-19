import { describe, expect, it } from 'vitest';
import { formatDivisionAndOffice, formatOfficeLabel } from './positions';

describe('formatDivisionAndOffice', () => {
  it('shows the division with its office', () => {
    expect(formatDivisionAndOffice('Office of The City Accountant', 'Executive & Administrative Division'))
      .toBe('Executive & Administrative Division · Office of The City Accountant');
  });

  it('falls back to whichever part is set', () => {
    expect(formatDivisionAndOffice('Office of The City Engineer', '  ')).toBe('Office of The City Engineer');
    expect(formatDivisionAndOffice(null, 'Office Proper')).toBe('Office Proper');
    expect(formatDivisionAndOffice(undefined, undefined)).toBe('');
  });
});

describe('formatOfficeLabel', () => {
  it('keeps the office next to a division, so shared division names stay distinct', () => {
    const accountant = formatOfficeLabel('Office of The City Accountant', 'Executive & Administrative Division');
    const health = formatOfficeLabel('Office of The City Health Officer', 'Executive & Administrative Division');
    expect(accountant).not.toBe(health);
    expect(accountant).toBe('Executive & Administrative Division · Office of The City Accountant');
  });

  it('suffixes a bare department name as before', () => {
    expect(formatOfficeLabel('Information Technology')).toBe('Information Technology Department');
    expect(formatOfficeLabel('')).toBe('Unassigned Department');
  });
});
