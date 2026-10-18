/**
 * The CSC salary schedule (SG 1–33, steps 1–8).
 *
 * Every salary amount in the system comes from `salary_grades`. Job posts and
 * plantilla items carry only a grade and always use **Step 1**, the CSC hiring
 * rate; steps 2–8 are the rest of the schedule, kept for reference and for step
 * increments later.
 *
 * This module is the only place that queries the table — components never read
 * it inline — so there is one definition of what "the salary for SG 11" means.
 *
 * Editing a Step 1 amount rewrites `monthly_salary` on every job post and
 * plantilla item at that grade (decision D1). That happens in a database
 * trigger, not here, so it holds for any writer: a script, the SQL editor, or a
 * screen built later that forgets to call this module.
 */

import { supabase as supabaseClient } from '../supabase';

const supabase = supabaseClient as any;

/** The CSC schedule runs 1–33. */
export const MIN_SALARY_GRADE = 1;
export const MAX_SALARY_GRADE = 33;

/** Steps within a grade. Step 1 is the hiring rate. */
export const MIN_STEP = 1;
export const MAX_STEP = 8;

/** The step a job post's salary is taken from. */
export const HIRING_STEP = 1;

export interface SalaryStep {
  salaryGrade: number;
  step: number;
  monthlySalary: number;
  updatedAt: string | null;
}

/** One grade with every step configured for it, lowest step first. */
export interface SalaryGradeRow {
  salaryGrade: number;
  steps: SalaryStep[];
  /** Step 1's amount, or null when the grade has no Step 1 row. */
  hiringRate: number | null;
  /** Most recent updated_at across this grade's steps. */
  lastUpdated: string | null;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fromRow = (r: any): SalaryStep => ({
  salaryGrade: Number(r.salary_grade),
  step: Number(r.step),
  monthlySalary: Number(r.monthly_salary),
  updatedAt: r.updated_at ? String(r.updated_at) : null,
});

/**
 * Group flat step rows into one entry per grade.
 *
 * Exported so the grouping can be tested without a database — it is the shape
 * the Salary Grades table renders from.
 */
export function groupSteps(rows: SalaryStep[]): SalaryGradeRow[] {
  const byGrade = new Map<number, SalaryStep[]>();
  for (const r of rows) {
    if (!Number.isFinite(r.salaryGrade)) continue;
    const list = byGrade.get(r.salaryGrade) ?? [];
    list.push(r);
    byGrade.set(r.salaryGrade, list);
  }

  return [...byGrade.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([salaryGrade, steps]) => {
      const sorted = [...steps].sort((a, b) => a.step - b.step);
      const stepOne = sorted.find((s) => s.step === HIRING_STEP);
      const stamps = sorted.map((s) => s.updatedAt).filter(Boolean) as string[];
      return {
        salaryGrade,
        steps: sorted,
        hiringRate: stepOne ? stepOne.monthlySalary : null,
        lastUpdated: stamps.length ? stamps.sort()[stamps.length - 1] : null,
      };
    });
}

/**
 * Has the table not been created yet?
 *
 * PostgREST answers a query against a missing table with PGRST205 and "Could
 * not find the table ... in the schema cache". That is a deployment state, not
 * a fault: the migration has not run. Callers show the "run the migration"
 * empty state for it instead of surfacing the raw message, which reads as a
 * broken page to an admin who has done nothing wrong.
 */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code ?? '');
  const msg = String(error.message ?? '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    (msg.includes('could not find the table') && msg.includes('salary_grades'))
  );
}

/**
 * Was the write refused for permission reasons rather than bad input?
 *
 * The schedule is writable only by super admins, enforced by RLS. Postgres
 * reports that as "new row violates row-level security policy" on an insert,
 * and as a zero-row result on an update — neither tells an admin anything they
 * can act on, and the first reads as a bug in the form, which is how it was
 * first reported.
 */
export function isNotPermitted(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code ?? '');
  const msg = String(error.message ?? '').toLowerCase();
  return (
    code === '42501' ||
    code === 'PGRST116' ||          // update matched no row: RLS filtered it out
    msg.includes('row-level security')
  );
}

/**
 * Shown instead of the Postgres wording. It names the two things that actually
 * cause this — the account, and a signed-out session — because the second is
 * invisible: the portal keeps showing "Super Admin" from its own stored session
 * long after the Supabase token behind the request has gone.
 */
const NOT_PERMITTED_MESSAGE =
  'The database refused this change. Only a super admin can edit the salary schedule, and that is checked against your Supabase sign-in rather than the portal session shown in the header. Sign out and back in; if it persists, the account is not registered as a super admin.';

export async function listSalaryGrades(): Promise<Result<SalaryGradeRow[]>> {
  try {
    const { data, error } = await supabase
      .from('salary_grades')
      .select('salary_grade, step, monthly_salary, updated_at')
      .order('salary_grade', { ascending: true })
      .order('step', { ascending: true });
    if (error) {
      // Not migrated yet: report it as an empty schedule so the page shows the
      // "run migration 20261013" state rather than a PostgREST cache error.
      if (isMissingTable(error)) return { ok: true, data: [] };
      return { ok: false, error: error.message ?? 'Failed to load the salary schedule.' };
    }
    return { ok: true, data: groupSteps((data ?? []).map(fromRow)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Shared validation, so every write path rejects the same things. */
function validate(grade: number, step: number, monthlySalary: number): string | null {
  if (!Number.isInteger(grade) || grade < MIN_SALARY_GRADE || grade > MAX_SALARY_GRADE) {
    return `Salary grade must be a whole number between ${MIN_SALARY_GRADE} and ${MAX_SALARY_GRADE}.`;
  }
  if (!Number.isInteger(step) || step < MIN_STEP || step > MAX_STEP) {
    return `Step must be a whole number between ${MIN_STEP} and ${MAX_STEP}.`;
  }
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
    return 'Monthly salary must be greater than zero.';
  }
  return null;
}

/**
 * Is there still a Supabase sign-in behind this request?
 *
 * The portal's own session lives in localStorage and keeps showing "Super
 * Admin" long after the Supabase token has expired. Every write then fails in
 * the database, which from the screen looks like the form being broken. Asking
 * first turns an unexplainable refusal into "sign in again".
 */
async function requireSession(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      return 'Your sign-in has expired, so the database sees this request as anonymous. Sign out and sign in again, then retry.';
    }
    return null;
  } catch {
    // Can't tell — let the write proceed and report whatever the database says,
    // rather than blocking an edit on a check that itself failed.
    return null;
  }
}

export async function updateSalaryStep(
  grade: number,
  step: number,
  monthlySalary: number,
): Promise<Result<SalaryStep>> {
  const invalid = validate(grade, step, monthlySalary);
  if (invalid) return { ok: false, error: invalid };

  const noSession = await requireSession();
  if (noSession) return { ok: false, error: noSession };

  try {
    const { data, error } = await supabase
      .from('salary_grades')
      .update({ monthly_salary: monthlySalary })
      .eq('salary_grade', grade)
      .eq('step', step)
      .select()
      .single();
    if (error) {
      if (isNotPermitted(error)) return { ok: false, error: NOT_PERMITTED_MESSAGE };
      return { ok: false, error: error.message ?? 'Failed to save the amount.' };
    }
    return { ok: true, data: fromRow(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function addSalaryStep(
  grade: number,
  step: number,
  monthlySalary: number,
): Promise<Result<SalaryStep>> {
  const invalid = validate(grade, step, monthlySalary);
  if (invalid) return { ok: false, error: invalid };

  const noSession = await requireSession();
  if (noSession) return { ok: false, error: noSession };

  try {
    const { data, error } = await supabase
      .from('salary_grades')
      .insert([{ salary_grade: grade, step, monthly_salary: monthlySalary }])
      .select()
      .single();
    if (error) {
      if (isNotPermitted(error)) return { ok: false, error: NOT_PERMITTED_MESSAGE };
      return { ok: false, error: error.message ?? 'Failed to add the step.' };
    }
    return { ok: true, data: fromRow(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteSalaryStep(grade: number, step: number): Promise<Result<true>> {
  const noSession = await requireSession();
  if (noSession) return { ok: false, error: noSession };

  if (step === HIRING_STEP) {
    // Also refused by the RLS delete policy. Checked here too so the message
    // says why, rather than surfacing a bare permission error.
    return { ok: false, error: 'Step 1 cannot be removed — every job post at this grade uses its amount.' };
  }
  try {
    const { error } = await supabase
      .from('salary_grades')
      .delete()
      .eq('salary_grade', grade)
      .eq('step', step);
    if (error) {
      if (isNotPermitted(error)) return { ok: false, error: NOT_PERMITTED_MESSAGE };
      return { ok: false, error: error.message ?? 'Failed to remove the step.' };
    }
    return { ok: true, data: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Step 1's amount for a grade, or null when it is not in the table. */
export function stepOneSalaryFor(grade: number | null | undefined, table: SalaryGradeRow[]): number | null {
  if (grade == null || !Number.isFinite(Number(grade))) return null;
  const row = table.find((r) => r.salaryGrade === Number(grade));
  return row?.hiringRate ?? null;
}

/** Peso amount as HR reads it: ₱31,705 — whole pesos, no decimals. */
export function formatSalary(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  return `₱${Number(amount).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

/**
 * The salary grade of an employee's position (decision D3).
 *
 * Resolved the same way succession ranks employees: `position_id` first, then
 * the position title matched against `positions.name`, ignoring case and
 * surrounding space. The title fallback exists because `employees.position` is
 * free text and `position_id` is mostly empty.
 *
 * Returns null rather than 0 when nothing matches. A missing grade is not grade
 * zero, and the caller has to be able to say "none on file".
 */
export function salaryGradeForEmployee(
  employee: { positionId?: string | null; position?: string | null } | null | undefined,
  positions: { id: string; name: string; salaryGrade: number | null }[],
): number | null {
  if (!employee) return null;

  const byId = employee.positionId
    ? positions.find((p) => String(p.id) === String(employee.positionId))
    : undefined;
  if (byId && byId.salaryGrade != null) return byId.salaryGrade;

  const title = String(employee.position ?? '').trim().toLowerCase();
  if (!title) return null;

  // The same title can exist under several departments — the SRP seed notes
  // this, and their grades agree far more often than not. Prefer a match that
  // actually carries a grade: taking the first name match regardless would
  // return null whenever an untagged duplicate happened to sort first, and
  // report "no grade on file" for a position that has one.
  const named = positions.filter((p) => String(p.name ?? '').trim().toLowerCase() === title);
  const withGrade = named.find((p) => p.salaryGrade != null);
  return withGrade?.salaryGrade ?? null;
}

/** Positions with their grades, for salaryGradeForEmployee. */
export async function listPositionSalaryGrades(): Promise<
  Result<{ id: string; name: string; salaryGrade: number | null }[]>
> {
  try {
    const { data, error } = await supabase.from('positions').select('id, name, salary_grade');
    if (error) {
      // An employee filling in their IDP must not be blocked because a lookup
      // table is missing; the field falls back to "no grade on file".
      if (isMissingTable(error)) return { ok: true, data: [] };
      return { ok: false, error: error.message ?? 'Failed to load positions.' };
    }
    return {
      ok: true,
      data: (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        salaryGrade: r.salary_grade == null ? null : Number(r.salary_grade),
      })),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
