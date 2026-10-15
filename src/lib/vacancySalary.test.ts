import { describe, expect, it } from 'vitest';
import { vacancySalaryLabel } from './vacancySalary';

const slot = (monthlySalary: number | undefined, status: 'open' | 'closed' | 'filled' = 'open') =>
  ({ id: 'x', jobPostingId: 'j', slotNumber: 1, itemNumber: 'i', monthlySalary, status }) as any;

describe('vacancySalaryLabel', () => {
  it('shows one amount when the open plantillas agree', () => {
    expect(vacancySalaryLabel({ plantillaSlots: [slot(31705), slot(31705)] })).toBe('₱31,705');
  });

  it('shows a range when open plantillas differ, ignoring closed ones', () => {
    expect(vacancySalaryLabel({ plantillaSlots: [slot(26917), slot(31705), slot(99999, 'closed')] })).toBe('₱26,917 – ₱31,705');
  });

  it("falls back to the posting's salary, then to Not specified", () => {
    expect(vacancySalaryLabel({ plantillaSlots: [slot(undefined)], monthlySalary: 42178 })).toBe('₱42,178');
    expect(vacancySalaryLabel({ plantillaSlots: [slot(undefined)] })).toBe('Not specified');
  });
});
