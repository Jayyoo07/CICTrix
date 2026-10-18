import { describe, expect, it } from 'vitest';
import {
  HIRING_STEP,
  formatSalaryRange,
  stepRangeFor,
  isMissingTable,
  MAX_SALARY_GRADE,
  MIN_SALARY_GRADE,
  formatSalary,
  groupSteps,
  salaryGradeForEmployee,
  stepOneSalaryFor,
  type SalaryStep,
} from './salaryGrades';

const step = (salaryGrade: number, s: number, monthlySalary: number, updatedAt: string | null = null): SalaryStep =>
  ({ salaryGrade, step: s, monthlySalary, updatedAt });

describe('groupSteps', () => {
  it('groups flat rows by grade, lowest grade and step first', () => {
    const rows = groupSteps([
      step(11, 2, 32500),
      step(1, 1, 14634),
      step(11, 1, 31705),
    ]);
    expect(rows.map((r) => r.salaryGrade)).toEqual([1, 11]);
    expect(rows[1].steps.map((s) => s.step)).toEqual([1, 2]);
  });

  it('exposes Step 1 as the hiring rate', () => {
    const [row] = groupSteps([step(11, 1, 31705), step(11, 3, 34000)]);
    expect(row.hiringRate).toBe(31705);
  });

  it('reports no hiring rate when Step 1 is absent', () => {
    // A grade with only higher steps cannot price a job post. null says so;
    // falling back to another step would quietly advertise the wrong salary.
    const [row] = groupSteps([step(11, 2, 32500)]);
    expect(row.hiringRate).toBeNull();
  });

  it('takes the most recent timestamp across the grade steps', () => {
    const [row] = groupSteps([
      step(11, 1, 31705, '2026-10-01T00:00:00Z'),
      step(11, 2, 32500, '2026-10-09T00:00:00Z'),
    ]);
    expect(row.lastUpdated).toBe('2026-10-09T00:00:00Z');
  });

  it('survives a row with a non-numeric grade', () => {
    expect(groupSteps([{ ...step(1, 1, 100), salaryGrade: Number('x') }])).toEqual([]);
  });
});

describe('stepOneSalaryFor', () => {
  const table = groupSteps([step(1, 1, 14634), step(11, 1, 31705), step(33, 1, 449157)]);

  it('finds the hiring rate for a grade', () => {
    expect(stepOneSalaryFor(11, table)).toBe(31705);
    expect(stepOneSalaryFor(MIN_SALARY_GRADE, table)).toBe(14634);
    expect(stepOneSalaryFor(MAX_SALARY_GRADE, table)).toBe(449157);
  });

  it('returns null for a grade that is not in the schedule', () => {
    // Not 0: a grade with no amount must not price a posting at nothing.
    expect(stepOneSalaryFor(12, table)).toBeNull();
    expect(stepOneSalaryFor(null, table)).toBeNull();
    expect(stepOneSalaryFor(undefined, table)).toBeNull();
  });

  it('accepts a grade stored as a string, which job_postings does in some environments', () => {
    expect(stepOneSalaryFor('11' as unknown as number, table)).toBe(31705);
  });
});

describe('salaryGradeForEmployee (D3)', () => {
  const positions = [
    { id: 'p1', name: 'Computer Programmer II', salaryGrade: 15 },
    { id: 'p2', name: 'Administrative Aide IV', salaryGrade: 4 },
    { id: 'p3', name: 'Project Manager', salaryGrade: null },
  ];

  it('matches on position_id first', () => {
    expect(salaryGradeForEmployee({ positionId: 'p1', position: 'something else' }, positions)).toBe(15);
  });

  it('falls back to the position title, ignoring case and space', () => {
    // employees.position is free text and position_id is mostly empty, so this
    // fallback is the path most employees actually take.
    expect(salaryGradeForEmployee({ position: '  computer programmer ii ' }, positions)).toBe(15);
  });

  it('returns null when the position has no grade on file', () => {
    // Distinct from grade 0, which is not a grade. The form says "none on file".
    expect(salaryGradeForEmployee({ positionId: 'p3', position: 'Project Manager' }, positions)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(salaryGradeForEmployee({ position: 'Not A Real Position' }, positions)).toBeNull();
    expect(salaryGradeForEmployee({ position: '' }, positions)).toBeNull();
    expect(salaryGradeForEmployee(null, positions)).toBeNull();
  });

  it('falls through to the title when the id matches a position with no grade', () => {
    // An id hit with a null grade must not stop the search: the title may well
    // resolve to a position that does carry one.
    const dupes = [
      { id: 'p3', name: 'Project Manager', salaryGrade: null },
      { id: 'p9', name: 'Project Manager', salaryGrade: 22 },
    ];
    expect(salaryGradeForEmployee({ positionId: 'p3', position: 'Project Manager' }, dupes)).toBe(22);
  });
});

describe('formatSalary', () => {
  it('renders whole pesos with separators', () => {
    expect(formatSalary(31705)).toBe('₱31,705');
    expect(formatSalary(449157)).toBe('₱449,157');
  });

  it('renders an em dash for no amount, never ₱0', () => {
    expect(formatSalary(null)).toBe('—');
    expect(formatSalary(undefined)).toBe('—');
  });
});

describe('the hiring step', () => {
  it('is Step 1', () => {
    // Job posts and plantilla items read this step and no other; the D1 sync
    // trigger fires only for it.
    expect(HIRING_STEP).toBe(1);
  });
});

describe('isMissingTable', () => {
  it('recognises the PostgREST schema-cache error for a table that does not exist', () => {
    // The migration not having run is a deployment state, not a fault. The page
    // shows "run migration 20261013" for it instead of a raw Postgres message.
    expect(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.salary_grades' in the schema cache" })).toBe(true);
    expect(isMissingTable({ message: "Could not find the table 'public.salary_grades' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: '42P01' })).toBe(true);
  });

  it('does not swallow a real failure', () => {
    // A permission error must still surface: it means RLS rejected the caller,
    // which an admin needs to see rather than read as "nothing configured".
    expect(isMissingTable({ code: '42501', message: 'permission denied for table salary_grades' })).toBe(false);
    expect(isMissingTable({ message: 'network error' })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
    expect(isMissingTable(undefined)).toBe(false);
  });
});

describe('stepRangeFor — the minimum and maximum an applicant sees', () => {
  const table = groupSteps([
    step(1, 1, 14634), step(1, 8, 16349),          // both ends set
    step(2, 1, 15522),                              // hiring rate only
    step(3, 1, 16486), step(3, 3, 17200),           // part-entered: 1 and 3
    step(4, 8, 20000),                              // only the ceiling
  ]);

  it('runs from Step 1 to Step 8', () => {
    expect(stepRangeFor(1, table)).toEqual({ min: 14634, max: 16349 });
  });

  it('collapses to one amount when only the hiring rate is set', () => {
    // Every grade looks like this until steps 2-8 are filled in. The caller
    // must show a single figure, not "14,634 - 14,634".
    expect(stepRangeFor(2, table)).toEqual({ min: 15522, max: 15522 });
  });

  it('ignores steps between the two ends', () => {
    // Grade 3 has steps 1 and 3. Reporting 1-3 as the range would advertise a
    // ceiling that is an artefact of part-finished data entry, not the
    // schedule. Step 8 is the ceiling or there is no ceiling yet.
    expect(stepRangeFor(3, table)).toEqual({ min: 16486, max: 16486 });
  });

  it('copes with only the ceiling set', () => {
    expect(stepRangeFor(4, table)).toEqual({ min: 20000, max: 20000 });
  });

  it('returns null for a grade with nothing set, or no grade at all', () => {
    expect(stepRangeFor(99, table)).toBeNull();
    expect(stepRangeFor(null, table)).toBeNull();
    expect(stepRangeFor(undefined, table)).toBeNull();
  });

  it('does not render backwards if Step 8 was mistyped below Step 1', () => {
    const wrong = groupSteps([step(5, 1, 20000), step(5, 8, 15000)]);
    expect(stepRangeFor(5, wrong)).toEqual({ min: 15000, max: 20000 });
  });
});

describe('formatSalaryRange', () => {
  it('shows a range when the ends differ', () => {
    expect(formatSalaryRange(14634, 16349)).toBe('₱14,634 – ₱16,349');
  });

  it('shows one amount when they are the same', () => {
    expect(formatSalaryRange(14634, 14634)).toBe('₱14,634');
  });
});
