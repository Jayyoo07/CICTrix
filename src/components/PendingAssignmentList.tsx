// Subtab 2 — "Qualified Applicants" within the RSP qualified page.
// Two sub-views:
//   "Pending Assignment" — qualified applicants that still need a schedule,
//                          picked from a department → position tree.
//   "Scheduled"         — applicants with a complete schedule, awaiting evaluation.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Pencil,
  Save,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  fetchActiveInterviewers,
  isApplicantFullyAssigned,
  saveApplicantAssignment,
  type ApplicantAssignmentFields,
  type InterviewerOption,
} from '../lib/applicantSchedule';
import type { ApplicantRecord } from './QualifiedApplicantsSection';
import { RaterManagementSubsection } from './RaterManagementSubsection';
import { ScheduleApplicantsModal } from './ScheduleApplicantsModal';
import { SchedulingTree } from './SchedulingTree';
import { normalizeStatus } from '../lib/api/applicantStatus';

interface PendingAssignmentListProps {
  applicants: ApplicantRecord[];
  completedEvaluationIds: Set<string>;
}

const isQualified = (a: ApplicantRecord, completedIds: Set<string>): boolean => {
  const s = (a.status ?? '').toLowerCase();
  return (
    // Batch scheduling advances Shortlisted applicants to this status, so they
    // must stay listed (now under Scheduled) instead of disappearing.
    normalizeStatus(a.status) === 'Interview/Exam Scheduled' ||
    s.includes('qualified') ||
    s.includes('shortlist') ||
    s.includes('recommended') ||
    completedIds.has(a.id)
  );
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const fmtTime = (t: string) => {
  if (!t) return '—';
  try {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${suffix}`;
  } catch {
    return t;
  }
};

const normalizeType = (t: string | null | undefined) =>
  (t ?? '').toLowerCase().includes('promot') ? 'Promotional' : 'Original';

export const PendingAssignmentList = ({ applicants, completedEvaluationIds }: PendingAssignmentListProps) => {

  const [subTab, setSubTab] = useState<'pending' | 'scheduled' | 'rater-management'>('pending');
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ApplicantAssignmentFields>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Edit-schedule modal state.
  const [editingApplicant, setEditingApplicant] = useState<ApplicantRecord | null>(null);
  const [editExamDate, setEditExamDate] = useState('');
  const [editExamTime, setEditExamTime] = useState('');
  const [editInterviewDate, setEditInterviewDate] = useState('');
  const [editInterviewTime, setEditInterviewTime] = useState('');
  const [editInterviewerEmail, setEditInterviewerEmail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    void fetchActiveInterviewers().then(setInterviewers);

    const onRatersUpdated = () => {
      void fetchActiveInterviewers().then(setInterviewers);
    };
    window.addEventListener('cictrix:raters-updated', onRatersUpdated);
    return () => {
      window.removeEventListener('cictrix:raters-updated', onRatersUpdated);
    };
  }, []);

  const mergeAssignment = useCallback(
    (a: ApplicantRecord): ApplicantRecord => ({ ...a, ...(overrides[a.id] ?? {}) }),
    [overrides],
  );

  const pendingApplicants = useMemo(() => {
    return applicants
      .filter((a) => isQualified(a, completedEvaluationIds))
      .filter((a) => !isApplicantFullyAssigned(mergeAssignment(a)));
  }, [applicants, completedEvaluationIds, mergeAssignment]);

  const scheduledApplicants = useMemo(() => {
    return applicants
      .filter((a) => isQualified(a, completedEvaluationIds))
      .filter((a) => isApplicantFullyAssigned(mergeAssignment(a)));
  }, [applicants, completedEvaluationIds, mergeAssignment]);

  // Drop ids that disappeared from the pending list (already assigned).
  useEffect(() => {
    setSelectedIds((prev) => {
      const stillPending = new Set(pendingApplicants.map((a) => a.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (stillPending.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [pendingApplicants]);

  const openEditModal = (a: ApplicantRecord) => {
    const merged = mergeAssignment(a);
    setEditingApplicant(a);
    setEditExamDate(merged.exam_date ?? '');
    setEditExamTime(merged.exam_time ?? '');
    setEditInterviewDate(merged.interview_date ?? '');
    setEditInterviewTime(merged.interview_time ?? '');
    setEditInterviewerEmail(merged.assigned_interviewer_email ?? '');
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editingApplicant || editSaving) return;
    setEditError('');
    setEditSaving(true);
    const result = await saveApplicantAssignment(editingApplicant.id, {
      exam_date: editExamDate,
      exam_time: editExamTime,
      interview_date: editInterviewDate,
      interview_time: editInterviewTime,
      assigned_interviewer_email: editInterviewerEmail,
    });
    setEditSaving(false);
    if ('error' in result) {
      setEditError(result.error);
      return;
    }
    setOverrides((prev) => ({
      ...prev,
      [editingApplicant.id]: {
        exam_date: editExamDate,
        exam_time: editExamTime,
        interview_date: editInterviewDate,
        interview_time: editInterviewTime,
        assigned_interviewer_email: editInterviewerEmail,
      },
    }));
    setEditingApplicant(null);
  };

  const getInterviewerName = (email: string | null | undefined) => {
    if (!email) return '—';
    return interviewers.find((i) => i.email === email)?.name ?? email;
  };

  return (
    <div className="space-y-4">

      {/* Sub-tab toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1" style={{ width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setSubTab('pending')}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
          style={subTab === 'pending'
            ? { background: '#363EE8', color: '#ffffff' }
            : { background: 'transparent', color: '#64748b' }}
        >
          <Clock size={14} />
          Pending Assignment
          {pendingApplicants.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={subTab === 'pending'
                ? { background: 'rgba(255,255,255,0.25)', color: '#ffffff' }
                : { background: '#FEF3C7', color: '#92400E' }}
            >
              {pendingApplicants.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('scheduled')}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
          style={subTab === 'scheduled'
            ? { background: '#363EE8', color: '#ffffff' }
            : { background: 'transparent', color: '#64748b' }}
        >
          <CalendarCheck size={14} />
          Scheduled
          {scheduledApplicants.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={subTab === 'scheduled'
                ? { background: 'rgba(255,255,255,0.25)', color: '#ffffff' }
                : { background: '#DCFCE7', color: '#15803D' }}
            >
              {scheduledApplicants.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rater-management')}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
          style={subTab === 'rater-management'
            ? { background: '#363EE8', color: '#ffffff' }
            : { background: 'transparent', color: '#64748b' }}
        >
          <Users size={14} />
          Rater Management
        </button>
      </div>

      {/* ── PENDING ASSIGNMENT VIEW ── */}
      {subTab === 'pending' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-bold" style={{ color: '#363EE8' }}>Qualified Applicants — Pending Assignment</h3>
            <p className="mt-1 text-sm text-slate-500">
              Check a position to select all of its applicants, or expand it to pick applicants one by one. Then
              schedule their oral interview. Scheduled applicants move to the <span className="font-semibold">Scheduled</span> tab.
            </p>
          </section>

          {toast && (
            <p role="status" className="!m-0 rounded-[var(--radius-lg)] border-l-4 border-[var(--success-500)] bg-[var(--success-100)] p-4 text-[14px] font-medium leading-[18px] text-[var(--neutral-800)]">
              {toast}
            </p>
          )}

          {pendingApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <CheckCircle2 size={40} className="mb-3 text-emerald-400" />
              <p className="font-semibold text-slate-600">All qualified applicants have been assigned a schedule.</p>
              <button
                type="button"
                onClick={() => setSubTab('scheduled')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ background: '#363EE8' }}
              >
                <CalendarCheck size={14} /> View Scheduled Applicants
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--neutral-200)] bg-[var(--bg-surface)] px-5 py-3">
                <span className="text-[14px] font-medium leading-[18px] text-[var(--neutral-800)]" aria-live="polite">
                  {selectedIds.size} applicant{selectedIds.size === 1 ? '' : 's'} selected
                </span>
                <button
                  type="button"
                  className="btn btn-md btn-primary"
                  disabled={selectedIds.size === 0}
                  onClick={() => { setToast(''); setScheduleOpen(true); }}
                >
                  <CalendarPlus size={18} strokeWidth={1.75} aria-hidden="true" />
                  Schedule Applicants
                </button>
              </div>
              <SchedulingTree
                applicants={pendingApplicants}
                selected={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </>
          )}
        </>
      )}

      {scheduleOpen && (
        <ScheduleApplicantsModal
          applicants={pendingApplicants.filter((a) => selectedIds.has(a.id))}
          raters={interviewers}
          onCancel={() => setScheduleOpen(false)}
          onScheduled={(message) => {
            setScheduleOpen(false);
            setSelectedIds(new Set());
            setToast(message);
          }}
        />
      )}

      {/* ── RATER MANAGEMENT TAB ── */}
      {subTab === 'rater-management' && (
        <RaterManagementSubsection onAccessChange={() => void fetchActiveInterviewers().then(setInterviewers)} />
      )}

      {/* ── SCHEDULED VIEW ── */}
      {subTab === 'scheduled' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-bold" style={{ color: '#363EE8' }}>Scheduled Applicants</h3>
            <p className="mt-1 text-sm text-slate-500">
              These applicants have a published exam &amp; interview schedule. Once the interview is complete,
              their scores will be recorded in the <span className="font-semibold">Applicant Score</span> tab.
            </p>
          </section>

          {scheduledApplicants.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <CalendarCheck size={40} className="mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600">No scheduled applicants yet.</p>
              <p className="mt-1 text-sm text-slate-400">Publish a schedule in the Pending Assignment tab first.</p>
              <button
                type="button"
                onClick={() => setSubTab('pending')}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Go to Pending Assignment
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Applicant</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Position / Office</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Exam Schedule</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Interview Schedule</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Interviewer</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledApplicants.map((a) => {
                    const merged = mergeAssignment(a);
                    const interviewer = getInterviewerName(merged.assigned_interviewer_email);
                    return (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold" style={{ color: '#040E6B' }}>{a.full_name || '—'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{a.email}</p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              normalizeType(a.application_type) === 'Promotional'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {normalizeType(a.application_type)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">{a.position || '—'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{a.office || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-1.5">
                            <Calendar size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{fmtDate(merged.exam_date ?? '')}</p>
                              <p className="text-xs text-slate-500">{fmtTime(merged.exam_time ?? '')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-1.5">
                            <Calendar size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{fmtDate(merged.interview_date ?? '')}</p>
                              <p className="text-xs text-slate-500">{fmtTime(merged.interview_time ?? '')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-1.5">
                            <UserCheck size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{interviewer}</p>
                              {merged.assigned_interviewer_email && interviewer !== merged.assigned_interviewer_email && (
                                <p className="text-xs text-slate-400">{merged.assigned_interviewer_email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil size={11} /> Edit Schedule
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── EDIT SCHEDULE MODAL ── */}
      {editingApplicant && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,14,107,0.45)', padding: '1rem' }}
          onClick={() => setEditingApplicant(null)}
        >
          <div
            style={{ background: '#ffffff', borderRadius: 20, boxShadow: '0 24px 80px rgba(54,62,232,0.22)', width: '100%', maxWidth: 520, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #5B65F0 0%, #363EE8 100%)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Edit Schedule</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                  {editingApplicant.full_name} — {editingApplicant.position}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingApplicant(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, cursor: 'pointer', color: '#ffffff', padding: '0.35rem', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
                    <Calendar size={11} /> Exam Date
                  </label>
                  <input
                    type="date"
                    value={editExamDate}
                    onChange={(e) => setEditExamDate(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #C8D1FF', borderRadius: 8, padding: '0.5rem 0.65rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
                    <Clock size={11} /> Exam Time
                  </label>
                  <input
                    type="time"
                    value={editExamTime}
                    onChange={(e) => setEditExamTime(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #C8D1FF', borderRadius: 8, padding: '0.5rem 0.65rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
                    <Calendar size={11} /> Interview Date
                  </label>
                  <input
                    type="date"
                    value={editInterviewDate}
                    onChange={(e) => setEditInterviewDate(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #C8D1FF', borderRadius: 8, padding: '0.5rem 0.65rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
                    <Clock size={11} /> Interview Time
                  </label>
                  <input
                    type="time"
                    value={editInterviewTime}
                    onChange={(e) => setEditInterviewTime(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #C8D1FF', borderRadius: 8, padding: '0.5rem 0.65rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 6 }}>
                  <UserCheck size={11} /> Assigned Interviewer
                </label>
                <select
                  value={editInterviewerEmail}
                  onChange={(e) => setEditInterviewerEmail(e.target.value)}
                  style={{ width: '100%', border: '1.5px solid #C8D1FF', borderRadius: 8, padding: '0.5rem 0.65rem', fontSize: '0.875rem', outline: 'none', background: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="">Select an interviewer…</option>
                  {interviewers.map((i) => (
                    <option key={i.email} value={i.email}>
                      {i.name}{i.designation ? ` — ${i.designation}` : ''} ({i.email})
                    </option>
                  ))}
                </select>
              </div>
              {editError && <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>{editError}</p>}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1.5px solid #EEF0FD', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setEditingApplicant(null)}
                style={{ padding: '0.55rem 1.25rem', background: '#ffffff', border: '1.5px solid #C8D1FF', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', color: '#040E6B', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleEditSave()}
                disabled={editSaving}
                style={{ padding: '0.55rem 1.5rem', background: editSaving ? '#C8D1FF' : 'linear-gradient(135deg, #363EE8 0%, #040E6B 100%)', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', color: '#ffffff', cursor: editSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: editSaving ? 'none' : '0 4px 14px rgba(54,62,232,0.35)' }}
              >
                <Save size={14} />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
