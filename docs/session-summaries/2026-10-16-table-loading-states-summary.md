---
title: Loading states for Supabase-backed tables — summary
date: 2026-10-18
plan: docs/plans/2026-10-16-table-loading-states.md
---

## What shipped

A shared module, `src/components/table-loading/`, built to option C of `docs/mockups/2026-10-16-table-loading-states.html`:

- `useTableLoading` / `useDelayedLoading`: nothing for the first 200ms, then at least 400ms once shown.
- `TableSkeletonRows` for first loads, `TableRefreshBar` / `RefreshBar` plus `tableBodyClass` for refetches (dimmed rows and a 3px bar), and `SkeletonList` / `Skeleton` for lists and card grids that aren't `<table>`s.
- `aria-busy`, a hidden `role="status"` label, and no motion under `prefers-reduced-motion`.

It is rolled out across 33 files:

- **RSP / public:** ApplicationsListPage, ApplicantRankingPage, QualifiedApplicantsPage, QualifiedApplicantsRSPPage, QualifiedApplicantsSection, PendingAssignmentList, ForHiringPage, JobPostingsPage, NewlyHiredPage, RaterManagementPage, RaterManagementSubsection, OfficeDirectorySection, CriticalPositionPage, CriticalPositionGapAnalysisPage, SuccessionPlanningPage, SalaryGradesPage, JobPortalPage, LandingPage, RSPDashboard.
- **L&D:** LndTrainingNeeds, LndArchive, LndIdpFormSettings, LndSummaryOfRatings, TrainingCalendar, CompetencyFrameworkPage.
- **PM / system admin:** PMDashboard, PMIPCRManagement, PMCompetencyFramework, PMPromotionalApplications, PMReportsAnalytics, PMArchive, OfficeTrainingCourses, OfficeAccountConsole, Phase2RatingPanel, IPCRManagementPage, SupervisorAccessPage, SystemAdministrationPage.
- **Employee:** EmployeePhase2.

Several pages also had a blank whole-page "Loading…" early return. Those now render their real header, toolbar and table chrome, with the skeleton only in the body.

## Deviations from the plan

- **Lists and card grids.** Many "tables" are div lists or card grids, so the module gained `SkeletonList`, `Skeleton`, `LoadingStatus` and `RefreshBar`.
- **Refresh bar placement.** The bar only appears where a refetch already set `loading` with rows on screen: Rater Management, Critical Positions, Applications, For Hiring, Office Directory, PM dashboard submissions, PM promotional applications, PM competency requirements, and L&D summary of ratings. Refetches triggered by window focus or update events stay silent, so the bar doesn't flicker every time the tab regains focus.
- **Pages where a refetch used to blank the page.** CompetencyFrameworkPage, IPCR management, system admin and others now keep their content during a refetch instead of swapping back to "Loading…".
- **Some loaders now start `true`.** OfficeDirectorySection and the PM dashboard's evaluation/IPCR loaders, so the first paint is a skeleton instead of an empty-state flash.
- **Added beyond the plan's list:** QualifiedApplicantsRSPPage, PMArchive, Phase2RatingPanel and LndSummaryOfRatings. Each showed the same blank-then-pop behaviour.
- **Skipped.**
  - LndTrainingEvaluation and TrainingCourses: no longer imported anywhere.
  - InterviewerApplicantsList: already has its own skeleton (D7).
  - EvaluationForm, the OfficeAccountConsole access guard, OfficeWeightingPanel and modal internals: forms or gates, not tables.
  - EmployeePage: no table there waits on a loading flag.
  - The `pm/demo/*` and `prototypes/*` tables (D7).

## Bugs found and fixed along the way

- **Timer race.** With a passive effect, the 200ms timer could fire between the commit that rendered the data and the effect cleanup, putting the skeleton back over loaded rows. The full test suite caught it in SalaryGradesPage. The hook now uses a layout effect.
- **Tokens scoped to `.abyan-ds` / `.rsp-ds`.** The design tokens aren't on `:root`, so on the landing page and older portals every `var()` was undefined and the shimmer rendered as nothing. Module CSS now carries each token's value as a fallback.

## Checks run

- `npx tsc --noEmit`: clean.
- `npm test`: 315/315 pass, including 6 new tests for the hook timing and skeleton rows.
- `npm run lint`: cannot run. The repo has no ESLint config, so ESLint 8 errors out before linting anything. This predates the branch.
- **Browser (dev server, landing page).** Throttled `fetch` showed 5 skeleton rows under the real header, with the footer kept in place. Fast loads showed no skeleton, and rows faded in. At 375px there is no page-level horizontal scroll.
- **Not verified in a browser:** the admin portals, which need a login. The refresh bar and those pages' skeletons are covered by tsc and the tests only.
