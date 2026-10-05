/**
 * The employee-side IPCR phase gate.
 *
 * Whether an employee may encode targets (Phase 1) or accomplishments (Phase 2)
 * is decided by one `phase_schedules` row: the office override if their office
 * has one, otherwise the system default. PM flips it from IPCR Management.
 *
 * This exists because the employee page resolved that row in two places and the
 * two did not agree. The initial load applied the office override; the realtime
 * refresh read `scope = 'system'` only, so any realtime event silently replaced
 * an office's schedule with the system one — an office sitting in Phase 1 while
 * the system was in Phase 2 would flip to Phase 2 the moment anything changed,
 * and flip back on the next full reload. One resolver, used by both.
 *
 * The gate is also not allowed to depend on a realtime event arriving. Those
 * are best-effort: a dropped socket, a backgrounded tab or a publication that
 * was never applied all end the same way — PM presses Open, the employee's page
 * keeps saying Closed, and only a manual refresh fixes it. Callers poll this.
 */

import { supabase as supabaseClient } from '../supabase';
import { effectiveState, type PhaseKey, type PhaseSchedule } from './phaseSchedules';

const supabase = supabaseClient as any;

export interface PhaseGate {
  target: PhaseSchedule | null;
  rating: PhaseSchedule | null;
}

export const EMPTY_PHASE_GATE: PhaseGate = { target: null, rating: null };

/**
 * The employee's office id, for matching an override.
 *
 * `employees.department` is a name, not an id, so this is a two-hop lookup. It
 * is cached for the session: an employee's office does not change while they
 * have the page open, and the gate is polled.
 */
const officeIdCache = new Map<string, string | null>();

export async function resolveOfficeId(employeeId: string | null): Promise<string | null> {
  if (!employeeId) return null;
  if (officeIdCache.has(employeeId)) return officeIdCache.get(employeeId) ?? null;
  try {
    const { data: empRow } = await supabase
      .from('employees_with_department')
      .select('department')
      .eq('id', employeeId)
      .maybeSingle();
    const officeName = String(empRow?.department ?? '').trim();
    if (!officeName) {
      officeIdCache.set(employeeId, null);
      return null;
    }
    const { data: dep } = await supabase.from('departments').select('id').eq('name', officeName).maybeSingle();
    const id = dep?.id ? String(dep.id) : null;
    officeIdCache.set(employeeId, id);
    return id;
  } catch {
    // Not cached: a failed lookup is a transient condition, and caching null
    // would make every later poll resolve the system row for an office that
    // does have an override.
    return null;
  }
}

/**
 * Pick the row that governs one phase: office override first, system second.
 *
 * Exported so it can be tested without a database, which is the only way to
 * pin the override precedence that the two divergent copies got wrong.
 */
export function pickSchedule(rows: PhaseSchedule[], officeId: string | null, phase: PhaseKey): PhaseSchedule | null {
  if (officeId) {
    const override = rows.find((r) => r.scope === 'office' && String(r.office_id) === officeId && r.phase === phase);
    if (override) return override;
  }
  return rows.find((r) => r.scope === 'system' && r.phase === phase) ?? null;
}

/** Both phase rows for this employee, overrides applied. */
export async function fetchPhaseGate(employeeId: string | null): Promise<PhaseGate> {
  const officeId = await resolveOfficeId(employeeId);
  const query = supabase
    .from('phase_schedules')
    .select('*')
    .or(officeId ? `scope.eq.system,office_id.eq.${officeId}` : 'scope.eq.system');
  const { data, error } = await query;
  if (error) throw new Error(error.message ?? 'Failed to load phase schedules.');
  const rows: PhaseSchedule[] = Array.isArray(data) ? data : [];
  return {
    target: pickSchedule(rows, officeId, 'target_setting'),
    rating: pickSchedule(rows, officeId, 'rating'),
  };
}

/**
 * Whether a resolved row is currently open.
 *
 * A missing row means closed, not open. PM has to open a phase deliberately;
 * defaulting an absent schedule to open would let employees submit into a cycle
 * nobody started.
 */
export function isPhaseOpen(row: PhaseSchedule | null): boolean {
  return effectiveState(row) === 'Open';
}

/** Two gates are the same when both phases resolve to the same effective state. */
export function sameGateState(a: PhaseGate, b: PhaseGate): boolean {
  return isPhaseOpen(a.target) === isPhaseOpen(b.target) && isPhaseOpen(a.rating) === isPhaseOpen(b.rating);
}
