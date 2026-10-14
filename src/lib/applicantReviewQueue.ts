/**
 * The ordered list of applicants an RSP reviewer steps through on the details
 * page. Each list that opens the details page passes the rows it shows, in the
 * order it shows them, as `navQueue` in the route state.
 */
import { normalizeStatus } from './api/applicantStatus';

export type ReviewQueueEntry = { id: string; name: string; status: string };

/** Above this many applicants the progress dots stop being readable. */
export const MAX_PROGRESS_DOTS = 30;

export type ReviewOutcome = 'undecided' | 'shortlisted' | 'disqualified';

/** Undecided means screening has not ended: not yet Shortlisted, and not closed out. */
export function reviewOutcome(status: string | null | undefined): ReviewOutcome {
  const workflow = normalizeStatus(status);
  if (workflow === 'Disqualified' || workflow === 'Not Selected') return 'disqualified';
  if (workflow === null || workflow === 'Submitted' || workflow === 'Under Initial Screening' || workflow === 'Pending') {
    return 'undecided';
  }
  return 'shortlisted';
}

/** Index of the next undecided applicant after `fromIndex`, wrapping round; -1 when none are left. */
export function nextUndecidedIndex(queue: ReviewQueueEntry[], fromIndex: number): number {
  for (let step = 1; step < queue.length; step += 1) {
    const index = (fromIndex + step) % queue.length;
    if (reviewOutcome(queue[index].status) === 'undecided') return index;
  }
  return -1;
}

type PositionKeyed = { position?: string | null; office?: string | null };

const squash = (value: string | null | undefined) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const positionKey = (row: PositionKeyed): string => `${squash(row.position)}|${squash(row.office)}`;

/**
 * The rows applying for the same position as `target`, in their given order.
 * RSP reviews one position at a time, so Next/Back never crosses into another
 * post. Matches on title + office, not item_number: that is per plantilla, so
 * one post's applicants can carry different item numbers.
 */
export function samePositionRows<T extends PositionKeyed>(rows: T[], target: T): T[] {
  const key = positionKey(target);
  return rows.filter((row) => positionKey(row) === key);
}
