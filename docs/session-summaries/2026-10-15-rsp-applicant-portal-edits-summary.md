# RSP and applicant-portal edits — summary

Plan: `docs/plans/2026-10-15-rsp-applicant-portal-edits.md`. Built directly on `main` at the user's instruction.

## Shipped vs planned

| # | Shipped |
|---|---|
| R1 | "Add New Position" sits at the left on Job Posts. |
| R2 | The Logout trigger was already white on hover in every portal (measured). The dark text was the red **Log Out** confirm button in `LogoutConfirmPopover`: `globals.css` `button:hover` outranked `text-white`. Fixed with `hover:text-white`. |
| R3 | Vacancies table shows Monthly Salary (open plantillas' `monthlySalary`, falling back to the post's; a range when they differ; "Not specified" when none). |
| R4 | About hero uses the City Hall photo treatment from the Interviewer portal (`about-hero.css`), drawn circles removed, text left-aligned. Needs `.abyan-ds` for the token scope. |
| R5 | L&D Summary of Ratings: completion shown as "n / total", no bar, Needs Attention column removed. PM portal unchanged. |
| R6 | Details button removed beside Apply. |
| R7 | RSP Edit button on applicant details → `EditApplicantDetailsModal`, saved via `src/lib/api/applicants.ts`. The Education row now also reads `education_level`, the column the form writes. |
| R8 | Job Posts Applicants column shows "N left to review" (undecided per `reviewOutcome`), hidden when a post has no applicants. |
| R9 | Applications list passes only the clicked applicant's position (title + office) as the Next/Back queue. Not `item_number`: that is per plantilla. |

## Deviations

- R9 matches on title + office instead of item number (item numbers differ per plantilla of one post).
- R2's cause differed from the plan's assumption (the confirm button, not the trigger).

## Checks run

- `npx tsc --noEmit`: clean.
- `npm test`: 28 files, 302 tests pass (incl. 2 new `samePositionRows` tests).
- `npm run lint`: not runnable; the repo has no ESLint config.
- Playwright against the dev server: hover colours measured for all Logout buttons; screenshots of Job Posts, About (1440px and 390px), L&D Summary of Ratings, vacancies table, applicant details pager and Edit modal. Edit **Save** was not exercised against the live database.
