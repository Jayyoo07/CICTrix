import { describe, expect, it } from 'vitest';
import { buildDocumentHistory, mergeResubmissionRequests } from './applicantDocumentEvents';

const upload = (id: string, created_at: string) => ({ id, file_name: `${id}.pdf`, file_path: `path/${id}`, created_at });

describe('buildDocumentHistory', () => {
  it('lists current version, re-uploads and requests, then the original, newest first', () => {
    const history = buildDocumentHistory(
      [upload('v1', '2026-10-01T00:00:00Z'), upload('v3', '2026-10-05T00:00:00Z'), upload('v2', '2026-10-03T00:00:00Z')],
      [
        { id: 'r1', reason: 'Blurry', created_at: '2026-10-02T00:00:00Z', actorEmail: 'rsp@x.ph' },
        { id: 'r2', reason: 'Expired', created_at: '2026-10-04T00:00:00Z', actorEmail: null },
      ],
    );
    expect(history.map((e) => e.id)).toEqual(['v3', 'r2', 'v2', 'r1', 'v1']);
    expect(history.map((e) => (e.kind === 'upload' ? e.label : e.kind))).toEqual([
      'Current version',
      'resubmission_request',
      'Re-upload 1',
      'resubmission_request',
      'Original upload',
    ]);
  });

  it('labels a single upload as the current version', () => {
    const [only] = buildDocumentHistory([upload('v1', '2026-10-01T00:00:00Z')], []);
    expect(only).toMatchObject({ kind: 'upload', label: 'Current version', isCurrent: true });
  });
});

describe('mergeResubmissionRequests', () => {
  it('drops a legacy marker saved alongside an event, keeps older ones', () => {
    const merged = mergeResubmissionRequests(
      [{ id: 'e1', reason: 'Blurry', created_at: '2026-10-02T00:00:30Z', actorEmail: 'rsp@x.ph' }],
      [
        { id: 'l1', reason: 'Blurry', created_at: '2026-10-02T00:00:00Z', actorEmail: null },
        { id: 'l0', reason: 'Old', created_at: '2026-09-01T00:00:00Z', actorEmail: null },
      ],
    );
    expect(merged.map((r) => r.id)).toEqual(['e1', 'l0']);
  });
});
