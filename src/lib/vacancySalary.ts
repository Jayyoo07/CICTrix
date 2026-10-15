import { formatSalary } from './api/salaryGrades';
import type { JobPosting } from '../types/recruitment.types';

/**
 * Monthly salary shown to applicants for a vacancy: the plantillas still open,
 * falling back to the posting's own figure. Plantillas of one post can differ,
 * so a spread shows as a range.
 */
export function vacancySalaryLabel(job: Pick<JobPosting, 'plantillaSlots' | 'monthlySalary'>): string {
  const amounts = (job.plantillaSlots ?? [])
    .filter((slot) => slot.status !== 'closed')
    .map((slot) => Number(slot.monthlySalary))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (amounts.length === 0 && Number(job.monthlySalary) > 0) amounts.push(Number(job.monthlySalary));
  if (amounts.length === 0) return 'Not specified';
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  return low === high ? formatSalary(low) : `${formatSalary(low)} – ${formatSalary(high)}`;
}
