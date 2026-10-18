import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPosting } from '../types/recruitment.types';

const job = {
  id: 'job-eng-5',
  jobCode: 'OCE-ENG5-001',
  title: 'Engineer V',
  department: 'Office of the City Engineer',
  status: 'Active',
  salaryGrade: 24,
  applicationDeadline: '2099-12-31T00:00:00.000Z',
  postedDate: '2026-10-05T00:00:00.000Z',
  requiredDocuments: ['Application Letter'],
  responsibilities: [],
  summary: '',
  qualifications: { education: '', experience: { years: 0, field: '' }, skills: [], certifications: [] },
  plantillaSlots: [
    { id: 'slot-1', jobPostingId: 'job-eng-5', slotNumber: 1, label: 'Plantilla 1', itemNumber: 'OCE-ENG5-001', status: 'open', salaryGrade: 24 },
  ],
} as unknown as JobPosting;

vi.mock('../lib/recruitmentData', () => ({
  getJobPostings: () => [job],
  loadJobPostings: () => Promise.resolve([job]),
}));

vi.mock('../lib/supabase', () => ({ supabase: {}, ATTACHMENTS_BUCKET: 'x', isMockModeEnabled: () => false }));

vi.mock('../lib/plantillaSlots', () => ({
  fetchSlotApplicantCounts: () => Promise.resolve(new Map()),
}));

/** Stand-in for the Job posts page: shows the edit request it was handed. */
const JobPostsProbe = () => {
  const location = useLocation();
  return <p>edit request: {(location.state as { editJobId?: string } | null)?.editJobId ?? 'none'}</p>;
};

const renderAt = async (path: string) => {
  const { JobDetailsPage } = await import('./JobDetailsPage');
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/job-details/:jobId" element={<JobDetailsPage />} />
        <Route path="/admin/rsp/job/:jobId" element={<JobDetailsPage />} />
        <Route path="/admin/rsp/jobs" element={<JobPostsProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Engineer V' });
};

describe('Job Details — Edit Posting (RSP)', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    localStorage.clear();
    sessionStorage.clear();
  });

  it('opens the Job posts edit form for this posting', async () => {
    await renderAt('/admin/rsp/job/job-eng-5');
    fireEvent.click(screen.getByRole('button', { name: /Edit Posting/ }));
    expect(await screen.findByText('edit request: job-eng-5')).toBeInTheDocument();
  });

  it('is not shown to applicants', async () => {
    await renderAt('/job-details/job-eng-5');
    expect(screen.queryByRole('button', { name: /Edit Posting/ })).not.toBeInTheDocument();
  });
});
