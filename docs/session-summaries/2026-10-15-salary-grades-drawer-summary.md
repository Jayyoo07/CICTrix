# Salary Grades read-only table with an edit drawer: summary

Plan: [2026-10-15-salary-grades-drawer.md](../plans/2026-10-15-salary-grades-drawer.md). Mockup: Option A of [2026-10-15-salary-grades-drawer.html](../mockups/2026-10-15-salary-grades-drawer.html).

## Shipped vs. planned

Every plan decision (D1–D6) shipped as written, in `src/components/SalaryGradesPage.tsx`:

- **Table:** read-only, with ₱ amounts right-aligned in tabular numbers and a muted "—" for unset steps. The Step 1 column carries a "Hiring" badge and a tint, and each row has an Edit button that is always visible.
- **Toolbar:** a "Find SG…" search that filters by grade number and resets to page 1, plus an info line. Pagination at 10 per page is unchanged.
- **Orange notice:** removed, along with its localStorage dismiss logic from `d512588`.
- **Drawer:** 480px from the right, full screen on mobile. It edits Steps 1–8, requires Step 1, and treats a cleared Step 2–8 as a removal. Focus is trapped while it is open and returns to the Edit button on close. Esc, Cancel, the close button, the overlay and browser Back all close it.
- **Save:** shows the live count of affected job posts and plantilla items when Step 1 changes, and is disabled until something has changed and every value is valid. Changed steps save in order. On a failure the drawer stays open, names the step that failed, and reloads the schedule.

New UI uses DESIGN_IDENTITY tokens inside an `.abyan-ds` scope, with `.btn` classes for the buttons and `.badge-info` for the Hiring tag.

## Deviations

- **Edit button always visible.** The mockup showed Edit on row hover only. The always-visible button was already agreed in the plan.
- **No tranche-date subtitle.** The mockup had one, but the database stores no tranche date.

## Checks run

- `npx tsc --noEmit`: clean.
- `npx vitest run src/components/SalaryGradesPage.test.tsx`: 9 tests pass, covering the table, pagination, search, and drawer open/close, validation, Step 1 impact, add/remove and partial failure.
- `npx vitest run`: 27 files and 293 tests pass.
- **Not run:**
  - A visual check in the browser, because the page needs a super-admin login I can't enter.
  - `npm run lint`, because the repo has no ESLint config.
