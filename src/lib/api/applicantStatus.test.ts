import { describe, expect, it } from 'vitest';
import {
  APPLICANT_MESSAGES,
  APPLICANT_STATUSES,
  canTransition,
  funnelBucket,
  isTerminal,
  nextStatuses,
  normalizeStatus,
  type ApplicantWorkflowStatus,
} from './applicantStatus';

/**
 * Every status value observed in production on 2026-09-01, with its count.
 * These are the values the normaliser must actually handle; anything it misses
 * would strand real applicants.
 */
const LIVE_VALUES: [string, number, ApplicantWorkflowStatus][] = [
  ['Hired', 35, 'Selected'],
  ['New Application', 14, 'Submitted'],
  ['Recommended for Hiring', 13, 'Shortlisted'],
  ['Under Review', 3, 'Under Initial Screening'],
  ['Reviewed', 2, 'Under Initial Screening'],
  ['Pending', 1, 'Pending'],
  ['Not Qualified', 1, 'Disqualified'],
  ['Shortlisted', 1, 'Shortlisted'],
];

describe('normalizeStatus — live production data', () => {
  it('maps every value currently stored in production', () => {
    for (const [raw, , expected] of LIVE_VALUES) {
      expect(normalizeStatus(raw), `"${raw}" should map to ${expected}`).toBe(expected);
    }
  });

  it('accounts for all 70 applicants without dropping any', () => {
    const total = LIVE_VALUES.reduce((sum, [, n]) => sum + n, 0);
    expect(total).toBe(70);
    for (const [raw] of LIVE_VALUES) expect(normalizeStatus(raw)).not.toBeNull();
  });

  it('reads a leftover "Recommended for Hiring" as Shortlisted, not Qualified', () => {
    // Two buttons wrote this one string — document screening and the
    // post-ranking action — so a row still carrying it cannot say which stage
    // it reached. Migration 20260926 resolves the ones with an evaluation
    // record; what is left never sat the interview. Overstating that in a
    // status the applicant can see is the worse error.
    expect(normalizeStatus('Recommended for Hiring')).toBe('Shortlisted');
    expect(funnelBucket('Shortlisted')).toBe('assessment');
  });

  it('still has a value that means the selection process is complete', () => {
    expect(normalizeStatus('Qualified')).toBe('Qualified');
    expect(funnelBucket('Qualified')).toBe('qualified');
  });

  it('does not count "Not Qualified" as qualified', () => {
    // The original substring matcher did exactly this: 'not qualified' contains
    // 'qualif'.
    expect(normalizeStatus('Not Qualified')).toBe('Disqualified');
    expect(funnelBucket(normalizeStatus('Not Qualified')!)).toBe('closed');
  });

  it('keeps hired applicants in the funnel', () => {
    // They previously fell through every bucket and vanished from the pipeline.
    expect(funnelBucket(normalizeStatus('Hired')!)).toBe('selected');
  });

  it('ignores case and extra whitespace', () => {
    expect(normalizeStatus('  under   review ')).toBe('Under Initial Screening');
    expect(normalizeStatus('HIRED')).toBe('Selected');
  });

  it('returns null for an unrecognised value rather than guessing', () => {
    // Defaulting to Submitted would resurrect closed applications silently.
    expect(normalizeStatus('Something Nobody Mapped')).toBeNull();
    expect(normalizeStatus('')).toBeNull();
    expect(normalizeStatus(null)).toBeNull();
  });

  it('passes through a value that is already canonical', () => {
    for (const s of APPLICANT_STATUSES) expect(normalizeStatus(s)).toBe(s);
  });
});

describe('workflow transitions', () => {
  it('follows the specification order', () => {
    expect(canTransition('Submitted', 'Under Initial Screening')).toBe(true);
    expect(canTransition('Under Initial Screening', 'Shortlisted')).toBe(true);
    expect(canTransition('Shortlisted', 'Interview/Exam Scheduled')).toBe(true);
    expect(canTransition('Interview/Exam Scheduled', 'For Evaluation')).toBe(true);
    expect(canTransition('For Evaluation', 'Qualified')).toBe(true);
    expect(canTransition('Qualified', 'Selected')).toBe(true);
  });

  it('refuses to mark an applicant Qualified straight from screening', () => {
    // The whole point of the change: Shortlisted is not Qualified, and passing
    // document screening is not passing the selection process.
    expect(canTransition('Under Initial Screening', 'Qualified')).toBe(false);
    expect(canTransition('Shortlisted', 'Qualified')).toBe(false);
  });

  it('sends a corrected Pending application back to screening, not forward', () => {
    expect(canTransition('Pending', 'Under Initial Screening')).toBe(true);
    expect(canTransition('Pending', 'Shortlisted')).toBe(false);
  });

  it('allows disqualification or non-selection from any live status', () => {
    for (const s of APPLICANT_STATUSES) {
      if (isTerminal(s)) continue;
      expect(canTransition(s, 'Disqualified'), `${s} -> Disqualified`).toBe(true);
      expect(canTransition(s, 'Not Selected'), `${s} -> Not Selected`).toBe(true);
    }
  });

  it('allows nothing after a terminal status', () => {
    for (const s of ['Selected', 'Disqualified', 'Not Selected'] as ApplicantWorkflowStatus[]) {
      expect(nextStatuses(s)).toEqual([]);
    }
  });
});

describe('applicant-facing messages', () => {
  it('covers every status', () => {
    for (const s of APPLICANT_STATUSES) {
      expect(APPLICANT_MESSAGES[s], `missing message for ${s}`).toBeTruthy();
    }
  });

  it('tells a pending applicant to resubmit', () => {
    expect(APPLICANT_MESSAGES.Pending).toMatch(/resubmit/i);
  });

  it('tells a shortlisted applicant they are awaiting a schedule', () => {
    expect(APPLICANT_MESSAGES.Shortlisted).toMatch(/waiting for interview\/examination schedule/i);
  });

  it('does not leak internal reasoning to a non-selected applicant', () => {
    const msg = APPLICANT_MESSAGES['Not Selected'];
    expect(msg).toMatch(/not selected/i);
    expect(msg).not.toMatch(/another applicant|internal|score|rank/i);
  });
});
