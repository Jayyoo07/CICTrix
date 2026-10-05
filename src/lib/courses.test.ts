import { describe, expect, it } from 'vitest';
import { COURSES, COURSE_GROUPS, OTHER_COURSE, canonicalCourse, isCanonicalCourse } from './courses';

describe('the standardised course list', () => {
  it('has no duplicate course across groups', () => {
    expect(new Set(COURSES).size).toBe(COURSES.length);
  });

  it('does not contain the Others escape hatch as a real course', () => {
    // "Others" is a UI choice, not a degree. Storing it would reintroduce
    // exactly the unusable value the list exists to prevent.
    expect(COURSES).not.toContain(OTHER_COURSE);
  });

  it('gives every group a label and at least one course', () => {
    for (const g of COURSE_GROUPS) {
      expect(g.label.trim()).not.toBe('');
      expect(g.courses.length).toBeGreaterThan(0);
    }
  });
});

describe('canonicalCourse', () => {
  it('collapses the four spellings named in the specification', () => {
    const canonical = 'Bachelor of Science in Information Systems';
    for (const written of [
      'BS Information Systems',
      'BSIS',
      'Bachelor of Science in Information Systems',
      'B.S. Information Systems',
    ]) {
      expect(canonicalCourse(written), `"${written}"`).toBe(canonical);
    }
  });

  it('does not confuse Information Systems with Information Technology', () => {
    // Two real, different degrees that an over-eager fuzzy match would merge.
    expect(canonicalCourse('BSIT')).toBe('Bachelor of Science in Information Technology');
    expect(canonicalCourse('BSIS')).toBe('Bachelor of Science in Information Systems');
  });

  it('ignores case, spacing and punctuation', () => {
    expect(canonicalCourse('  bachelor  of science in  nursing ')).toBe('Bachelor of Science in Nursing');
    expect(canonicalCourse('B.S. Accountancy')).toBe('Bachelor of Science in Accountancy');
  });

  it('returns null for a course it does not recognise', () => {
    // Deliberately not a near-miss guess: a wrong canonical name is harder to
    // notice than an unrecognised one, and this decides whether an applicant's
    // own words are kept.
    expect(canonicalCourse('Bachelor of Science in Marine Transportation')).toBeNull();
    expect(canonicalCourse('')).toBeNull();
    expect(canonicalCourse(null)).toBeNull();
    expect(canonicalCourse(undefined)).toBeNull();
  });

  it('recognises every course in the list', () => {
    for (const c of COURSES) expect(canonicalCourse(c), c).toBe(c);
  });

  it('is idempotent', () => {
    const once = canonicalCourse('BSIT')!;
    expect(canonicalCourse(once)).toBe(once);
  });
});

describe('isCanonicalCourse', () => {
  it('decides whether the form shows the list or the Others box', () => {
    // A stored value that is not on the list has to reopen as free text, or a
    // returning applicant silently loses what they entered.
    expect(isCanonicalCourse('BSIT')).toBe(true);
    expect(isCanonicalCourse('Bachelor of Science in Marine Transportation')).toBe(false);
    expect(isCanonicalCourse('')).toBe(false);
  });
});
