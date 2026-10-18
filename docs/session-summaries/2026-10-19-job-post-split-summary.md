# Job Post split into Job Positions and Job Vacancies: summary

Plan: [2026-10-19-job-post-split.md](../plans/2026-10-19-job-post-split.md). Mockup: [2026-10-19-job-post-split.html](../mockups/2026-10-19-job-post-split.html) (v2, to DESIGN_IDENTITY.md).

## Shipped vs. planned

All plan decisions (D1–D7) shipped:

- `/admin/rsp/jobs` has two tabs, Job Positions and Job Vacancies, with the tab in `?tab=vacancies`.
- Create Job Position no longer asks for an Application Deadline and saves the position as `Draft`, labelled "Not opened". Editing keeps the position's status and deadline.
- Job Vacancies (`src/components/JobVacanciesPanel.tsx`) lists Active and Closed postings with posting date, deadline and §10 status (Open, Closing soon ≤ 3 days, Deadline passed, Closed). Row actions: Edit Deadline and Close for open vacancies, Reopen for closed ones.
- Open Vacant Job Position: search-as-you-type from one letter over title and department; already-open and filled positions show but can't be picked; ↑/↓/Enter/Esc work. Details are read-only; the Application Deadline (today or later) is the only input.
- Opening reuses the old reopen logic (status Active, posted date now, closed plantilla slots reopened). The old unlock dialog and the lock/unlock buttons on the positions list were removed.
- Helpers in `src/lib/vacancySearch.ts`.

## Deviations

- The mockup's "Plantilla item no." is shown as plantilla labels, since item numbers stay hidden.
- Active postings past their deadline read "Deadline passed" rather than "Closed", because they are still Active in the database until RSP closes them.

## Checks

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 35 files / 347 tests passed before the new tests; `vacancySearch.test.ts` (8) and `JobVacanciesPanel.test.tsx` (4) pass.
- `npm run build`: passes (existing chunk-size warning only).
- Not checked in a signed-in browser session: the RSP page needs a live admin login. The panel's behaviour is covered by the component tests above.
