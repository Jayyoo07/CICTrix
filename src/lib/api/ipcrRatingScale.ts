/**
 * What each IPCR rating means (PM/IPCR spec §G).
 *
 * The definitions are the PM Administrator's to set, so they live in
 * `ipcr_rating_scale` rather than in the code. This module is the only way in
 * and out of that table.
 *
 * `DEFAULT_RATING_SCALE` is the fallback, not a duplicate of the seed. An
 * employee filling in Phase 2 must always see what the numbers mean, and that
 * cannot depend on a configuration row existing or the table being readable —
 * an empty legend beside a required field is worse than no legend, because it
 * reads as a fault rather than as an explanation.
 */

import { supabase as supabaseClient } from '../supabase';

const supabase = supabaseClient as any;

export interface RatingScaleEntry {
  rating: number;
  label: string;
  description: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** Section G's own example wording. Used when the table has nothing to say. */
export const DEFAULT_RATING_SCALE: RatingScaleEntry[] = [
  {
    rating: 5,
    label: 'Outstanding',
    description:
      'Accomplishment significantly exceeds the established target, or demonstrates exceptional accomplishment.',
  },
  { rating: 4, label: 'Very Satisfactory', description: 'Accomplishment exceeds the expected target.' },
  { rating: 3, label: 'Satisfactory', description: 'Accomplishment meets the expected target.' },
  { rating: 2, label: 'Unsatisfactory', description: 'Accomplishment partially met the expected target.' },
  { rating: 1, label: 'Poor', description: 'Accomplishment did not meet the expected target.' },
];

const fromRow = (r: any): RatingScaleEntry => ({
  rating: Number(r.rating),
  label: String(r.label ?? ''),
  description: String(r.description ?? ''),
});

/** Highest rating first, matching how the scale is read. */
const byRatingDesc = (a: RatingScaleEntry, b: RatingScaleEntry) => b.rating - a.rating;

/**
 * The configured scale, or the built-in wording when none is available.
 *
 * Never fails: the caller renders a legend beside a field the employee has to
 * fill in, and has nothing useful to do with an error.
 */
export async function getRatingScale(): Promise<RatingScaleEntry[]> {
  try {
    const { data, error } = await supabase.from('ipcr_rating_scale').select('rating, label, description');
    if (error) return DEFAULT_RATING_SCALE;
    const rows = (data ?? []).map(fromRow).filter((r: RatingScaleEntry) => Number.isFinite(r.rating));
    if (rows.length === 0) return DEFAULT_RATING_SCALE;
    return rows.sort(byRatingDesc);
  } catch {
    return DEFAULT_RATING_SCALE;
  }
}

/** The same list for the PM editor, which does need to know about failure. */
export async function listRatingScale(): Promise<Result<RatingScaleEntry[]>> {
  try {
    const { data, error } = await supabase.from('ipcr_rating_scale').select('rating, label, description');
    if (error) return { ok: false, error: error.message ?? 'Failed to load the rating scale.' };
    return { ok: true, data: (data ?? []).map(fromRow).sort(byRatingDesc) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateRatingScaleEntry(entry: RatingScaleEntry): Promise<Result<RatingScaleEntry>> {
  const label = entry.label.trim();
  const description = entry.description.trim();
  if (!label) return { ok: false, error: 'A rating needs a label.' };
  if (!description) {
    // The description is the entire point of §G; saving an empty one would
    // leave the employee guessing again while the screen reported success.
    return { ok: false, error: 'A rating needs a description — this is what the employee reads.' };
  }

  try {
    const { data, error } = await supabase
      .from('ipcr_rating_scale')
      .upsert({ rating: entry.rating, label, description }, { onConflict: 'rating' })
      .select()
      .single();
    if (error) return { ok: false, error: error.message ?? 'Failed to save the rating.' };
    return { ok: true, data: fromRow(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
