/**
 * The CSC salary schedule, for surfaces that show a pay range.
 *
 * Loaded once per page rather than per row: the vacancy tables render many
 * jobs, and each fetching the same 33 grades would be wasteful and could render
 * them inconsistently mid-load.
 *
 * Starts empty and stays empty on failure. Every caller treats an empty
 * schedule as "fall back to the amount stored on the post", so a public job
 * page still shows a salary if this table is unreachable.
 */

import { useEffect, useState } from 'react';
import { listSalaryGrades, type SalaryGradeRow } from '../lib/api/salaryGrades';

export function useSalarySchedule(): SalaryGradeRow[] {
  const [schedule, setSchedule] = useState<SalaryGradeRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listSalaryGrades().then((res) => {
      if (!cancelled && res.ok) setSchedule(res.data);
    });
    return () => { cancelled = true; };
  }, []);

  return schedule;
}
