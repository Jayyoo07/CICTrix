---
title: Trainings-completed KPI card on the L&D Dashboard
date: 2026-10-08
status: Draft
summary: A KPI card showing the share of this year's trainings completed (ring) with Scheduled / Ongoing / Completed / Cancelled counts. Total = calendar trainings minus cancelled.
---

## Goal

L&D sees at a glance how far through the year's training calendar they are,
and what is still scheduled, running, or cancelled.

## Approach

Mockup: `docs/mockups/2026-10-08-lnd-training-progress-kpi.html`, option B
(percentage ring with status list).

1. `src/lib/trainingProgress.ts` (TDD): pure `trainingProgress(events, now)`
   returning counts per status, total (all minus cancelled) and percent
   complete. Status per event: Cancelled from the stored status; otherwise
   from dates — Scheduled before start, Ongoing between start and end
   (end = start for single-day events), Completed after end.
2. `src/modules/admin/LNDDashboard.tsx`: load `listCalendarEvents(year)` with
   the other dashboard data; add the card to the KPI row (row becomes 5
   cards at xl, 2 per row on medium screens). Other cards unchanged.
3. Recomputed on each dashboard visit, so adding or cancelling a training
   updates the card the next time the dashboard opens.

## Risks

- Date-derived status can disagree with the status an admin set by hand
  (e.g. a past training still marked Scheduled counts as Completed here).
- Five cards at xl make each card narrower; the ring card needs ~300px.

## Checks to run

- `npx tsc --noEmit`, `npx vitest run`, `npm run build`
