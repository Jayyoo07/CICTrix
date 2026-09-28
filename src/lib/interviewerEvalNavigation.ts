// Shared by the interviewer applicants list and dashboard so "Evaluate" always
// primes the same score setup before opening /interviewer/evaluate/:id.

const SCORE_SETUP_STORAGE_KEY = 'cictrix_rsp_score_setup';

export type ApplicantEvalType = 'Original' | 'Promotional';

export const getApplicantType = (applicant: {
  application_type?: unknown;
  employee_id?: unknown;
}): ApplicantEvalType => {
  const appType = String(applicant.application_type ?? '').trim().toLowerCase();
  const hasEmployeeId = Boolean(applicant.employee_id);
  return appType === 'promotion' || appType === 'promotional' || hasEmployeeId ? 'Promotional' : 'Original';
};

export const storeApplicantTypeForEval = (applicantId: string, type: ApplicantEvalType) => {
  try {
    const raw = localStorage.getItem(SCORE_SETUP_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[applicantId] = type === 'Promotional' ? 'promotional' : 'original';
    localStorage.setItem(SCORE_SETUP_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // best effort
  }
};
