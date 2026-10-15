# PM dashboard submission rate and IPCR results: summary

Plan: [2026-10-16-pm-dashboard.md](../plans/2026-10-16-pm-dashboard.md). Mockup: [2026-10-16-pm-dashboard.html](../mockups/2026-10-16-pm-dashboard.html) (v3).

## Shipped vs. planned

All plan decisions (D1–D7) shipped in `633cb5b`:

- **Header strip:** gradient strip with breadcrumb, title, the rating period and a department filter that scopes every section. Replaces the old header, its unwired "How to Navigate" button and the mis-encoded "â€”" subtitle.
- **KPI row:** IPCR submission rate (rated of active, progress bar, overdue badge, due in 30 days) replaces "Completed evaluations"; Pending IPCR reviews, Pending (probationary) and Pending (regular) stay, with overdue / due-soon badges.
- **IPCR submission by department:** rated IPCRs over active headcount per office, lowest rate first, with overdue / due-in-30-days status.
- **IPCR results:** office average, Outstanding, Very Satisfactory or higher, rated U or P; whole-office rating mix; per-office rating mix and average, highest first; needs-intervention list (U and P, lowest first) linking to Summary of Ratings; inflation callout when the data triggers it.
- The Performance Distribution donut is removed. The Action Required queue (collapsible, from PR #4 merged the same day), the watchlist and the IPCR Submissions table stay below, unchanged.

New code: `src/modules/admin/PmDashboardOverview.tsx` (with exported `summarizeSubmission` and `summarizeResults`), `src/styles/pm-dashboard.css`, `PmDashboardOverview.test.tsx`.

## Deviations

- **Empty departments read "No department".** The live ratings view returns all 51 rated records with a null department, so the department tables show one "No department" row. Summary of Ratings shows the same 51 / 51 under a blank department; the data needs offices assigned before the per-office views become useful.
- **Null departments crashed the first local render** (`.trim()` on null, despite the `string` type). Fixed with guards and a regression test before commit.
- **Card headers wrap** below 375px, because the "Summary of Ratings ›" link pushed the page 18px wide.

## Checks

- `npx tsc --noEmit`: clean.
- `npm test`: 31 files, 316 tests pass, including 7 new tests in `PmDashboardOverview.test.tsx`.
- `npm run build`: passes (existing large-chunk warning only).
- Local check at 1366×768 and 375×812 against the live database: renders 51 of 51 submitted, office average 4.15 (Very Satisfactory), matching Summary of Ratings; no horizontal scroll at either width.
- Deploy: pushed `main` (`633cb5b`). About 135s later cic-trix.vercel.app (`index-BYcJ5f5X.js`) and cictrix-hr-demo.vercel.app (`index-CVTeqPsh.js`) both served bundles containing the new dashboard.
