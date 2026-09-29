import { describe, expect, it } from 'vitest';
import {
  applicantsPerPlantillaText,
  duplicatePlantillaMessage,
  hasAppliedToPlantilla,
  internalPlantillaKey,
  isApplicationReferenceNo,
  isDuplicatePlantillaApplication,
  isPlantillaHasApplicationsError,
  ONE_PER_PLANTILLA_INDEX,
  partitionBySubmitted,
  plantillaLabel,
  REFERENCE_NO_PATTERN,
  validatePlantillaLabels,
} from './plantillaRules';

describe('plantilla labels', () => {
  it('shows the admin label, falling back to the ordinal', () => {
    expect(plantillaLabel({ label: 'Plantilla 20', slotNumber: 1 })).toBe('Plantilla 20');
    expect(plantillaLabel({ label: '  ', slotNumber: 3 })).toBe('Plantilla 3');
    expect(plantillaLabel({ slotNumber: 2 })).toBe('Plantilla 2');
  });

  it('accepts free-text / numeric labels that are unique per position', () => {
    expect(validatePlantillaLabels(['Plantilla 1', 'Plantilla 2', 'Plantilla 100'])).toBe('');
  });

  it('requires a name', () => {
    expect(validatePlantillaLabels(['Plantilla 1', '   '])).toMatch(/row 2 needs a name/);
    expect(validatePlantillaLabels([])).toMatch(/at least one/);
  });

  it('rejects duplicates within a position, ignoring case and spacing', () => {
    expect(validatePlantillaLabels(['Plantilla 2', ' plantilla   2 '])).toMatch(/both named/);
  });

  it('never lets a plantilla be named like a reference number', () => {
    expect(validatePlantillaLabels(['ABYAN-2026-297'])).toMatch(/looks like an application Reference No/);
    expect(validatePlantillaLabels(['abyan 748-102'])).toMatch(/Reference No/);
  });

  it('formats applicant counts per plantilla', () => {
    expect(applicantsPerPlantillaText('Plantilla 1', 15)).toBe('Plantilla 1: 15 applicants');
    expect(applicantsPerPlantillaText('Plantilla 2', 1)).toBe('Plantilla 2: 1 applicant');
  });

  it('issues internal plantilla keys that are not ABYAN-shaped', () => {
    const key = internalPlantillaKey();
    expect(key).toMatch(/^PLT-[0-9A-F]{10}$/);
    expect(key).not.toMatch(/ABYAN/);
    expect(isApplicationReferenceNo(key)).toBe(false);
  });
});

describe('reference number format (applications only)', () => {
  it('matches what the database generator issues', () => {
    expect(isApplicationReferenceNo('ABYAN-748-102')).toBe(true);
    expect(isApplicationReferenceNo('abyan-748-102')).toBe(true);
    expect(isApplicationReferenceNo('ABYAN-748-102-331')).toBe(true);
  });

  it('does not treat old plantilla codes or legacy tracking codes as reference numbers', () => {
    expect(isApplicationReferenceNo('ABYAN-2026-297')).toBe(false);
    expect(isApplicationReferenceNo('APP-2026-GEZDTCG')).toBe(false);
    expect(isApplicationReferenceNo('')).toBe(false);
    expect(REFERENCE_NO_PATTERN.test('Plantilla 2')).toBe(false);
  });
});

describe('one application per applicant per plantilla', () => {
  const existing = [
    { email: 'juan@example.com', plantillaSlotId: 'slot-1' },
    { email: 'maria@example.com', plantillaSlotId: 'slot-1' },
  ];

  it('blocks the same applicant applying to the same plantilla twice', () => {
    expect(hasAppliedToPlantilla(existing, 'juan@example.com', 'slot-1')).toBe(true);
    expect(hasAppliedToPlantilla(existing, '  JUAN@Example.com ', 'slot-1')).toBe(true);
  });

  it('lets the same applicant apply to a different plantilla', () => {
    expect(hasAppliedToPlantilla(existing, 'juan@example.com', 'slot-2')).toBe(false);
  });

  it('lets many applicants apply to the same plantilla', () => {
    expect(hasAppliedToPlantilla(existing, 'pedro@example.com', 'slot-1')).toBe(false);
  });

  it('splits a multi-plantilla submission into new and already-applied', () => {
    const choices = [
      { plantillaSlotId: 'slot-1', label: 'Plantilla 1' },
      { plantillaSlotId: 'slot-2', label: 'Plantilla 2' },
      { plantillaSlotId: null, label: 'General' },
    ];
    const { toSubmit, alreadyApplied } = partitionBySubmitted(choices, existing, 'juan@example.com');
    expect(alreadyApplied.map((c) => c.label)).toEqual(['Plantilla 1']);
    expect(toSubmit.map((c) => c.label)).toEqual(['Plantilla 2', 'General']);
  });

  it('recognises the database duplicate error, and only that one', () => {
    expect(isDuplicatePlantillaApplication({
      code: '23505',
      message: `duplicate key value violates unique constraint "${ONE_PER_PLANTILLA_INDEX}"`,
    })).toBe(true);
    // Some other unique violation (e.g. reference number) is not this rule.
    expect(isDuplicatePlantillaApplication({
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_applicants_reference_no_normalized"',
    })).toBe(false);
    expect(isDuplicatePlantillaApplication({ code: '42703', message: ONE_PER_PLANTILLA_INDEX })).toBe(false);
    expect(isDuplicatePlantillaApplication(null)).toBe(false);
  });

  it('explains the duplicate in plain language', () => {
    expect(duplicatePlantillaMessage('Plantilla 2')).toMatch(/already applied to Plantilla 2/);
  });

  it('recognises a blocked plantilla delete', () => {
    expect(isPlantillaHasApplicationsError({ message: 'plantilla_has_applications: "Plantilla 1" has 3 application(s).' })).toBe(true);
    expect(isPlantillaHasApplicationsError({ message: 'something else' })).toBe(false);
  });
});
