import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleApplicantsModal } from './ScheduleApplicantsModal';
import { SchedulingTree } from './SchedulingTree';
import type { ApplicantRecord } from './QualifiedApplicantsSection';

const scheduleApplicantsBatch = vi.fn();
vi.mock('../lib/applicantSchedule', () => ({
  scheduleApplicantsBatch: (...args: unknown[]) => scheduleApplicantsBatch(...args),
}));

const applicant = (id: string, full_name: string, position: string, office: string): ApplicantRecord => ({
  id,
  full_name,
  email: `${id}@example.com`,
  contact_number: '',
  position,
  office,
  status: 'Shortlisted',
  created_at: '2026-10-01',
  total_score: null,
  reference_no: `REF-${id}`,
});

const applicants = [
  applicant('1', 'Ana Cruz', 'Engineer I', "City Engineer's Office"),
  applicant('2', 'Ben Lim', 'Engineer I', "City Engineer's Office"),
  applicant('3', 'Cara Dee', 'Budget Officer', 'City Budget Office'),
];

const Harness = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <>
      <p data-testid="count">{selected.size}</p>
      <SchedulingTree applicants={applicants} selected={selected} onSelectionChange={setSelected} />
    </>
  );
};

describe('SchedulingTree', () => {
  it('shows only departments until one is opened', () => {
    render(<Harness />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /City Engineer's Office/ }));
    expect(screen.getByRole('checkbox', { name: 'Select all 2 applicants for Engineer I' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Budget Officer/ })).toBeNull();
  });

  it('selects a whole position, and shows it as partial when one applicant is unchecked', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /City Engineer's Office/ }));
    const engineer = screen.getByRole('checkbox', { name: 'Select all 2 applicants for Engineer I' }) as HTMLInputElement;

    fireEvent.click(engineer);
    expect(screen.getByTestId('count').textContent).toBe('2');
    expect(engineer.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Engineer I/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Ana Cruz/ }));
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(engineer.checked).toBe(false);
    expect(engineer.indeterminate).toBe(true);
  });

  it('has no department checkbox', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /City Engineer's Office/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /City Engineer's Office/ })).toBeNull();
  });
});

describe('ScheduleApplicantsModal', () => {
  const raters = [{ email: 'rater@example.com', name: 'Rita Rater', designation: '' }];

  it('rejects a past date without saving', () => {
    render(<ScheduleApplicantsModal applicants={applicants} raters={raters} onCancel={vi.fn()} onScheduled={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Interview date/), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText(/Assigned rater/), { target: { value: 'rater@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Schedule' }));

    expect(screen.getByRole('alert').textContent).toMatch(/interview date cannot be in the past/);
    expect(scheduleApplicantsBatch).not.toHaveBeenCalled();
  });

  it('requires the oral exam date', () => {
    render(<ScheduleApplicantsModal applicants={applicants} raters={raters} onCancel={vi.fn()} onScheduled={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/^Interview date/), { target: { value: '2099-01-15' } });
    fireEvent.change(screen.getByLabelText(/Assigned rater/), { target: { value: 'rater@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Schedule' }));

    expect(screen.getByRole('alert').textContent).toMatch(/Choose the oral examination date/);
    expect(scheduleApplicantsBatch).not.toHaveBeenCalled();
  });

  it('summarises the selection by position', () => {
    render(<ScheduleApplicantsModal applicants={applicants} raters={raters} onCancel={vi.fn()} onScheduled={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Schedule Applicants' });
    expect(within(dialog).getByText(/3 applicants across 2 positions/)).toBeTruthy();
  });

  it('sends the selection with the chosen session time and reports success', async () => {
    scheduleApplicantsBatch.mockResolvedValueOnce({ success: true, scheduled: 3, advanced: 3 });
    const onScheduled = vi.fn();
    render(<ScheduleApplicantsModal applicants={applicants} raters={raters} onCancel={vi.fn()} onScheduled={onScheduled} />);

    fireEvent.change(screen.getByLabelText(/^Interview date/), { target: { value: '2099-01-15' } });
    fireEvent.click(screen.getByLabelText('Interview: Afternoon (1:00 PM)'));
    fireEvent.change(screen.getByLabelText(/^Oral examination date/), { target: { value: '2099-01-16' } });
    fireEvent.change(screen.getByLabelText(/Assigned rater/), { target: { value: 'rater@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Schedule' }));

    await waitFor(() => expect(onScheduled).toHaveBeenCalled());
    expect(scheduleApplicantsBatch).toHaveBeenCalledWith(expect.objectContaining({
      interviewDate: '2099-01-15',
      interviewTime: '13:00',
      oralExamDate: '2099-01-16',
      oralExamTime: '08:00',
      raterEmail: 'rater@example.com',
      applicants: applicants.map((a) => ({ id: a.id, status: a.status })),
    }));
    expect(onScheduled.mock.calls[0][0]).toMatch(/Scheduled 3 applicants with Rita Rater: interview Jan 15, 2099, 1:00 PM; oral exam Jan 16, 2099, 8:00 AM/);
  });
});
