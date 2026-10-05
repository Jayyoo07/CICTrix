/**
 * Eligibility types and the points each one contributes (succession spec §D).
 *
 * The spec puts the points in the administrator's hands: "the RSP/HR
 * administrator should be able to configure the points assigned to each
 * eligibility type". So the scale lives in `eligibility_types`, not in code,
 * and this module is the only way in and out of it.
 *
 * Scoring itself is in successionCriteria.ts, which takes the configuration as
 * an argument. That keeps the rules testable without a database.
 */

import { supabase as supabaseClient } from '../supabase';

const supabase = supabaseClient as any;

export interface EligibilityType {
  id: string;
  name: string;
  points: number;
  /** Raw total that earns the full Eligibility weight. Same on every row. */
  pointsForFullMarks: number;
  isActive: boolean;
  sortOrder: number;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fromRow = (r: any): EligibilityType => ({
  id: String(r.id),
  name: String(r.name ?? ''),
  points: Number(r.points ?? 0),
  pointsForFullMarks: Number(r.points_for_full_marks ?? 100),
  isActive: r.is_active !== false,
  sortOrder: Number(r.sort_order ?? 0),
});

export async function listEligibilityTypes(): Promise<Result<EligibilityType[]>> {
  try {
    const { data, error } = await supabase
      .from('eligibility_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) return { ok: false, error: error.message ?? 'Failed to load eligibility types.' };
    return { ok: true, data: (data ?? []).map(fromRow) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function upsertEligibilityType(input: {
  id?: string;
  name: string;
  points: number;
  pointsForFullMarks: number;
  isActive: boolean;
  sortOrder: number;
}): Promise<Result<EligibilityType>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'A type needs a name.' };
  if (!Number.isFinite(input.points) || input.points < 0) {
    return { ok: false, error: 'Points must be zero or more.' };
  }
  if (!Number.isFinite(input.pointsForFullMarks) || input.pointsForFullMarks <= 0) {
    // A cap of zero would divide by zero in the scorer and make every
    // candidate's eligibility score meaningless rather than merely wrong.
    return { ok: false, error: 'Points for full marks must be greater than zero.' };
  }

  const payload = {
    name,
    points: input.points,
    points_for_full_marks: input.pointsForFullMarks,
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };

  try {
    if (input.id) {
      const { data, error } = await supabase
        .from('eligibility_types')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();
      if (error) return { ok: false, error: error.message ?? 'Failed to save the type.' };
      return { ok: true, data: fromRow(data) };
    }
    const { data, error } = await supabase.from('eligibility_types').insert([payload]).select().single();
    if (error) return { ok: false, error: error.message ?? 'Failed to add the type.' };
    return { ok: true, data: fromRow(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The cap applies to every row, so changing it means changing all of them.
 * Writing it per row keeps the configuration in one table instead of adding a
 * single-row settings table beside it.
 */
export async function setPointsForFullMarks(value: number): Promise<Result<number>> {
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: 'Points for full marks must be greater than zero.' };
  }
  try {
    const { error } = await supabase
      .from('eligibility_types')
      .update({ points_for_full_marks: value })
      .not('id', 'is', null);
    if (error) return { ok: false, error: error.message ?? 'Failed to save the cap.' };
    return { ok: true, data: value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteEligibilityType(id: string): Promise<Result<true>> {
  try {
    const { error } = await supabase.from('eligibility_types').delete().eq('id', id);
    if (error) return { ok: false, error: error.message ?? 'Failed to remove the type.' };
    return { ok: true, data: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
