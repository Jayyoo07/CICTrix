/**
 * Super Admin → Salary Grades.
 *
 * The official CSC salary schedule, SG 1–33. Step 1 is the hiring rate every
 * job post uses; steps 2–8 are the rest of the schedule.
 *
 * Editing a Step 1 amount rewrites the salary on every job post and plantilla
 * item at that grade, including published ones (decision D1). That is why every
 * save confirms first and says how many postings it will change — the cost of
 * a mistyped digit here is a wrong salary on a live public vacancy.
 *
 * Built to the shape of the other admin editing surfaces (OfficeWeightingPanel,
 * EligibilityPointsPanel): icon header, consequence notice, bordered table
 * edited in place. DESIGN_IDENTITY.md §9.3–9.5, §9.9, §9.10.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2, Wallet, X } from 'lucide-react';
import { supabase as supabaseClient } from '../lib/supabase';
import {
  HIRING_STEP,
  MAX_STEP,
  addSalaryStep,
  deleteSalaryStep,
  formatSalary,
  listSalaryGrades,
  updateSalaryStep,
  type SalaryGradeRow,
} from '../lib/api/salaryGrades';

const supabase = supabaseClient as any;

/** How long a "Saved" tick stays up, in ms. */
const SAVED_FLASH_MS = 2000;

const STEPS = Array.from({ length: MAX_STEP }, (_, i) => i + 1);

type Pending =
  | { kind: 'edit'; grade: number; step: number; amount: number; current: number }
  // The amount is typed in the modal, so it starts empty rather than being
  // collected by window.prompt — a browser dialog is not part of the system,
  // cannot be styled or validated, and names the hostname rather than the app.
  | { kind: 'add'; grade: number; step: number }
  | { kind: 'delete'; grade: number; step: number };

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
};

export const SalaryGradesPage = () => {
  const [rows, setRows] = useState<SalaryGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  /** Amount typed into the Add-step modal. */
  const [draftAmount, setDraftAmount] = useState('');
  /** Postings a Step 1 change would rewrite; null while it is being counted. */
  const [affected, setAffected] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listSalaryGrades();
    if (res.ok === false) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setRows(res.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (tone: 'ok' | 'err', text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 5000);
  };

  /**
   * Count the postings a Step 1 change would rewrite.
   *
   * Read-only, and counted at confirm time rather than kept on screen, because
   * the number has to describe the database as it is now, not as it was when
   * the page loaded.
   */
  const countAffected = useCallback(async (grade: number) => {
    setAffected(null);
    try {
      const [jobs, slots] = await Promise.all([
        supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('salary_grade', grade),
        supabase.from('plantilla_slots').select('id', { count: 'exact', head: true }).eq('salary_grade', grade),
      ]);
      setAffected((jobs.count ?? 0) + (slots.count ?? 0));
    } catch {
      // Leave it null: the modal then says the count is unavailable rather than
      // claiming zero, which would read as "this changes nothing".
      setAffected(null);
    }
  }, []);

  const ask = (next: Pending) => {
    setPending(next);
    setDraftAmount('');
    setAffected(null);
    if (next.kind !== 'delete' && next.step === HIRING_STEP) void countAffected(next.grade);
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    const key = `${pending.grade}-${pending.step}`;

    const res =
      pending.kind === 'edit'
        ? await updateSalaryStep(pending.grade, pending.step, pending.amount)
        : pending.kind === 'add'
          ? await addSalaryStep(pending.grade, pending.step, Number(draftAmount))
          : await deleteSalaryStep(pending.grade, pending.step);

    setBusy(false);
    setPending(null);

    if (res.ok === false) {
      flash('err', res.error);
      return;
    }
    await load();
    setSavedKey(key);
    window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), SAVED_FLASH_MS);
    flash(
      'ok',
      pending.kind === 'delete'
        ? `Step ${pending.step} removed from SG ${pending.grade}.`
        : `SG ${pending.grade} Step ${pending.step} saved.`,
    );
  };

  const stepOf = (row: SalaryGradeRow, step: number) => row.steps.find((s) => s.step === step);

  /** The amount the modal is about to write, whichever kind it is. */
  const pendingAmount =
    pending?.kind === 'edit' ? pending.amount : pending?.kind === 'add' ? Number(draftAmount) : null;
  const amountValid = pendingAmount != null && Number.isFinite(pendingAmount) && pendingAmount > 0;

  const confirmBody = useMemo(() => {
    if (!pending) return null;
    if (pending.kind === 'delete') {
      return `Remove Step ${pending.step} from SG ${pending.grade}? Job posts are unaffected — they use Step ${HIRING_STEP}.`;
    }
    // On Add the amount is still being typed, so the consequence is described
    // without quoting a number that does not exist yet.
    const target = pending.kind === 'add' ? 'this step' : formatSalary(pending.amount);
    const base =
      pending.kind === 'add'
        ? `Add Step ${pending.step} to SG ${pending.grade}.`
        : `Change SG ${pending.grade} Step ${pending.step} to ${target}?`;
    if (pending.step !== HIRING_STEP) {
      return `${base} Steps above ${HIRING_STEP} are reference only, so no job post changes.`;
    }
    if (affected === null) {
      return `${base} This is the hiring rate, so every job post and plantilla item at SG ${pending.grade} will be updated — including published ones. (The number of affected postings could not be counted.)`;
    }
    return `${base} This is the hiring rate, so ${affected} job post${affected === 1 ? '' : 's'} and plantilla item${affected === 1 ? '' : 's'} at SG ${pending.grade} will be updated — including published ones.`;
  }, [pending, affected]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-2.5">
        <Wallet className="h-6 w-6 text-[#363EE8]" />
        <div>
          <h2 className="text-2xl font-bold text-[#040E6B]">Salary Grades</h2>
          <p className="text-sm text-[#515F69]">
            The official CSC salary schedule. Every salary in the system is read from here.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[#F0B478] bg-[#FCE8C8] px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E8821A]" />
        <p className="text-xs text-[#A8590A]">
          Step 1 is the hiring rate. Changing it rewrites the salary on every job post at that grade,
          including vacancies already published. Steps 2–8 are the rest of the schedule and change nothing
          on their own.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-[#EF9A9A] bg-[#FDE2E2] px-4 py-3 text-sm text-[#B42323]">{error}</div>
      )}

      {toast && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            toast.tone === 'ok'
              ? 'border-[#7ECBA1] bg-[#DCFCE7] text-[#0F7A40]'
              : 'border-[#EF9A9A] bg-[#FDE2E2] text-[#B42323]'
          }`}
        >
          {toast.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#94A3B8]">Loading the salary schedule…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-6 text-sm text-[#515F69]">
          <p className="!mb-1 font-semibold text-[#28343D]">No salary schedule loaded.</p>
          <p className="!mb-0">Run migration 20261013 to seed SG 1–33, then edit the amounts here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-[#F1F5F9] text-left text-[13px] font-semibold text-[#040E6B]">
                <th scope="col" className="px-4 py-2.5">SG</th>
                {STEPS.map((n) => (
                  <th key={n} scope="col" className="px-4 py-2.5">
                    Step {n}
                    {n === HIRING_STEP && <span className="ml-1 text-[11px] font-normal text-[#515F69]">(hiring)</span>}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.salaryGrade} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFF]">
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-[#040E6B]">
                    SG {row.salaryGrade}
                  </th>
                  {STEPS.map((n) => {
                    const cell = stepOf(row, n);
                    const key = `${row.salaryGrade}-${n}`;
                    if (!cell) {
                      return (
                        <td key={n} className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => ask({ kind: 'add', grade: row.salaryGrade, step: n })}
                            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#CBD5E1] px-2 py-1 text-xs text-[#515F69] hover:border-[#363EE8] hover:text-[#363EE8]"
                            aria-label={`Add Step ${n} for SG ${row.salaryGrade}`}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={n} className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            defaultValue={cell.monthlySalary}
                            aria-label={`SG ${row.salaryGrade} Step ${n} monthly salary`}
                            onBlur={(e) => {
                              const amount = Number(e.target.value);
                              if (!Number.isFinite(amount) || amount === cell.monthlySalary) return;
                              ask({
                                kind: 'edit',
                                grade: row.salaryGrade,
                                step: n,
                                amount,
                                current: cell.monthlySalary,
                              });
                            }}
                            className="w-28 rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm focus:border-[#363EE8] focus:outline-none focus:ring-1 focus:ring-[#363EE8]"
                          />
                          {savedKey === key && <Check className="h-3.5 w-3.5 text-[#16A85A]" />}
                          {n !== HIRING_STEP && (
                            <button
                              type="button"
                              onClick={() => ask({ kind: 'delete', grade: row.salaryGrade, step: n })}
                              aria-label={`Remove Step ${n} from SG ${row.salaryGrade}`}
                              className="rounded p-1 text-[#94A3B8] hover:bg-[#FDE2E2] hover:text-[#B42323]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-[#515F69]">{formatDate(row.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,14,107,.45)] p-4"
          onClick={() => !busy && setPending(null)}
        >
          <div className="w-full max-w-[480px] rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-[#040E6B]">
                {pending.kind === 'delete' ? 'Remove step' : pending.kind === 'add' ? 'Add step' : 'Change amount'}
              </h3>
              <button
                type="button"
                onClick={() => !busy && setPending(null)}
                aria-label="Close"
                className="rounded p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[#28343D]">{confirmBody}</p>

            {pending.kind === 'add' && (
              <div className="mt-4">
                <label htmlFor="new-step-amount" className="mb-1.5 block text-[13px] font-medium text-[#28343D]">
                  Monthly salary <span className="text-[#E05252]">*</span>
                </label>
                <input
                  id="new-step-amount"
                  type="number"
                  min={1}
                  autoFocus
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && amountValid && !busy) void confirm(); }}
                  placeholder="e.g. 15200"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#363EE8] focus:outline-none focus:ring-[3px] focus:ring-[rgba(54,62,232,.15)]"
                />
                {draftAmount !== '' && !amountValid && (
                  <p className="mt-1 text-xs text-[#B42323]">Enter an amount greater than zero.</p>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={busy}
                className="rounded-full border-[1.5px] border-[#363EE8] px-5 py-2 text-sm font-semibold text-[#363EE8] hover:bg-[#EEF0FF] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy || (pending.kind === 'add' && !amountValid)}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  pending.kind === 'delete' ? 'bg-[#E05252] hover:bg-[#B42323]' : 'bg-[#363EE8] hover:bg-[#191FA8]'
                }`}
              >
                {busy ? 'Saving…' : pending.kind === 'delete' ? 'Remove step' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryGradesPage;
