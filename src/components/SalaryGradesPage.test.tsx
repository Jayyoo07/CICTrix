import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SalaryGradeRow } from '../lib/api/salaryGrades';
import { SalaryGradesPage } from './SalaryGradesPage';

vi.mock('./AdminHeader', () => ({ AdminHeader: () => null }));
vi.mock('./Sidebar', () => ({ Sidebar: () => null }));
vi.mock('../lib/supabase', () => ({ supabase: {} }));

const listSalaryGrades = vi.fn();
vi.mock('../lib/api/salaryGrades', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api/salaryGrades')>()),
  listSalaryGrades: () => listSalaryGrades(),
}));

/** The full CSC schedule: SG 1–33, Step 1 only. */
const schedule: SalaryGradeRow[] = Array.from({ length: 33 }, (_, i) => {
  const grade = i + 1;
  const amount = 10000 + grade * 1000;
  return {
    salaryGrade: grade,
    steps: [{ salaryGrade: grade, step: 1, monthlySalary: amount, updatedAt: null }],
    hiringRate: amount,
    lastUpdated: null,
  };
});

const gradesShown = () =>
  screen.getAllByRole('rowheader').map((cell) => cell.textContent);

describe('SalaryGradesPage pagination', () => {
  beforeEach(() => {
    listSalaryGrades.mockResolvedValue({ ok: true, data: schedule });
  });

  it('shows the first 10 grades and the entries count', async () => {
    render(<SalaryGradesPage />);

    expect(await screen.findByText('SG 1')).toBeInTheDocument();
    expect(gradesShown()).toEqual(Array.from({ length: 10 }, (_, i) => `SG ${i + 1}`));
    expect(screen.getByText('Showing 1–10 of 33 entries')).toBeInTheDocument();

    const pager = screen.getByRole('navigation', { name: 'Salary grade pages' });
    expect(within(pager).getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(within(pager).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(within(pager).queryByRole('button', { name: 'Page 5' })).not.toBeInTheDocument();
  });

  it('moves between pages with Next and the page numbers', async () => {
    render(<SalaryGradesPage />);
    await screen.findByText('SG 1');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(gradesShown()[0]).toBe('SG 11');
    expect(screen.getByText('Showing 11–20 of 33 entries')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(gradesShown()).toEqual(['SG 31', 'SG 32', 'SG 33']);
    expect(screen.getByText('Showing 31–33 of 33 entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('hides the pager when the schedule fits on one page', async () => {
    listSalaryGrades.mockResolvedValue({ ok: true, data: schedule.slice(0, 10) });
    render(<SalaryGradesPage />);
    await screen.findByText('SG 1');

    expect(screen.queryByRole('navigation', { name: 'Salary grade pages' })).not.toBeInTheDocument();
  });
});
