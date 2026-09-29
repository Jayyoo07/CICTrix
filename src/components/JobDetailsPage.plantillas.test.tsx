import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobPosting } from '../types/recruitment.types';

// A posting with three admin-named plantillas: one open, one filled, one the
// applicant already applied to. Old ABYAN-style internal keys are present on
// purpose — they must never reach the screen.
const job = {
  id: 'job-legal-1',
  jobCode: 'ABYAN-2026-297',
  title: 'Admin Aid I',
  department: 'Legal',
  status: 'Active',
  salaryGrade: 10,
  applicationDeadline: '2099-12-31T00:00:00.000Z',
  postedDate: '2026-09-25T00:00:00.000Z',
  requiredDocuments: ['Resume/CV', 'Application Letter'],
  responsibilities: [],
  summary: '',
  qualifications: { education: '', experience: { years: 0, field: '' }, skills: [], certifications: [] },
  plantillaSlots: [
    { id: 'slot-a', jobPostingId: 'job-legal-1', slotNumber: 1, label: 'Plantilla 20', itemNumber: 'ABYAN-2026-297', status: 'filled' },
    { id: 'slot-b', jobPostingId: 'job-legal-1', slotNumber: 2, label: 'Plantilla 100', itemNumber: 'ABYAN-2026-298', status: 'open', salaryGrade: 10 },
    { id: 'slot-c', jobPostingId: 'job-legal-1', slotNumber: 3, label: 'Plantilla 3', itemNumber: 'PLT-0A1B2C3D4E', status: 'open' },
  ],
} as unknown as JobPosting;

vi.mock('../lib/recruitmentData', () => ({
  getJobPostings: () => [job],
  loadJobPostings: () => Promise.resolve([job]),
}));

vi.mock('../lib/supabase', () => ({ supabase: {}, ATTACHMENTS_BUCKET: 'x', isMockModeEnabled: () => false }));

vi.mock('../lib/plantillaSlots', () => ({
  fetchSlotApplicantCounts: () => Promise.resolve(new Map([['slot-b', 15]])),
}));

const renderPage = async () => {
  const { JobDetailsPage } = await import('./JobDetailsPage');
  render(
    <MemoryRouter initialEntries={['/job-details/job-legal-1']}>
      <Routes>
        <Route path="/job-details/:jobId" element={<JobDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.findByRole('heading', { name: /Choose your plantilla items/ });
};

describe('Job Details — "Choose your plantilla items"', () => {
  beforeEach(() => {
    // jsdom has no matchMedia; the page uses it for its desktop/mobile layout.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    localStorage.clear();
    sessionStorage.clear();
    // This browser already applied to Plantilla 3.
    localStorage.setItem('cictrix_applied_plantilla', JSON.stringify({ 'slot-c': { referenceNo: 'ABYAN-748-102', at: '' } }));
  });

  it('shows each plantilla by its admin label and salary grade only', async () => {
    const heading = await renderPage();
    const chooser = heading.closest('section') as HTMLElement;

    expect(within(chooser).getByText('Plantilla 20')).toBeInTheDocument();
    expect(within(chooser).getByText('Plantilla 100')).toBeInTheDocument();
    expect(within(chooser).getAllByText('SG 10').length).toBeGreaterThan(0);
  });

  it('never shows a plantilla item number or any ABYAN-style code', async () => {
    await renderPage();

    expect(screen.queryByText(/Plantilla Item No/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ABYAN-\d/);
    expect(document.body.textContent).not.toMatch(/PLT-/);
  });

  it('lets the applicant select an open plantilla', async () => {
    await renderPage();

    const checkbox = screen.getByRole('checkbox', { name: /Plantilla 100/ });
    expect(checkbox).toBeEnabled();
  });

  it('shows an already-applied plantilla as "Already applied" and not selectable', async () => {
    const heading = await renderPage();
    const chooser = heading.closest('section') as HTMLElement;

    expect(within(chooser).getByText('Already applied')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Plantilla 3/ })).not.toBeInTheDocument();
    const applied = within(chooser).getByText('Plantilla 3').closest('[aria-disabled="true"]');
    expect(applied).not.toBeNull();
  });

  it('shows a filled plantilla as disabled with a reason, not hidden', async () => {
    await renderPage();

    const filled = screen.getByText('Plantilla 20').closest('[aria-disabled="true"]');
    expect(filled).not.toBeNull();
    expect(filled).toHaveAttribute('data-tooltip', expect.stringMatching(/filled/i));
  });

  it('no longer lists Curriculum Vitae as a required document', async () => {
    await renderPage();

    const docs = screen.getByRole('heading', { name: 'Required documents' }).closest('section') as HTMLElement;
    expect(within(docs).queryByText(/Resume\/CV|Curriculum Vitae/i)).not.toBeInTheDocument();
    expect(within(docs).getByText('Application Letter')).toBeInTheDocument();
  });
});
