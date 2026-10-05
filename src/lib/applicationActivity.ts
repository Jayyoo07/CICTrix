export const DISQUALIFICATION_REASON_OPTIONS = [
  { value: 'incomplete_documents', label: 'Incomplete Documents' },
  // Named separately from a qualification failure because it carries different
  // evidence — the activity the applicant missed and when it was scheduled —
  // and because the applicant is told something different: they did not fail an
  // assessment, they did not attend one.
  {
    value: 'failure_to_attend',
    label: 'Failure to Attend Scheduled Interview/Examination',
  },
  { value: 'failed_qualifications', label: 'Failed Qualifications' },
  { value: 'failed_interview', label: 'Failed Interview' },
  { value: 'missing_requirements', label: 'Missing Requirements' },
  { value: 'other', label: 'Other' },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DISQUALIFICATION_REASON_OPTIONS.map((option) => [option.value, option.label]),
);

export const getDisqualificationReasonLabel = (value?: string | null): string => {
  const trimmed = value?.trim();
  if (!trimmed) return 'Other';
  if (CATEGORY_LABELS[trimmed]) return CATEGORY_LABELS[trimmed];
  const directMatch = DISQUALIFICATION_REASON_OPTIONS.find((option) => option.label === trimmed);
  if (directMatch) return directMatch.label;
  return trimmed;
};

export const buildDisqualificationActivityDescription = (
  category?: string | null,
  note?: string | null,
  includeCategory = true,
): string => {
  const label = getDisqualificationReasonLabel(category);
  const trimmedNote = note?.trim();

  if (!trimmedNote) return label;
  if (!includeCategory) return trimmedNote;

  return `${label}: ${trimmedNote}`;
};

export const parseDisqualificationReason = (reason?: string | null) => {
  const trimmed = reason?.trim();
  if (!trimmed) {
    return { label: 'Other', note: '', value: null as string | null };
  }

  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex === -1) {
    return { label: getDisqualificationReasonLabel(trimmed), note: '', value: trimmed };
  }

  const label = trimmed.slice(0, separatorIndex).trim();
  const note = trimmed.slice(separatorIndex + 1).trim();
  return {
    label: getDisqualificationReasonLabel(label),
    note,
    value: label,
  };
};

/** The reason that records which scheduled activity the applicant missed. */
export const FAILURE_TO_ATTEND = 'failure_to_attend';

export type MissedActivityType = 'interview' | 'written_exam' | 'oral_exam';

export const MISSED_ACTIVITY_LABELS: Record<MissedActivityType, string> = {
  interview: 'Interview',
  written_exam: 'Written Examination',
  oral_exam: 'Oral Examination',
};

/**
 * The activity an applicant missed, captured at the moment of disqualification.
 *
 * Stored rather than read back off the schedule columns, because a schedule can
 * be edited or cleared afterwards. The specification asks the system to record
 * the date and type of the activity, which only means something if it still
 * says what it said when the decision was taken.
 */
export interface MissedActivity {
  type: MissedActivityType;
  date: string;
  time: string | null;
}

/** What the applicant is told when they are disqualified for not attending. */
export function failureToAttendMessage(activity: MissedActivity | null): string {
  const base =
    'We regret to inform you that your application has been disqualified due to failure to attend the scheduled interview/examination.';
  if (!activity) return base;
  const label = MISSED_ACTIVITY_LABELS[activity.type];
  const when = activity.time ? `${activity.date} at ${activity.time}` : activity.date;
  return `${base} Scheduled ${label.toLowerCase()}: ${when}.`;
}
