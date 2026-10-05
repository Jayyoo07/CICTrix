import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING_SCALE, type RatingScaleEntry } from './ipcrRatingScale';

describe('the built-in rating scale (spec §G)', () => {
  it('covers every rating the Phase 2 sheet offers', () => {
    // The sheet's dropdowns are 1–5. A rating an employee can pick but that the
    // legend does not explain is the exact gap §G exists to close.
    const ratings = DEFAULT_RATING_SCALE.map((r) => r.rating).sort((a, b) => a - b);
    expect(ratings).toEqual([1, 2, 3, 4, 5]);
  });

  it('reads highest first', () => {
    const order = DEFAULT_RATING_SCALE.map((r) => r.rating);
    expect(order).toEqual([...order].sort((a, b) => b - a));
  });

  it('gives every rating both a label and a description', () => {
    // The description is what the employee reads; a blank one would leave them
    // guessing while the legend looked populated.
    for (const r of DEFAULT_RATING_SCALE) {
      expect(r.label.trim(), `rating ${r.rating} label`).not.toBe('');
      expect(r.description.trim(), `rating ${r.rating} description`).not.toBe('');
    }
  });

  it('distinguishes meeting the target from exceeding it', () => {
    // §G's own wording: 3 met, 4 exceeded, 5 significantly exceeded. If 3 and 4
    // read the same, the scale has not told the employee anything.
    const by = (n: number) => DEFAULT_RATING_SCALE.find((r) => r.rating === n) as RatingScaleEntry;
    expect(by(3).description).toMatch(/meets/i);
    expect(by(4).description).toMatch(/exceeds/i);
    expect(by(5).description).toMatch(/significantly exceeds|exceptional/i);
    expect(by(2).description).toMatch(/partially/i);
    expect(by(1).description).toMatch(/did not meet/i);
  });

  it('has no duplicate ratings', () => {
    const seen = new Set(DEFAULT_RATING_SCALE.map((r) => r.rating));
    expect(seen.size).toBe(DEFAULT_RATING_SCALE.length);
  });
});
