import { describe, expect, it } from 'vitest';
import { effectiveStatus, trainingProgress } from './trainingProgress';

const NOW = new Date('2026-10-11T10:00:00+08:00');

const ev = (startDate: string, endDate: string | null = null, status: any = 'Scheduled') => ({ startDate, endDate, status });

describe('effectiveStatus', () => {
  it('keeps Cancelled whatever the dates say', () => {
    expect(effectiveStatus(ev('2026-01-05T00:00:00Z', null, 'Cancelled'), NOW)).toBe('Cancelled');
  });

  it('derives the rest from the dates, ignoring a stale stored status', () => {
    expect(effectiveStatus(ev('2026-12-01T00:00:00Z'), NOW)).toBe('Scheduled');
    expect(effectiveStatus(ev('2026-10-10T00:00:00Z', '2026-10-12T00:00:00Z'), NOW)).toBe('Ongoing');
    expect(effectiveStatus(ev('2026-03-01T00:00:00Z', '2026-03-02T00:00:00Z', 'Scheduled'), NOW)).toBe('Completed');
  });

  it('treats a single-day training as ongoing for that whole day', () => {
    expect(effectiveStatus(ev('2026-10-11T01:00:00+08:00'), NOW)).toBe('Ongoing');
    expect(effectiveStatus(ev('2026-10-10T01:00:00+08:00'), NOW)).toBe('Completed');
  });
});

describe('trainingProgress', () => {
  it('counts each status and excludes cancelled trainings from the total', () => {
    const p = trainingProgress(
      [
        ev('2026-02-01T00:00:00Z'),
        ev('2026-03-01T00:00:00Z'),
        ev('2026-10-10T00:00:00Z', '2026-10-12T00:00:00Z'),
        ev('2026-12-01T00:00:00Z'),
        ev('2026-05-01T00:00:00Z', null, 'Cancelled'),
      ],
      NOW,
    );
    expect(p).toEqual({ completed: 2, ongoing: 1, scheduled: 1, cancelled: 1, total: 4, percent: 50 });
  });

  it('reports 0% with no trainings rather than dividing by zero', () => {
    expect(trainingProgress([], NOW)).toEqual({ completed: 0, ongoing: 0, scheduled: 0, cancelled: 0, total: 0, percent: 0 });
  });
});
