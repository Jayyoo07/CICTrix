import { describe, expect, it } from 'vitest';
import { computeOverallScore } from './ipcrWorkspace';

/**
 * Specification K: each function's average is multiplied by its designated
 * weight, and functions that do not apply are left out of the calculation.
 *
 * These pin the behaviour that succession's IPCR rollup depends on — it passed
 * null weights for every department, so every score was an unweighted mean
 * regardless of how the office was configured.
 */
describe('computeOverallScore — specification K', () => {
  it('weights each function average by its designated weight', () => {
    // Schema C: Core 50 / Strategic 30 / Support 20
    const score = computeOverallScore([
      { average: 4.5, weight: 50 },
      { average: 4.33, weight: 30 },
      { average: 4.33, weight: 20 },
    ]);
    // (4.5*50 + 4.33*30 + 4.33*20) / 100 = 4.416
    expect(score).toBeCloseTo(4.42, 2);
  });

  it('differs from the unweighted mean when weights are uneven', () => {
    const parts = [
      { average: 5.0, weight: 60 },
      { average: 3.0, weight: 40 },
    ];
    const weighted = computeOverallScore(parts)!;
    const unweighted = computeOverallScore(parts.map((p) => ({ ...p, weight: null })))!;
    // 4.2 vs 4.0 — the gap is exactly what was being lost.
    expect(weighted).toBeCloseTo(4.2, 2);
    expect(unweighted).toBeCloseTo(4.0, 2);
    expect(weighted).not.toBeCloseTo(unweighted, 2);
  });

  it('excludes a function that does not apply', () => {
    // Schema B: Core 60 / Support 40, no Strategic. A null average drops out
    // rather than counting as zero.
    const score = computeOverallScore([
      { average: 4.0, weight: 60 },
      { average: null, weight: 0 },
      { average: 5.0, weight: 40 },
    ]);
    expect(score).toBeCloseTo(4.4, 2);
  });

  it('falls back to an unweighted mean when no weights are configured', () => {
    // Documented fallback: an office with no active schema is averaged plainly
    // rather than scored against zeroes.
    const score = computeOverallScore([
      { average: 4.0, weight: null },
      { average: 5.0, weight: null },
    ]);
    expect(score).toBeCloseTo(4.5, 2);
  });

  it('returns null when nothing has been rated', () => {
    expect(computeOverallScore([{ average: null, weight: 50 }])).toBeNull();
    expect(computeOverallScore([])).toBeNull();
  });
});
