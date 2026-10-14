---
title: Salary Grades read-only table with an edit drawer
date: 2026-10-15
status: Done
summary: Turn the Super Admin Salary Grades page into a read-only, formatted schedule table with search, and move all editing into a per-grade side drawer that shows the job-post impact before saving.
spec: Option A in docs/mockups/2026-10-15-salary-grades-drawer.html (chosen 2026-10-15)
---

## Goal

The Salary Grades table is for reading the CSC schedule. Editing happens one grade at a time in a side drawer, so a mistyped digit can't rewrite live job-post salaries just because an input lost focus.

Today every cell is an always-editable input that saves on blur, and every empty step shows a "+ Add" button, which makes 231 buttons across 33 grades. Amounts show as raw numbers like `14634`, left-aligned, and a large orange notice sits above the table.

## Approach

Build to Option A of `docs/mockups/2026-10-15-salary-grades-drawer.html`, using DESIGN_IDENTITY tokens and components. Everything stays in `src/components/SalaryGradesPage.tsx`. The API in `src/lib/api/salaryGrades.ts` is unchanged: the drawer calls the existing `updateSalaryStep`, `addSalaryStep` and `deleteSalaryStep` for each step that changed.

| # | Decision |
|---|---|
| D1 | **Table:** read-only. Amounts use `formatSalary` (₱14,634), are right-aligned with tabular numbers, and empty steps show a muted "—". The Step 1 column has a "Hiring" tag and a light tint. Each row gets an **Edit** button (small secondary pill, §9.5 actions column); it always shows, because hover-only controls fail on touch screens and for keyboard users. |
| D2 | **Toolbar (§9.4):** a "Find SG…" search that filters by grade number and resets to page 1, plus a one-line info note: "Step 1 is the hiring rate used by job posts". Pagination at 10 per page stays. |
| D3 | **Orange notice removed.** The drawer's impact warning replaces it, at the moment it matters. The localStorage dismiss logic shipped in `d512588` goes with it. |
| D4 | **Drawer:** slides in from the right (480px, full-screen sheet below 640px), overlay `rgba(4,14,107,.45)`. It shows Steps 1–8 as labelled inputs. Step 1 is required; clearing Step 2–8 removes that step; filling an empty one adds it. Focus is trapped, Esc and the close button close it, browser Back closes it (`useBackClosesView`), and focus returns to the row's Edit button. |
| D5 | **Impact before save:** when Step 1 differs from the stored value, the drawer shows the warning with the live count of affected job posts and plantilla items (the existing `countAffected`). **Save is the confirmation**, with no second modal, because the consequence is already on screen next to the button. Save is disabled until something has changed and every value is valid. |
| D6 | **Partial failure:** steps save in order. If one fails, the drawer stays open with the error and the page reloads the schedule, so the table shows what actually saved. |

## Steps

1. Replace the input cells with formatted read-only cells and add the Edit column (D1).
2. Add the search and the info note, and remove the orange notice and its storage logic (D2, D3).
3. Build the drawer with its draft state, validation, focus handling and Back behaviour (D4).
4. Wire Save to compute the changed steps, show the Step 1 impact, and handle partial failure (D5, D6).
5. Update `SalaryGradesPage.test.tsx`: keep the pagination cases, replace the notice test, and add search, drawer open/close, validation and save-diff cases.

## Risks

- **No second confirm on Step 1.** D5 relies on the visible impact line. If you want an explicit "Yes, update 12 job posts" step, it's one more click and easy to add.
- **Several calls per save.** Changing several steps fires one API call per step. A failure partway through leaves earlier steps saved; D6 makes that visible rather than hiding it.
- **Login blocks visual checking.** I can't sign in, so checks are by tests. A visual pass needs you to sign in to the local app.

## Checks to run

- `npx tsc --noEmit`
- `npx vitest run src/components/SalaryGradesPage.test.tsx`
- DESIGN_IDENTITY §16 checklist against the diff.
