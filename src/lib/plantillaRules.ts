/**
 * Plantilla and application rules shared by the RSP admin form, the public
 * apply flow and the tests. Pure functions only — no I/O.
 *
 * The model (migration 20260928):
 *   - A plantilla is a LABEL the RSP Admin types ("Plantilla 2", "Plantilla 100"),
 *     unique within its job posting. It is never a reference number.
 *   - A Reference No. (ABYAN-000-000) belongs to an APPLICATION and is issued by
 *     the database when the application is submitted.
 *   - Many applicants per plantilla; one application per applicant per
 *     plantilla; an applicant may apply to several plantillas.
 *
 * The database enforces all of this (unique indexes + triggers). These helpers
 * exist so the UI can fail early with a clear message instead of a raw error.
 */

// ── Display ─────────────────────────────────────────────────────────────────

/** What a plantilla is called everywhere in the UI. */
export const plantillaLabel = (slot: { label?: string | null; slotNumber: number }): string => {
  const label = String(slot.label ?? '').trim();
  return label || `Plantilla ${slot.slotNumber}`;
};

/** "Plantilla 1: 15 applicants" */
export const applicantsPerPlantillaText = (label: string, count: number): string =>
  `${label}: ${count} applicant${count === 1 ? '' : 's'}`;

// ── Reference numbers (application-only) ────────────────────────────────────

/**
 * The format the database generator issues (20260923): ABYAN-000-000, widened
 * to ABYAN-000-000-000 if the six-digit space is ever exhausted.
 */
export const REFERENCE_NO_PATTERN = /^ABYAN-\d{3}-\d{3}(-\d{3})?$/;

export const isApplicationReferenceNo = (value: string | null | undefined): boolean =>
  REFERENCE_NO_PATTERN.test(String(value ?? '').trim().toUpperCase());

/** Anything that reads like an ABYAN code, including the old ABYAN-2026-297 plantilla numbers. */
const ABYAN_CODE_PATTERN = /^\s*abyan[\s-]*\d/i;

// ── Admin: plantilla labels ─────────────────────────────────────────────────

export const normalizePlantillaLabel = (value: string | null | undefined): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Validates a posting's plantilla labels, in order. Returns the first problem
 * as a sentence for the admin, or '' when the list is fine.
 */
export const validatePlantillaLabels = (labels: string[]): string => {
  if (labels.length === 0) return 'Add at least one plantilla.';
  const seen = new Map<string, number>();
  for (let index = 0; index < labels.length; index += 1) {
    const raw = String(labels[index] ?? '');
    const key = normalizePlantillaLabel(raw);
    if (!key) return `Plantilla row ${index + 1} needs a name, e.g. "Plantilla ${index + 1}".`;
    if (raw.trim().length > 60) return `"${raw.trim().slice(0, 20)}…" is too long. Keep plantilla names under 60 characters.`;
    if (ABYAN_CODE_PATTERN.test(raw)) {
      return `"${raw.trim()}" looks like an application Reference No. Name plantillas like "Plantilla ${index + 1}".`;
    }
    const first = seen.get(key);
    if (first != null) return `Two plantillas are both named "${raw.trim()}". Each name must be unique in this job post.`;
    seen.set(key, index);
  }
  return '';
};

/** Internal key for a new plantilla when the database default isn't available. Never displayed. */
export const internalPlantillaKey = (random: () => number = Math.random): string =>
  `PLT-${Array.from({ length: 10 }, () => Math.floor(random() * 16).toString(16)).join('').toUpperCase()}`;

// ── Applicant: one application per plantilla ────────────────────────────────

export const normalizeApplicantEmail = (value: string | null | undefined): string =>
  String(value ?? '').trim().toLowerCase();

export interface AppliedPair {
  email: string;
  plantillaSlotId: string;
}

/** Has this email already applied to this plantilla? */
export const hasAppliedToPlantilla = (existing: AppliedPair[], email: string, plantillaSlotId: string): boolean => {
  const normalized = normalizeApplicantEmail(email);
  if (!normalized || !plantillaSlotId) return false;
  return existing.some(
    (pair) => pair.plantillaSlotId === plantillaSlotId && normalizeApplicantEmail(pair.email) === normalized,
  );
};

/**
 * Splits a multi-plantilla submission into the ones that may be filed and the
 * ones this applicant has already applied to.
 */
export const partitionBySubmitted = <T extends { plantillaSlotId: string | null }>(
  choices: T[],
  existing: AppliedPair[],
  email: string,
): { toSubmit: T[]; alreadyApplied: T[] } => {
  const toSubmit: T[] = [];
  const alreadyApplied: T[] = [];
  choices.forEach((choice) => {
    if (choice.plantillaSlotId && hasAppliedToPlantilla(existing, email, choice.plantillaSlotId)) alreadyApplied.push(choice);
    else toSubmit.push(choice);
  });
  return { toSubmit, alreadyApplied };
};

/** Name of the unique index that enforces the rule (migration 20260928). */
export const ONE_PER_PLANTILLA_INDEX = 'uq_applicants_one_per_plantilla';

/** True when an insert failed because this applicant already applied to this plantilla. */
export const isDuplicatePlantillaApplication = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; message?: unknown; details?: unknown };
  if (String(err.code ?? '') !== '23505') return false;
  const text = `${String(err.message ?? '')} ${String(err.details ?? '')}`.toLowerCase();
  return text.includes(ONE_PER_PLANTILLA_INDEX);
};

export const duplicatePlantillaMessage = (label: string): string =>
  `You've already applied to ${label} with this email address. You can apply to each plantilla only once, but you can still apply to the others.`;

/** True when a plantilla delete was blocked because it has applications. */
export const isPlantillaHasApplicationsError = (error: unknown): boolean =>
  String((error as { message?: unknown })?.message ?? '').includes('plantilla_has_applications');
