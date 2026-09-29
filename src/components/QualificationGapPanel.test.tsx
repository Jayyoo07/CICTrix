import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { JobPosting } from '../types/recruitment.types';
import { QualificationGapPanel } from './QualificationGapPanel';

const posting = {
  id: 'job-1',
  title: 'Legal Assistant I',
  department: 'Legal',
  salaryGrade: 8,
  qualifications: {
    education: 'College Graduate',
    experience: { years: 1, field: '' },
    skills: ['Legal research'],
    certifications: [],
  },
} as unknown as JobPosting;

const senior = { ...posting, id: 'job-2', title: 'Paralegal', salaryGrade: 15 } as JobPosting;

describe('QualificationGapPanel ("Where do I stand?")', () => {
  it('is always open: no Check Now / Hide toggle', () => {
    render(<QualificationGapPanel posting={posting} allPostings={[posting, senior]} department="Legal" />);

    expect(screen.queryByRole('button', { name: /check now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hide/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { expanded: false })).not.toBeInTheDocument();
  });

  it('shows its content straight away, including the senior-position comparison', () => {
    render(<QualificationGapPanel posting={posting} allPostings={[posting, senior]} department="Legal" />);

    expect(screen.getByRole('heading', { name: 'Where do I stand?' })).toBeInTheDocument();
    expect(screen.getByText(/most senior Legal position/)).toBeInTheDocument();
    expect(screen.getByLabelText('Your highest educational attainment')).toBeVisible();
    expect(screen.getByLabelText('Years of relevant work experience')).toBeVisible();
    expect(screen.getByLabelText('Your skills')).toBeVisible();
  });

  it('prompts for background instead of looking empty before any input', () => {
    render(<QualificationGapPanel posting={posting} allPostings={[posting]} department="Legal" />);

    expect(screen.getByText(/Fill in your background above/)).toBeInTheDocument();
  });
});
