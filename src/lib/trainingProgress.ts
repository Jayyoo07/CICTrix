/**
 * Training progress for the year — how many of the calendar's trainings are done.
 *
 * Status comes from the dates rather than the stored status, because the
 * stored one is set by hand and goes stale (a training that ended last month
 * can still read "Scheduled"). Cancelled is the exception: only an admin can
 * cancel, so the stored value is the truth there.
 */

import type { CalendarEventStatus } from './api/trainingCalendar';

type ProgressEvent = { startDate: string; endDate: string | null; status: CalendarEventStatus };

export type TrainingProgress = {
  completed: number;
  ongoing: number;
  scheduled: number;
  cancelled: number;
  /** Trainings on the calendar, cancelled ones excluded. */
  total: number;
  /** completed / total, 0–100. */
  percent: number;
};

/** End of the local day the timestamp falls on — a training runs its whole last day. */
const endOfDay = (iso: string): number => {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

export const effectiveStatus = (e: ProgressEvent, now: Date = new Date()): CalendarEventStatus => {
  if (e.status === 'Cancelled') return 'Cancelled';
  const t = now.getTime();
  if (t < new Date(e.startDate).getTime()) return 'Scheduled';
  if (t <= endOfDay(e.endDate ?? e.startDate)) return 'Ongoing';
  return 'Completed';
};

export const trainingProgress = (events: ProgressEvent[], now: Date = new Date()): TrainingProgress => {
  const counts = { Scheduled: 0, Ongoing: 0, Completed: 0, Cancelled: 0 };
  for (const e of events) counts[effectiveStatus(e, now)] += 1;
  const total = events.length - counts.Cancelled;
  return {
    completed: counts.Completed,
    ongoing: counts.Ongoing,
    scheduled: counts.Scheduled,
    cancelled: counts.Cancelled,
    total,
    percent: total > 0 ? Math.round((counts.Completed / total) * 100) : 0,
  };
};
