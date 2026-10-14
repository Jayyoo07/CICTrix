# L&D Dashboard Layout A — summary

Plan: `docs/plans/2026-10-14-lnd-dashboard-layout-a.md`
Mockup: `docs/mockups/2026-10-14-lnd-dashboard-layout-a.html`

## Shipped

- Three compact module summary cards (TNA, IDP, Trainings Done) replace the five tall KPI cards.
- TNA row: 12-competency × office heatmap with % labels and a 6-step legend; "Top competency needs" as `affected / active employees` bars.
- IDP row: submitted vs not yet submitted per office (matched by employee id, not office name); development-request tags as a horizontal stacked bar.
- Trainings Done row: 2-trainings-per-year compliance (overall + per department), "Still needs training" list with 0-of-2 / 1-of-2 filters, View all, and CSV export; Department filter for the row.
- `src/lib/trainingCompliance.ts` (+7 tests) and `listActiveEmployees()` in `src/lib/api/trainingNeeds.ts`.
- Removed: TNA radar, demand table, IDP profile and top-tag tables, department drill-down modal, and the training-request fetch they used.

## Deviations from the plan

- Local render check against real data was skipped: the dashboard needs a login against the live Supabase, and the user chose to deploy directly.
- `npm run lint` could not run: the repo has no ESLint config (pre-existing). Unused-import check done with `tsc --noUnusedLocals` instead; only pre-existing unused imports remain.
- TNA third KPI is "Competencies with gaps x/12" and IDP third KPI is "Top requested tag" (the mockup's coverage and approval figures have no data source, as the plan noted).

## Checks run

- `npx vitest run`: 27 files, 291 tests passed.
- `npx tsc --noEmit`: clean.
- `npm run build`: built (existing chunk-size warning only).
