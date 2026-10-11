// "Schedule Applicants" dialog: one oral interview date, session, rater and
// venue applied to every selected applicant (DESIGN_IDENTITY §9.10).

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Loader2, X } from 'lucide-react';
import type { ApplicantRecord } from './QualifiedApplicantsSection';
import { scheduleApplicantsBatch, type InterviewerOption } from '../lib/applicantSchedule';
import {
  groupByDepartmentAndPosition,
  isPastDate,
  localIsoDate,
  SESSION_TIMES,
  type InterviewSession,
} from '../lib/scheduleSelection';

const INPUT_CLASS =
  'h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-200)] bg-[var(--bg-surface)] px-3 text-[14px] font-medium text-[var(--neutral-800)] outline-none transition-colors hover:border-[var(--color-primary-200)] focus:border-[var(--color-primary)] focus:shadow-[var(--ring-input)]';
const LABEL_CLASS = 'mb-1.5 block text-[14px] font-medium leading-4 text-[var(--neutral-800)]';

const SESSIONS: { value: InterviewSession; label: string }[] = [
  { value: 'morning', label: 'Morning (8:00 AM)' },
  { value: 'afternoon', label: 'Afternoon (1:00 PM)' },
  { value: 'custom', label: 'Custom time' },
];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const Required = () => <span className="text-[var(--error-500)]" aria-hidden="true"> *</span>;

interface ScheduleApplicantsModalProps {
  applicants: ApplicantRecord[];
  raters: InterviewerOption[];
  onCancel: () => void;
  /** Called after a successful save with a message for the success alert. */
  onScheduled: (message: string) => void;
}

export const ScheduleApplicantsModal = ({ applicants, raters, onCancel, onScheduled }: ScheduleApplicantsModalProps) => {
  const today = localIsoDate();
  const [date, setDate] = useState('');
  const [session, setSession] = useState<InterviewSession>('morning');
  const [customTime, setCustomTime] = useState('');
  const [raterEmail, setRaterEmail] = useState('');
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const positionSummary = useMemo(
    () => groupByDepartmentAndPosition(applicants).flatMap((d) =>
      d.positions.map((p) => ({ key: p.key, position: p.position, department: d.department, count: p.applicants.length })),
    ),
    [applicants],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, saving]);

  const time = session === 'custom' ? customTime : SESSION_TIMES[session];

  const handleConfirm = async () => {
    if (saving) return;
    if (!date) return setError('Choose an interview date.');
    if (isPastDate(date, today)) return setError('The interview date cannot be in the past.');
    if (!time) return setError('Enter a time for the custom session.');
    if (!raterEmail) return setError('Choose a rater.');

    setError('');
    setSaving(true);
    const result = await scheduleApplicantsBatch({
      applicants: applicants.map((a) => ({ id: a.id, status: a.status })),
      interviewDate: date,
      interviewTime: time,
      raterEmail,
      venue,
    });
    setSaving(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }
    const rater = raters.find((r) => r.email === raterEmail)?.name ?? raterEmail;
    onScheduled(
      `Scheduled ${result.scheduled} applicant${result.scheduled === 1 ? '' : 's'} for ${formatDate(date)}, ${formatTime(time)} with ${rater}. They are now in the Scheduled tab.`,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--overlay)] p-4"
      onClick={() => { if (!saving) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-applicants-title"
        className="mx-auto my-8 w-full max-w-[640px] rounded-[var(--radius-xl)] bg-[var(--bg-surface)] shadow-[var(--shadow-3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--neutral-200)] px-6 py-5">
          <div>
            <h2 id="schedule-applicants-title" className="!m-0 text-[18px] font-semibold leading-6 text-[var(--color-primary-900)]">
              Schedule Applicants
            </h2>
            <p className="!m-0 mt-1 text-[14px] font-medium leading-[18px] text-[var(--neutral-600)]">
              Oral interview for {applicants.length} applicant{applicants.length === 1 ? '' : 's'} across{' '}
              {positionSummary.length} position{positionSummary.length === 1 ? '' : 's'}.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onCancel}
            disabled={saving}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] text-[var(--neutral-600)] hover:bg-[var(--bg-page)]"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <ul className="!m-0 divide-y divide-[var(--neutral-200)] rounded-[var(--radius-lg)] border border-[var(--neutral-200)] !p-0">
            {positionSummary.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold leading-[18px] text-[var(--color-primary-900)]">{p.position}</span>
                  <span className="block truncate text-[12px] font-medium leading-4 text-[var(--neutral-600)]">{p.department}</span>
                </span>
                <span className="badge badge-tint shrink-0">{p.count}</span>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="schedule-date" className={LABEL_CLASS}>Interview / oral date<Required /></label>
            <input
              id="schedule-date"
              type="date"
              autoFocus
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <fieldset className="!m-0 !border-0 !p-0">
            <legend className={LABEL_CLASS}>Time slot<Required /></legend>
            <div className="flex flex-wrap gap-2">
              {SESSIONS.map((s) => (
                <label
                  key={s.value}
                  className={`inline-flex h-9 cursor-pointer items-center rounded-[var(--radius-pill)] border px-4 text-[13px] font-semibold transition-colors ${
                    session === s.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)] text-[var(--color-primary)]'
                      : 'border-[var(--neutral-200)] text-[var(--neutral-800)] hover:border-[var(--color-primary-200)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="schedule-session"
                    value={s.value}
                    checked={session === s.value}
                    onChange={() => setSession(s.value)}
                    className="sr-only"
                  />
                  {s.label}
                </label>
              ))}
            </div>
            {session === 'custom' && (
              <input
                type="time"
                aria-label="Custom interview time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className={`${INPUT_CLASS} mt-3 sm:max-w-[200px]`}
              />
            )}
          </fieldset>

          <div>
            <label htmlFor="schedule-rater" className={LABEL_CLASS}>Assigned rater<Required /></label>
            <select
              id="schedule-rater"
              value={raterEmail}
              onChange={(e) => setRaterEmail(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select a rater…</option>
              {raters.map((r) => (
                <option key={r.email} value={r.email}>
                  {r.name}{r.designation ? ` — ${r.designation}` : ''} ({r.email})
                </option>
              ))}
            </select>
            {raters.length === 0 && (
              <p className="!m-0 mt-1 text-[12px] font-medium leading-4 text-[var(--warning-700)]">
                No active raters found. Grant access in the Rater Management tab first.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="schedule-venue" className={LABEL_CLASS}>Venue or meeting link</label>
            <input
              id="schedule-venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. City Hall Conference Room 3"
              className={INPUT_CLASS}
            />
            <p className="!m-0 mt-1 text-[12px] font-medium leading-4 text-[var(--neutral-600)]">Optional.</p>
          </div>

          {error && (
            <p role="alert" className="!m-0 text-[12px] font-medium leading-4 text-[var(--error-700)]">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--neutral-200)] px-6 py-4">
          <button type="button" className="btn btn-md btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-md btn-primary" onClick={() => void handleConfirm()} disabled={saving}>
            {saving
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <CalendarCheck size={16} strokeWidth={1.75} aria-hidden="true" />}
            {saving ? 'Scheduling…' : 'Confirm Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};
