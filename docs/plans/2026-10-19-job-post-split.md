---
title: Job Post split into Job Positions and Job Vacancies
date: 2026-10-19
status: Done
summary: The RSP Job Post page becomes two tabs. Job Positions creates and edits positions with full details; Job Vacancies opens a position as a vacancy by searching the position list, where only the Application Deadline is editable.
spec: docs/mockups/2026-10-19-job-post-split.html (approved 2026-10-19, v2 to Design Identity)
---

## Goal

RSP defines each Civil Service position once, then opens it as a vacancy without re-entering details. Opening a vacancy asks for one thing: the application deadline.

## Approach

| # | Decision |
|---|---|
| D1 | No schema change. A position is a `job_postings` row. Defined-but-not-advertised = existing `Draft` status (stored `On Hold`), shown as "Not opened". The public portal already lists only `Active`. |
| D2 | Create Position no longer asks for an Application Deadline and saves as `Draft`. Editing a position keeps its current status and deadline. |
| D3 | Opening a vacancy reuses the reopen logic: status `Active`, `application_deadline` set, posted date = now, closed plantilla slots reopened. |
| D4 | Job Vacancies lists opened positions (Open, Closed). Status follows DESIGN_IDENTITY §10: Open, Closing soon (≤ 3 days), Closed. Row actions: Edit Deadline, Close. |
| D5 | Search-as-you-type from the first letter over title and department. Filled and already-open positions are listed but not selectable. ↑/↓/Enter/Esc work. |
| D6 | Plantilla item numbers stay hidden (plantilla rules); plantilla labels show instead of the mockup's "item no." column. |
| D7 | Tab state lives in `?tab=vacancies` so Back and links work. |

## Steps

1. `src/lib/vacancySearch.ts` (match, rank, eligibility, deadline status) with tests.
2. `src/components/JobVacanciesPanel.tsx`: table, Open Vacant Job Position dialog, Edit Deadline.
3. `JobPostingsPage.tsx`: tabs, Draft on create, deadline field removed from create, Close/Reopen moved to Vacancies.
4. `npx tsc --noEmit`, `npm test`, `npm run build`, local browser check.
5. Commit on `main`, `git push origin main` (deploys cic-trix, abyan-hris-iloilo, cictrix-hr-demo), check commit status.

## Risks

- Existing `Draft` ("Reviewing") posts appear as "Not opened" positions; that matches their meaning (not advertised).
- Other screens that count postings by status are unchanged; a `Draft` position was already excluded from public views.
