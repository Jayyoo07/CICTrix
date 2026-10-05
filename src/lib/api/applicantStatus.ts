/**
 * The applicant selection workflow — one source of truth.
 *
 * Before this, three things disagreed about what an applicant's status meant:
 * the ApplicantStatus union in recruitment.types.ts, the values actually stored
 * in the database, and a substring matcher in the RSP dashboard that existed to
 * paper over the gap. Live data carried 'Hired', 'Reviewed' and 'Pending', none
 * of which were in the union, and the dashboard's "Qualified" count was really
 * `status.includes('recommended')`.
 *
 * That ambiguity is the reason for this module. "Qualified" in particular now
 * has one meaning — passed the complete selection process — rather than being
 * inferred from whatever string happened to be stored.
 *
 * The flow, per the RSP specification:
 *
 *   Submitted
 *     -> Under Initial Screening
 *       -> Pending                     (correction or resubmission required)
 *       -> Shortlisted                 (awaiting interview/exam schedule)
 *         -> Interview/Exam Scheduled
 *           -> For Evaluation
 *             -> Qualified             (passed the complete process)
 *               -> Selected
 *
 * Ending anywhere: Disqualified (failed, or failed to attend) or Not Selected
 * (someone else was appointed).
 */

export const APPLICANT_STATUSES = [
  'Submitted',
  'Under Initial Screening',
  'Pending',
  'Shortlisted',
  'Interview/Exam Scheduled',
  'For Evaluation',
  'Qualified',
  'Selected',
  'Disqualified',
  'Not Selected',
] as const;

export type ApplicantWorkflowStatus = (typeof APPLICANT_STATUSES)[number];

/** Nothing follows a terminal status; the application is closed. */
export const TERMINAL_STATUSES: ApplicantWorkflowStatus[] = ['Selected', 'Disqualified', 'Not Selected'];

export const isTerminal = (s: ApplicantWorkflowStatus): boolean => TERMINAL_STATUSES.includes(s);

/**
 * What the applicant sees in the status tracker.
 *
 * Written for the applicant, not the office: no internal reasoning, no mention
 * of other candidates beyond the fact that the post was filled, and an action
 * where there is one to take.
 */
export const APPLICANT_MESSAGES: Record<ApplicantWorkflowStatus, string> = {
  Submitted: 'Your application has been received.',
  'Under Initial Screening': 'Your application is being reviewed against the position requirements.',
  Pending:
    'Your application is currently pending. Please resubmit the required document or information indicated by the RSP Office.',
  Shortlisted: 'You have passed the initial screening. Waiting for interview/examination schedule.',
  'Interview/Exam Scheduled': 'Your interview/examination has been scheduled. Please see the details below.',
  'For Evaluation': 'Your interview/examination results are being evaluated.',
  Qualified: 'You have successfully completed the selection process and are qualified for this position.',
  Selected: 'Congratulations. You have been selected for this position.',
  Disqualified: 'We regret to inform you that your application has been disqualified.',
  'Not Selected': 'We regret to inform you that you were not selected for this position.',
} as const;

/**
 * Reasons an applicant can be disqualified, recorded alongside the status.
 *
 * Failure to attend is called out separately because the specification asks for
 * it by name and because it carries different evidence — the scheduled activity
 * and its date — than a qualification failure does.
 */
export const DISQUALIFICATION_REASONS = [
  'Failure to attend scheduled interview/examination',
  'Failed to meet qualification requirements',
  'Withdrew application',
  'Other documented reason',
] as const;

export type DisqualificationReason = (typeof DISQUALIFICATION_REASONS)[number];

/**
 * Legacy and live values mapped onto the workflow.
 *
 * Every value observed in production is covered. Two mappings are judgement
 * calls worth stating:
 *
 *   'Recommended for Hiring' -> Qualified. It meant "cleared evaluation, not yet
 *   appointed", which is what Qualified now means. The dashboard already
 *   counted it as qualified, so this preserves the number HR sees.
 *
 *   'New Application' -> Submitted. It is the entry state under another name.
 *
 * Matching is case- and space-insensitive so stray capitalisation does not fall
 * through to the default.
 */
const LEGACY_MAP: Record<string, ApplicantWorkflowStatus> = {
  // Observed in production
  'new application': 'Submitted',
  submitted: 'Submitted',
  'under review': 'Under Initial Screening',
  reviewed: 'Under Initial Screening',
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  'recommended for hiring': 'Qualified',
  hired: 'Selected',
  'not qualified': 'Disqualified',

  // Present in the old union or elsewhere in the codebase
  'for interview': 'Interview/Exam Scheduled',
  'interview scheduled': 'Interview/Exam Scheduled',
  'interview completed': 'For Evaluation',
  'for deliberation': 'For Evaluation',
  'for evaluation': 'For Evaluation',
  scheduled: 'Interview/Exam Scheduled',
  qualified: 'Qualified',
  selected: 'Selected',
  rejected: 'Not Selected',
  'not selected': 'Not Selected',
  disqualified: 'Disqualified',
  withdrawn: 'Disqualified',
  'document verified': 'Under Initial Screening',
  'action required': 'Pending',
};

/**
 * Resolve any stored value to a workflow status.
 *
 * Returns null rather than guessing when a value is unrecognised. A caller that
 * silently defaulted to 'Submitted' would quietly resurrect closed applications
 * and misreport the pipeline — the same class of bug the substring matcher
 * caused. An unmapped value should be visible, not absorbed.
 */
export function normalizeStatus(raw: string | null | undefined): ApplicantWorkflowStatus | null {
  const key = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return null;
  if ((APPLICANT_STATUSES as readonly string[]).includes(raw as string)) {
    return raw as ApplicantWorkflowStatus;
  }
  return LEGACY_MAP[key] ?? null;
}

/**
 * Which statuses may follow a given one.
 *
 * Pending returns to screening rather than jumping forward: a corrected
 * application is re-screened, not waved through on the strength of having been
 * fixed. Disqualified and Not Selected are reachable from any live status,
 * because an applicant can withdraw or the post can be filled at any point.
 */
const TRANSITIONS: Record<ApplicantWorkflowStatus, ApplicantWorkflowStatus[]> = {
  Submitted: ['Under Initial Screening'],
  'Under Initial Screening': ['Pending', 'Shortlisted'],
  Pending: ['Under Initial Screening'],
  Shortlisted: ['Interview/Exam Scheduled'],
  'Interview/Exam Scheduled': ['For Evaluation'],
  'For Evaluation': ['Qualified'],
  Qualified: ['Selected'],
  Selected: [],
  Disqualified: [],
  'Not Selected': [],
};

/** Endings reachable from any status that is not already terminal. */
const ALWAYS_AVAILABLE: ApplicantWorkflowStatus[] = ['Disqualified', 'Not Selected'];

export function nextStatuses(from: ApplicantWorkflowStatus): ApplicantWorkflowStatus[] {
  if (isTerminal(from)) return [];
  return [...TRANSITIONS[from], ...ALWAYS_AVAILABLE];
}

export function canTransition(from: ApplicantWorkflowStatus, to: ApplicantWorkflowStatus): boolean {
  return nextStatuses(from).includes(to);
}

/**
 * Pipeline bucket for dashboard counts.
 *
 * Derived from the normalised status rather than by matching substrings, which
 * is what previously counted "Not Qualified" as qualified and dropped everyone
 * who was Hired out of the funnel entirely.
 */
export type FunnelBucket = 'pending' | 'screening' | 'assessment' | 'qualified' | 'selected' | 'closed';

export function funnelBucket(status: ApplicantWorkflowStatus): FunnelBucket {
  switch (status) {
    case 'Submitted':
      return 'pending';
    case 'Under Initial Screening':
    case 'Pending':
      return 'screening';
    case 'Shortlisted':
    case 'Interview/Exam Scheduled':
    case 'For Evaluation':
      return 'assessment';
    case 'Qualified':
      return 'qualified';
    case 'Selected':
      return 'selected';
    case 'Disqualified':
    case 'Not Selected':
      return 'closed';
  }
}
