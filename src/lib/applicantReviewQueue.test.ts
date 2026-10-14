import { describe, expect, it } from 'vitest';
import { nextUndecidedIndex, reviewOutcome, samePositionRows, type ReviewQueueEntry } from './applicantReviewQueue';

const entry = (id: string, status: string): ReviewQueueEntry => ({ id, name: id, status });

describe('reviewOutcome', () => {
  it('treats screening-stage and unknown statuses as undecided', () => {
    expect(reviewOutcome('Submitted')).toBe('undecided');
    expect(reviewOutcome('Under Review')).toBe('undecided');
    expect(reviewOutcome('Pending')).toBe('undecided');
    expect(reviewOutcome('')).toBe('undecided');
  });

  it('treats Shortlisted and later as shortlisted', () => {
    expect(reviewOutcome('Shortlisted')).toBe('shortlisted');
    expect(reviewOutcome('Recommended for Hiring')).toBe('shortlisted');
    expect(reviewOutcome('Qualified')).toBe('shortlisted');
  });

  it('treats closed-out statuses as disqualified', () => {
    expect(reviewOutcome('Not Qualified')).toBe('disqualified');
    expect(reviewOutcome('Disqualified')).toBe('disqualified');
    expect(reviewOutcome('Not Selected')).toBe('disqualified');
  });
});

describe('nextUndecidedIndex', () => {
  it('skips decided applicants', () => {
    const queue = [entry('a', 'Submitted'), entry('b', 'Shortlisted'), entry('c', 'Submitted')];
    expect(nextUndecidedIndex(queue, 0)).toBe(2);
  });

  it('wraps round to earlier undecided applicants', () => {
    const queue = [entry('a', 'Submitted'), entry('b', 'Not Qualified'), entry('c', 'Submitted')];
    expect(nextUndecidedIndex(queue, 2)).toBe(0);
  });

  it('returns -1 when everyone else is decided', () => {
    const queue = [entry('a', 'Shortlisted'), entry('b', 'Submitted'), entry('c', 'Disqualified')];
    expect(nextUndecidedIndex(queue, 1)).toBe(-1);
  });
});

describe('samePositionRows', () => {
  const row = (id: string, position: string, office: string) => ({ id, position, office });

  it('keeps only rows for the same title and office, in order', () => {
    const rows = [row('a', 'Nurse 2', 'Health'), row('b', 'Engineer V', 'Engineering'), row('c', 'Nurse  2', 'health')];
    expect(samePositionRows(rows, rows[2]).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('keeps the same title in another office out of the queue', () => {
    const rows = [row('a', 'Nurse 2', 'Health'), row('b', 'Nurse 2', 'Legal')];
    expect(samePositionRows(rows, rows[0]).map((r) => r.id)).toEqual(['a']);
  });
});
