/**
 * Who has met the mandated number of trainings this year.
 *
 * A training counts for an employee once it has finished (date-derived, see
 * `effectiveStatus`) and the employee was marked Present on its roster.
 * Unmarked attendance does not count: the dashboard would rather list someone
 * who did attend than hide someone who did not.
 */

import type { AttendanceStatus, CalendarEventStatus } from './api/trainingCalendar';
import { effectiveStatus } from './trainingProgress';

/** Each employee must attend this many trainings per year. */
export const REQUIRED_TRAININGS_PER_YEAR = 2;

type ComplianceEmployee = { id: string; name: string; position: string; department: string };

type ComplianceEvent = {
  startDate: string;
  endDate: string | null;
  status: CalendarEventStatus;
  attendees: { employeeId: string; attendanceStatus: AttendanceStatus | null }[];
};

export type EmployeeCompliance = ComplianceEmployee & { completed: number };

export type DepartmentCompliance = {
  department: string;
  total: number;
  met: number;
  partial: number;
  none: number;
  /** met / total, 0–100. */
  percentMet: number;
};

export type TrainingCompliance = {
  /** Fewest trainings first, then by name. */
  employees: EmployeeCompliance[];
  met: number;
  partial: number;
  none: number;
  total: number;
  /** Highest percentMet first. */
  byDepartment: DepartmentCompliance[];
};

const pct = (n: number, d: number): number => (d > 0 ? Math.round((n / d) * 100) : 0);

export const trainingCompliance = (
  employees: ComplianceEmployee[],
  events: ComplianceEvent[],
  now: Date = new Date(),
): TrainingCompliance => {
  const attended = new Map<string, Set<number>>(employees.map((e) => [e.id, new Set()]));
  events.forEach((ev, i) => {
    if (effectiveStatus(ev, now) !== 'Completed') return;
    for (const a of ev.attendees) {
      if (a.attendanceStatus === 'Present') attended.get(a.employeeId)?.add(i);
    }
  });

  const rows: EmployeeCompliance[] = employees
    .map((e) => ({ ...e, completed: attended.get(e.id)?.size ?? 0 }))
    .sort((a, b) => a.completed - b.completed || a.name.localeCompare(b.name));

  const depts = new Map<string, DepartmentCompliance>();
  let met = 0, partial = 0, none = 0;
  for (const r of rows) {
    const d = depts.get(r.department)
      ?? { department: r.department, total: 0, met: 0, partial: 0, none: 0, percentMet: 0 };
    d.total += 1;
    if (r.completed >= REQUIRED_TRAININGS_PER_YEAR) { d.met += 1; met += 1; }
    else if (r.completed > 0) { d.partial += 1; partial += 1; }
    else { d.none += 1; none += 1; }
    depts.set(r.department, d);
  }
  const byDepartment = [...depts.values()]
    .map((d) => ({ ...d, percentMet: pct(d.met, d.total) }))
    .sort((a, b) => b.percentMet - a.percentMet || a.department.localeCompare(b.department));

  return { employees: rows, met, partial, none, total: rows.length, byDepartment };
};
