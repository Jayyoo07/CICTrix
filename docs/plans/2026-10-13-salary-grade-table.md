---
title: CSC salary grade table
date: 2026-10-13
status: Done
summary: Import the official CSC salary schedule (SG 1–33, with steps) into Supabase, make every salary grade in the app come from it, keep job post salaries in sync when it changes, and give super admins a sidebar tab to edit it and add steps.
---

# CSC salary grade table

## Goal

Salary amounts in the system come from one table in Supabase that holds the official CSC salary schedule, and no longer from free-text entry. Super admins edit that table, including adding steps, from a new tab in the super-admin sidebar. An edit to the table updates the salary on every job post at that grade.

Today every salary field is free text. Nothing checks it against the CSC schedule, so two postings at the same grade can show different amounts.

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | When an admin edits an amount, do existing job posts change? | **Yes.** Every job post and plantilla item at that grade takes the new amount, including posts already published. |
| D2 | CSC steps 1–8 per grade | **Supported.** The provided sheet seeds Step 1. A super admin can add further steps for a grade from the Salary Grades tab. |
| D3 | Employee IDP form Salary Grade | **Read-only, pulled from the table** based on the employee's job position. |

## Where salary and salary grade appear today

| # | File | What it does with salary | Change |
|---|---|---|---|
| S1 | `src/components/JobPostingsPage.tsx` | RSP Job Posts form. Each plantilla row has a free-text **Salary Grade** box and a free-text **Monthly Salary** box, and both are required. | Salary Grade becomes a 1–33 dropdown. Monthly Salary becomes read-only and shows the grade's Step 1 amount. |
| S2 | `src/modules/admin/RSPDashboard.tsx` | Position form with a number input (1–33) used only for ranking. It has no salary amount. | Switch the input to the same dropdown. |
| S3 | `src/components/JobDetailsPage.tsx` | Public job details. Shows "SG n", the Monthly Salary, and a salary for each plantilla choice. | No code change. It reads the stored amount, which the D1 sync keeps current. |
| S4 | `src/modules/applicant/ApplicantWizard.tsx`, `src/modules/applicant/flow/applicationDrafts.ts` | Copy the SG and salary from the posting or plantilla into the application. | No change. Applications already submitted keep the salary they were submitted with (see Risks). |
| S5 | `src/lib/recruitmentData.ts`, `src/lib/plantillaSlots.ts` | Read and write `job_postings` and `plantilla_slots` `salary_grade` and `monthly_salary`. | No change to reads. Writes take the amount from the table, never from the form. |
| S6 | `src/modules/employee/IdpFormSection.tsx`, `src/lib/api/idpSubmissions.ts` | Employee IDP form. The employee types their own Salary Grade, stored as `text`. | Becomes read-only and is filled from the employee's position (D3). |
| S7 | `src/components/QualificationGapPanel.tsx`, `src/lib/qualificationMatch.ts`, `src/lib/api/successionCriteria.ts`, `src/lib/api/succession.ts` | Use the SG number only, for ranking and for "SG n" labels. | No change. They need the grade number, not the amount. |

## Approach

- **One table, keyed by grade and step.** Job posts and plantilla items carry only a grade, so they always use **Step 1**, the CSC hiring rate. Steps 2–8 hold the schedule for reference and future use.
- **Keep the existing columns and sync them (D1).** `monthly_salary` stays on `job_postings` and `plantilla_slots`. A database trigger rewrites it whenever a Step 1 amount changes, so the sync works no matter which screen or script edits the table.
- **The IDP salary grade follows the position (D3).** Resolved by `employees.position_id` first, then by matching the position title against `positions.name`, ignoring case.
- **Existing patterns.** The table follows the `eligibility_types` lookup pattern. Edit access uses `public.is_super_admin()`.

## Steps

1. Migration `supabase/migrations/20261013_salary_grades.sql` — table, seed, RLS, sync trigger.
2. Service `src/lib/api/salaryGrades.ts`.
3. Shared `SalaryGradeSelect` component.
4. S1, the Job Posts form.
5. S2, the Position form.
6. S6, the IDP form.
7. New super-admin tab, "Salary Grades".
8. Tests (Vitest).
9. Apply the migration to the live Supabase project — handed to the owner to run, never executed from here.

## Seed data (official CSC schedule, Step 1, as provided)

| SG | Monthly salary (PHP) | SG | Monthly salary (PHP) | SG | Monthly salary (PHP) |
|---|---|---|---|---|---|
| 1 | 14,634 | 12 | 33,947 | 23 | 91,306 |
| 2 | 15,522 | 13 | 36,125 | 24 | 102,603 |
| 3 | 16,486 | 14 | 38,764 | 25 | 116,643 |
| 4 | 17,506 | 15 | 42,178 | 26 | 131,807 |
| 5 | 18,581 | 16 | 45,694 | 27 | 148,940 |
| 6 | 19,716 | 17 | 49,562 | 28 | 167,129 |
| 7 | 20,914 | 18 | 53,818 | 29 | 187,531 |
| 8 | 22,423 | 19 | 59,153 | 30 | 210,718 |
| 9 | 24,329 | 20 | 66,052 | 31 | 300,961 |
| 10 | 26,917 | 21 | 73,303 | 32 | 356,237 |
| 11 | 31,705 | 22 | 81,796 | 33 | 449,157 |

## Risks

- **The first sync rewrites existing amounts.** Any job post whose amount differs from the CSC table will change.
- **Closed and filled posts also change** under D1.
- **Submitted applications do not change.** That copy is the applicant's record.
- **The IDP lookup can miss.** `employees.position` is free text and `position_id` is mostly empty; only 14 of 22 `positions` rows carry a salary grade.
- **Text color.** `globals.css` forces a dark colour on `span`, `p`, `label`, `button`, `a` (§17 item 8).

## Deviations from the plan as written

1. **`ui-preview` was not run** (step 7). The skill is not available in this
   session — CLAUDE.md requires it for open design questions, but it is not in
   the skills list and `scripts/session.sh` / `docs/mockups/sessions/` do not
   exist. The page instead follows the shape of the two existing admin editing
   surfaces, `OfficeWeightingPanel` and `EligibilityPointsPanel`: icon header,
   consequence notice, bordered table edited in place. No new layout invented.

2. **`npm run lint` was not run.** There is no ESLint config in the repo, so the
   script fails for every file, not just these. `npx tsc --noEmit`, `npm test`
   and `npm run build` all pass.

3. **The one-off backfill is not executed by the migration.** The plan's Risks
   section asks for a read-only diff query first; aligning existing posts
   rewrites published salaries, which is HR's decision rather than a schema
   change. Both queries are in the migration as comments, ready to run once HR
   agrees. The trigger covers every edit from here on.

4. **`salaryGradeForEmployee` prefers a title match that carries a grade.** The
   plan said match by title; a test showed that taking the first name match
   returns null whenever a duplicate position without a grade sorts first, and
   reports "no grade on file" for a position that has one. The same title does
   exist under several departments — the SRP seed notes it.

5. **Two existing IDP tests were updated**, not the code. They asserted Salary
   Grade was required, which D3 deliberately changes.

6. **Step 1 deletion is blocked in two places**: the RLS delete policy
   (`step > 1`) and the service. The service check exists so the message says
   why, rather than surfacing a bare permission error.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- Manual checks per the original plan.
