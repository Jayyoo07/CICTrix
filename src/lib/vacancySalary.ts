import { formatSalaryRange, stepRangeFor, type SalaryGradeRow } from './api/salaryGrades';
import type { JobPosting } from '../types/recruitment.types';

/**
 * Monthly salary shown to applicants for a vacancy.
 *
 * With the CSC schedule available, this is the PAY RANGE of the grades on
 * offer — Step 1 through whatever steps are configured. Applicants were being
 * shown the Step 1 hiring rate alone, which is the least the post pays rather
 * than what it pays.
 *
 * Without the schedule it falls back to the amounts stored on the post, so the
 * public pages still render before the schedule loads and if it fails to.
 *
 * Plantillas of one post can differ, so a spread across them shows as a range
 * too; both sources are folded into the same low/high.
 */
export function vacancySalaryLabel(
  job: Pick<JobPosting, 'plantillaSlots' | 'monthlySalary' | 'salaryGrade'>,
  schedule?: SalaryGradeRow[],
): string {
  const amounts: number[] = [];

  if (schedule && schedule.length > 0) {
    // Grades still open on this post; the post's own grade when it has no
    // plantilla rows of its own.
    const grades = (job.plantillaSlots ?? [])
      .filter((slot) => slot.status !== 'closed')
      .map((slot) => slot.salaryGrade)
      .filter((g): g is number => g != null);
    if (grades.length === 0 && job.salaryGrade != null) grades.push(job.salaryGrade);

    for (const grade of grades) {
      const range = stepRangeFor(grade, schedule);
      if (range) amounts.push(range.min, range.max);
    }
  }

  if (amounts.length === 0) {
    // No schedule, or none of the grades are in it: use what the post stores.
    const stored = (job.plantillaSlots ?? [])
      .filter((slot) => slot.status !== 'closed')
      .map((slot) => Number(slot.monthlySalary))
      .filter((amount) => Number.isFinite(amount) && amount > 0);
    if (stored.length === 0 && Number(job.monthlySalary) > 0) stored.push(Number(job.monthlySalary));
    amounts.push(...stored);
  }

  if (amounts.length === 0) return 'Not specified';
  return formatSalaryRange(Math.min(...amounts), Math.max(...amounts));
}
