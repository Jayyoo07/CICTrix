import { describe, expect, it } from 'vitest';
import { REQUIRED_TRAININGS_PER_YEAR, trainingCompliance } from './trainingCompliance';

const NOW = new Date('2026-10-14T10:00:00+08:00');

const emp = (id: string, department = 'MPDO', name = `Employee ${id}`) => ({ id, name, position: 'Admin Aide', department });

const ev = (
  startDate: string,
  attendees: { employeeId: string; attendanceStatus: 'Present' | 'Absent' | 'Excused' | null }[],
  status: any = 'Scheduled',
) => ({ startDate, endDate: null, status, attendees });

const present = (employeeId: string) => ({ employeeId, attendanceStatus: 'Present' as const });

describe('trainingCompliance', () => {
  it('requires two trainings a year', () => {
    expect(REQUIRED_TRAININGS_PER_YEAR).toBe(2);
  });

  it('counts only finished trainings the employee was marked Present for', () => {
    const r = trainingCompliance(
      [emp('a'), emp('b'), emp('c')],
      [
        ev('2026-02-01T00:00:00Z', [present('a'), present('b'), { employeeId: 'c', attendanceStatus: 'Absent' }]),
        ev('2026-03-01T00:00:00Z', [present('a'), { employeeId: 'b', attendanceStatus: null }]),
        ev('2026-12-01T00:00:00Z', [present('b')]), // not finished yet
        ev('2026-04-01T00:00:00Z', [present('c')], 'Cancelled'),
      ],
      NOW,
    );
    const byId = Object.fromEntries(r.employees.map((e) => [e.id, e.completed]));
    expect(byId).toEqual({ a: 2, b: 1, c: 0 });
    expect([r.met, r.partial, r.none, r.total]).toEqual([1, 1, 1, 3]);
  });

  it('counts a training once even if the employee is on its roster twice', () => {
    const r = trainingCompliance([emp('a')], [ev('2026-02-01T00:00:00Z', [present('a'), present('a')])], NOW);
    expect(r.employees[0].completed).toBe(1);
  });

  it('ignores attendees who are not in the employee list', () => {
    const r = trainingCompliance([emp('a')], [ev('2026-02-01T00:00:00Z', [present('x')])], NOW);
    expect(r.total).toBe(1);
    expect(r.none).toBe(1);
  });

  it('lists employees who still need training first, fewest trainings first', () => {
    const r = trainingCompliance(
      [emp('a', 'MPDO', 'Cruz'), emp('b', 'MPDO', 'Abad'), emp('c', 'MPDO', 'Bato')],
      [ev('2026-02-01T00:00:00Z', [present('a')])],
      NOW,
    );
    expect(r.employees.map((e) => e.name)).toEqual(['Abad', 'Bato', 'Cruz']);
  });

  it('breaks the result down by department, most compliant first', () => {
    const r = trainingCompliance(
      [emp('a', 'HRMO'), emp('b', 'HRMO'), emp('c', 'MPDO')],
      [
        ev('2026-02-01T00:00:00Z', [present('c')]),
        ev('2026-03-01T00:00:00Z', [present('c'), present('a')]),
      ],
      NOW,
    );
    expect(r.byDepartment).toEqual([
      { department: 'MPDO', total: 1, met: 1, partial: 0, none: 0, percentMet: 100 },
      { department: 'HRMO', total: 2, met: 0, partial: 1, none: 1, percentMet: 0 },
    ]);
  });

  it('returns zeros for an empty employee list', () => {
    const r = trainingCompliance([], [], NOW);
    expect([r.met, r.partial, r.none, r.total, r.byDepartment.length]).toEqual([0, 0, 0, 0, 0]);
  });
});
