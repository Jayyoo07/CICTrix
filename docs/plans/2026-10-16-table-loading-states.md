---
title: Loading states for Supabase-backed tables
date: 2026-10-16
status: Done
summary: Show skeleton rows on first load and keep dimmed rows with a thin progress bar on refetch, so tables stop popping in after a blank pause.
spec: Option C in docs/mockups/2026-10-16-table-loading-states.html (chosen 2026-10-16)
---

## Goal

Tables that read from Supabase show nothing, or a plain "Loading…" line, until the data arrives, and then the rows appear at once. Users can't tell whether the page is still working or has failed. Every data-backed table should show that it is loading, keep its size while it does, and never go blank on a refresh.

## Approach

Build to `docs/mockups/2026-10-16-table-loading-states.html`, option C, using DESIGN_IDENTITY tokens. One shared set of pieces in `src/components/table-loading/` (a new module folder: `index.ts`, `README.md`, `_internal/`), then swap each table's ad-hoc loading markup for it. No API, query or schema changes.

| # | Decision |
|---|---|
| D1 | **First load shows skeleton rows** (`<TableSkeletonRows columns rows />`) inside the real `<tbody>`, under the real header, toolbar and footer. One shimmer bar per cell, sized by an optional per-column shape (`text`, `two-line`, `badge`, `button`). The row count matches the table's page size (default 5). |
| D2 | **Refetch keeps the old rows**, dimmed to 45% and not clickable, with a 3px indeterminate `--color-primary` bar under the header (`<TableRefreshBar active />`). This applies to refetches after a save, realtime refreshes (`useRealtimeRefresh`), and server-side paging or search where a table has it. |
| D3 | **Timing in one hook**, `useDelayedLoading(loading)`: nothing shows for the first 200ms, and once shown the loader stays at least 400ms. Both are named constants. Fast loads go straight to data. |
| D4 | **Rows fade in over 200ms** after loading ends. Shimmer, bar and fade all stop under `prefers-reduced-motion`. |
| D5 | **Accessibility:** the table gets `aria-busy` while loading, plus a visually hidden `role="status"` "Loading…" line. Skeleton cells are `aria-hidden`. |
| D6 | **Errors are out of scope.** Tables that already show an error keep it; adding Retry to tables that don't is separate work. |
| D7 | **Only tables fed by Supabase.** Demo and prototype tables (`pm/demo/*`, `prototypes/*`) and static tables are left alone. The existing Interviewer and applicant-flow skeletons stay as they are (no sweep). |

## Steps

1. Build the module: `useDelayedLoading`, `TableSkeletonRows`, `TableRefreshBar`, and their CSS (shimmer reusing the existing 1.2s sweep). Unit-test the hook's delay and minimum-duration timing with fake timers.
2. Roll out by portal, one commit each, replacing the current loading markup in that portal's tables:
   - **RSP / public:** ApplicationsListPage, ApplicantRankingPage, QualifiedApplicantsPage, QualifiedApplicantsSection, ForHiringPage, JobPostingsPage, NewlyHiredPage, PendingAssignmentList, RaterManagementPage/Subsection, OfficeDirectorySection, CriticalPositionPage, CriticalPositionGapAnalysisPage, SuccessionPlanningPage, SalaryGradesPage, JobPortalPage, LandingPage vacancies, RSPDashboard.
   - **L&D:** LndTrainingNeeds, LndTrainingEvaluation, LndArchive, LndIdpFormSettings, TrainingCourses, TrainingCalendar, CompetencyFrameworkPage.
   - **PM:** PMDashboard, PMIPCRManagement, PMCompetencyFramework, PMPromotionalApplications, PMReportsAnalytics, OfficeAccountConsole, OfficeTrainingCourses, IpcrArchiveSemester, IPCRManagementPage, SupervisorAccessPage, SystemAdministrationPage.
   - **Employee / Interviewer:** EmployeePage, EmployeePhase2, InterviewerApplicantsList, EvaluationForm.
3. In each file, first confirm the table is actually fed by Supabase; skip it and note why if not. Where a table has no loading flag today, add one around its existing fetch.
4. Run the §16 checklist, then `/code-review` on the branch.

## Risks

- About 40 files touched. Mitigated by one shared component, one commit per portal, and leaving each table's fetch logic as it is.
- Some pages load the whole page behind one `loading` flag, so the skeleton would show for only one table. Those get a per-table flag only if the change stays inside that file.
- A refetch that clears the list before fetching would still blank the table. Where that happens, keep the previous rows until the new ones arrive.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm test`.
- In the browser, with network throttling at Fast 3G: one table per portal shows the skeleton on first load, dimmed rows plus the bar after a save or page change, and no flash on an unthrottled load. Check reduced motion and mobile width.
