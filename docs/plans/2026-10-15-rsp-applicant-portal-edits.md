---
title: RSP and applicant-portal edits
date: 2026-10-15
status: Done
summary: Nine small UI and workflow edits across Job Posts, the public vacancies table, the About page, the L&D Summary of Ratings, and the RSP applicant details page.
---

## Goal

Apply nine requested edits and deploy from `main` (user instruction: work on `main`, no new branch).

## Approach

| # | Change | Where |
|---|---|---|
| R1 | Move "Add New Position" to the left | `JobPostingsPage.tsx` |
| R2 | Logout label stays white on hover | `AdminHeader.tsx` / portal headers (reproduce first) |
| R3 | Vacancies table: Posting Date → Monthly Salary | `LandingPage.tsx` |
| R4 | About hero uses the Interviewer portal's City Hall photo hero (§7.1); drawn circles removed, text left-aligned | `AboutPage.tsx` |
| R5 | L&D Summary of Ratings: completion as "n / total" only, Needs Attention column removed (PM portal untouched) | `LndSummaryOfRatings.tsx` |
| R6 | Remove the Details button beside Apply (Apply already routes through job details) | `LandingPage.tsx` |
| R7 | RSP Edit button on applicant details: name, email, phone, address, PWD, education, years of experience; saves via `src/lib/api/applicants.ts` | `ApplicantDetailsPage.tsx` |
| R8 | Job Posts Applicants column shows "N left to review" (undecided per `reviewOutcome`) | `JobPostingsPage.tsx` |
| R9 | Next/Back on applicant details stays within the clicked applicant's job post | `ApplicationsListPage.tsx` |

## Steps

One commit per item, then `git push origin main` (deploys cic-trix, abyan-hris-iloilo, cictrix-hr-demo).

## Risks

- R7 writes to the live `applicants` table; the page already updates that table, so RLS should allow it.
- R3 shows "Not specified" for posts with no salary.

## Checks to run

`npx tsc --noEmit`, `npm run lint`, `npm test`, unit tests for the R8 count and R9 queue filter, visual check in the dev server.
