import { describe, expect, it } from 'vitest';
import { isPhaseOpen, pickSchedule, sameGateState } from './employeePhaseGate';
import type { PhaseSchedule } from './phaseSchedules';

const row = (over: Partial<PhaseSchedule>): PhaseSchedule =>
  ({
    id: 'id',
    scope: 'system',
    office_id: null,
    office_name: null,
    phase: 'target_setting',
    mode: 'Auto',
    start_date: null,
    deadline_date: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...over,
  }) as PhaseSchedule;

const OFFICE = 'office-1';

describe('pickSchedule', () => {
  const system = row({ scope: 'system', phase: 'target_setting', mode: 'Open' });
  const override = row({
    id: 'o',
    scope: 'office',
    office_id: OFFICE,
    phase: 'target_setting',
    mode: 'Closed',
  });

  it('prefers the office override over the system default', () => {
    // The bug this pins: the realtime refresh read scope='system' only, so an
    // office held in Phase 1 flipped to the system's state on any change and
    // flipped back on the next full reload.
    expect(pickSchedule([system, override], OFFICE, 'target_setting')).toBe(override);
    expect(isPhaseOpen(pickSchedule([system, override], OFFICE, 'target_setting'))).toBe(false);
  });

  it('falls back to the system default when the office has no override', () => {
    expect(pickSchedule([system, override], 'other-office', 'target_setting')).toBe(system);
    expect(pickSchedule([system], OFFICE, 'target_setting')).toBe(system);
  });

  it('ignores an override belonging to another office', () => {
    expect(pickSchedule([system, override], null, 'target_setting')).toBe(system);
  });

  it('does not let one phase answer for the other', () => {
    expect(pickSchedule([system], null, 'rating')).toBeNull();
  });
});

describe('isPhaseOpen', () => {
  it('treats a missing schedule as closed', () => {
    // PM has to open a phase deliberately. Defaulting an absent row to open
    // would let employees submit into a cycle nobody started.
    expect(isPhaseOpen(null)).toBe(false);
  });

  it('honours a forced mode regardless of dates', () => {
    expect(isPhaseOpen(row({ mode: 'Open', start_date: null, deadline_date: null }))).toBe(true);
    expect(isPhaseOpen(row({ mode: 'Closed', start_date: '2000-01-01', deadline_date: '2999-01-01' }))).toBe(false);
  });

  it('closes an Auto schedule that has no window', () => {
    expect(isPhaseOpen(row({ mode: 'Auto', start_date: null, deadline_date: null }))).toBe(false);
  });

  it('opens an Auto schedule inside its window and closes it outside', () => {
    expect(isPhaseOpen(row({ mode: 'Auto', start_date: '2000-01-01', deadline_date: '2999-01-01' }))).toBe(true);
    expect(isPhaseOpen(row({ mode: 'Auto', start_date: '2000-01-01', deadline_date: '2000-01-02' }))).toBe(false);
  });
});

describe('sameGateState', () => {
  const open = row({ mode: 'Open' });
  const closed = row({ mode: 'Closed' });

  it('compares effective state, not row identity', () => {
    // The poll runs every 15 seconds; re-rendering the whole workspace each
    // time because a different row object came back would discard form focus.
    expect(sameGateState({ target: open, rating: closed }, { target: row({ id: 'x', mode: 'Open' }), rating: closed })).toBe(true);
  });

  it('reports a change when a phase actually flips', () => {
    expect(sameGateState({ target: closed, rating: closed }, { target: open, rating: closed })).toBe(false);
  });

  it('reports a change when a schedule disappears', () => {
    expect(sameGateState({ target: open, rating: closed }, { target: null, rating: closed })).toBe(false);
  });
});
