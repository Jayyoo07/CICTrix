/**
 * Applicants API — RSP corrections to an applicant's submitted details.
 *
 * Column names match what the application form writes (ApplicantWizard):
 * education attainment is stored as `education_level`, experience as
 * `years_of_experience` (decimal years).
 */

import { supabase as supabaseClient } from '../../lib/supabase';

const supabase = supabaseClient as any;

export interface ApplicantDetailsPatch {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  contact_number: string;
  address: string;
  is_pwd: boolean;
  education_level: string | null;
  education_degree: string | null;
  education_school: string | null;
  years_of_experience: number | null;
}

export async function updateApplicantDetails(
  applicantId: string,
  patch: ApplicantDetailsPatch,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applicants')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', applicantId);
    if (error) return { ok: false, error: error.message ?? 'Failed to save applicant details.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
