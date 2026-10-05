import { describe, expect, it } from 'vitest';
import {
  DISQUALIFICATION_REASON_OPTIONS,
  FAILURE_TO_ATTEND,
  buildDisqualificationActivityDescription,
  failureToAttendMessage,
  getDisqualificationReasonLabel,
} from './applicationActivity';

describe('application activity helpers', () => {
  it('formats the reason label for known categories', () => {
    expect(getDisqualificationReasonLabel('failed_qualifications')).toBe('Failed Qualifications');
    expect(getDisqualificationReasonLabel('other')).toBe('Other');
  });

  it('builds a visible applicant-facing description with the provided note', () => {
    const description = buildDisqualificationActivityDescription(
      'incomplete_documents',
      'Please resubmit the missing certificates.',
      true,
    );

    expect(description).toContain('Incomplete Documents');
    expect(description).toContain('Please resubmit the missing certificates.');
  });
});

describe('failure to attend (spec §8/§9)', () => {
  it('is offered as its own reason', () => {
    const option = DISQUALIFICATION_REASON_OPTIONS.find((o) => o.value === FAILURE_TO_ATTEND);
    expect(option).toBeTruthy();
    expect(option!.label).toBe('Failure to Attend Scheduled Interview/Examination');
  });

  it('is not the same reason as failing an assessment', () => {
    // The applicant is told something different: they did not fail an
    // assessment, they did not attend one.
    expect(FAILURE_TO_ATTEND).not.toBe('failed_interview');
    expect(getDisqualificationReasonLabel(FAILURE_TO_ATTEND)).not.toMatch(/failed/i);
  });

  it('names the activity and when it was scheduled', () => {
    const msg = failureToAttendMessage({ type: 'interview', date: 'September 30, 2026', time: '9:00 AM' });
    expect(msg).toMatch(/disqualified due to failure to attend/i);
    expect(msg).toContain('interview');
    expect(msg).toContain('September 30, 2026');
    expect(msg).toContain('9:00 AM');
  });

  it('still explains the disqualification when no activity was recorded', () => {
    // Rows disqualified before the activity was captured must not render a
    // sentence with a blank date in it.
    const msg = failureToAttendMessage(null);
    expect(msg).toMatch(/disqualified due to failure to attend/i);
    expect(msg).not.toMatch(/undefined|null|Scheduled :/);
  });

  it('omits the time when only a date was scheduled', () => {
    const msg = failureToAttendMessage({ type: 'written_exam', date: 'October 1, 2026', time: null });
    expect(msg).toContain('written examination');
    expect(msg).toContain('October 1, 2026');
    expect(msg).not.toContain(' at ');
  });
});
