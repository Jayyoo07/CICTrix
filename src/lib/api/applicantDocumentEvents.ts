/**
 * Applicant document events — the saved history of RSP document review:
 * resubmission requests, validations, and undone validations, each with the
 * RSP user and time. Uploads themselves stay in applicant_attachments.
 */

import { supabase as supabaseClient } from '../../lib/supabase';

const supabase = supabaseClient as any;

export type DocumentEventType = 'resubmission_requested' | 'validated' | 'validation_undone';

export interface DocumentEvent {
  id: string;
  applicant_id: string;
  document_type: string | null;
  event_type: DocumentEventType;
  reason: string | null;
  actor_email: string | null;
  created_at: string;
}

export async function listDocumentEvents(
  applicantId: string,
): Promise<{ ok: boolean; events: DocumentEvent[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('applicant_document_events')
      .select('*')
      .eq('applicant_id', applicantId)
      .order('created_at', { ascending: false });
    if (error) return { ok: false, events: [], error: error.message ?? 'Failed to load document history.' };
    return { ok: true, events: (data ?? []) as DocumentEvent[] };
  } catch (err) {
    return { ok: false, events: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function recordDocumentEvent(event: {
  applicantId: string;
  eventType: DocumentEventType;
  documentType?: string | null;
  reason?: string | null;
  actorEmail: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('applicant_document_events').insert({
      applicant_id: event.applicantId,
      event_type: event.eventType,
      document_type: event.documentType ?? null,
      reason: event.reason ?? null,
      actor_email: event.actorEmail,
    });
    if (error) return { ok: false, error: error.message ?? 'Failed to save document event.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Removes the applicant's validation markers and logs the undo. The database
 * refuses (`locked`) once an exam or interview is scheduled.
 */
export async function undoDocumentValidation(
  applicantId: string,
  actorEmail: string,
): Promise<{ ok: boolean; locked?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('undo_document_validation', {
      p_applicant_id: applicantId,
      p_actor_email: actorEmail,
    });
    if (error) return { ok: false, error: error.message ?? 'Failed to undo validation.' };
    if (data === 'locked') return { ok: false, locked: true, error: 'An exam or interview is already scheduled.' };
    if (data !== 'ok') return { ok: false, error: 'Applicant not found.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── History for one document slot ───────────────────────────────────────────

export interface UploadRecord {
  id: string;
  file_name: string;
  file_path: string;
  created_at?: string;
}

export interface ResubmissionRequestRecord {
  id: string;
  reason: string;
  created_at: string;
  /** Null for requests saved before the events table existed. */
  actorEmail: string | null;
}

export type DocumentHistoryEntry =
  | {
      kind: 'upload';
      id: string;
      label: string;
      isCurrent: boolean;
      fileName: string;
      filePath: string;
      date: string;
    }
  | { kind: 'resubmission_request'; id: string; reason: string; date: string; actorEmail: string | null };

/** Requests within this window of each other are the same request saved twice (legacy marker + event). */
const DUPLICATE_REQUEST_WINDOW_MS = 2 * 60 * 1000;

/**
 * Merges legacy resubmission markers into the event list, dropping a legacy
 * marker when an event records the same request.
 */
export function mergeResubmissionRequests(
  events: ResubmissionRequestRecord[],
  legacy: ResubmissionRequestRecord[],
): ResubmissionRequestRecord[] {
  const extra = legacy.filter(
    (old) =>
      !events.some(
        (ev) => Math.abs(new Date(ev.created_at).getTime() - new Date(old.created_at).getTime()) < DUPLICATE_REQUEST_WINDOW_MS,
      ),
  );
  return [...events, ...extra];
}

/**
 * One document's history, newest first: the current version, then re-uploads
 * and resubmission requests in time order, ending with the original upload.
 */
export function buildDocumentHistory(
  uploads: UploadRecord[],
  requests: ResubmissionRequestRecord[],
): DocumentHistoryEntry[] {
  const time = (value?: string) => new Date(value ?? 0).getTime();
  const oldestFirst = [...uploads].sort((a, b) => time(a.created_at) - time(b.created_at));
  const last = oldestFirst.length - 1;

  const uploadEntries: DocumentHistoryEntry[] = oldestFirst.map((upload, index) => ({
    kind: 'upload',
    id: upload.id,
    label: index === last ? 'Current version' : index === 0 ? 'Original upload' : `Re-upload ${index}`,
    isCurrent: index === last,
    fileName: upload.file_name,
    filePath: upload.file_path,
    date: upload.created_at ?? '',
  }));

  const requestEntries: DocumentHistoryEntry[] = requests.map((request) => ({
    kind: 'resubmission_request',
    id: request.id,
    reason: request.reason,
    date: request.created_at,
    actorEmail: request.actorEmail,
  }));

  return [...uploadEntries, ...requestEntries].sort((a, b) => time(b.date) - time(a.date));
}
