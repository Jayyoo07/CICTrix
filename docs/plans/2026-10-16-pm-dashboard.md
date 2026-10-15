---
title: PM dashboard submission rate and IPCR results
date: 2026-10-16
status: In Progress
summary: Replace the PM dashboard header, KPI cards and Performance Distribution donut with a gradient header, an IPCR submission rate KPI, a submission-by-department table and an IPCR results section, all in DESIGN_IDENTITY.md colors.
spec: docs/mockups/2026-10-16-pm-dashboard.html (chosen 2026-10-16, v3)
---

## Goal

The PM admin sees how far each office is with IPCR submission, which are overdue, and what the ratings look like by office, without opening Summary of Ratings.

## Approach

Build to `docs/mockups/2026-10-16-pm-dashboard.html`. The dashboard section of `src/modules/admin/PMDashboard.tsx` renders a new `PmDashboardOverview` component with styles in `src/styles/pm-dashboard.css`, scoped under `.pmdash` like the RSP dashboard. The Action Required Queue, the Competency & Succession Watchlist and the IPCR Submissions table stay below it unchanged.

| # | Decision |
|---|---|
| D1 | **Submission rate and department table** reuse the Summary of Ratings sources (`getIPCRRecordsFromGapView`, `getActiveHeadcountByDepartment`, `buildDeptCompletionRows`), so the numbers match that page: rated IPCRs over the office's Active headcount. Lowest rate first. |
| D2 | **Overdue and due in 30 days** come from the pending list `loadIpcrStats` already builds (each pending employee's due date), overall and per department. |
| D3 | **IPCR results**: office average, Outstanding count, Very Satisfactory or higher, rated U or P, whole-office rating mix, per-department mix and average (highest first), using `getAdjectival` (4.75 / 4.00 / 3.00 / 2.00). |
| D4 | **Needs intervention** lists employees rated Unsatisfactory or Poor, lowest score first, with View all linking to Summary of Ratings. |
| D5 | **Dropped from the mockup:** trend vs last period and "2nd consecutive" (the ratings view is not period-scoped), the 85% target line (no target exists), and Create Development Plans (no such flow). |
| D6 | **Inflation callout** shows only when an office with at least 5 rated employees has an Outstanding share at least twice the office-wide share. |
| D7 | The department filter in the header scopes every section. KPI "Completed evaluations" becomes the submission rate card. |

## Steps

1. Save this plan and the mockup.
2. Build `PmDashboardOverview.tsx` (pure aggregation helpers + view) and `pm-dashboard.css`.
3. Mount it in `PMDashboard.tsx`, remove the old header, KPI cards and donut.
4. Unit tests for the aggregation helpers.
5. `npx tsc --noEmit`, `npm test`, `npm run build`, local visual check.
6. Commit on `main`, push (deploys cic-trix and cictrix-hr-demo), confirm the live bundles.

## Risks

- The ratings view has no period column, so results cover every rating the view holds, labeled with `REPORT_PERIOD` as Summary of Ratings does.
- Submission rate (rated IPCRs) and overdue (pipeline stage before "Forwarded to PM") use different definitions of "done", as the two existing pages already do.
