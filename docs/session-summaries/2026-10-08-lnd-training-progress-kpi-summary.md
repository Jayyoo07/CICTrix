# Trainings-completed KPI card — summary

Plan: `docs/plans/2026-10-08-lnd-training-progress-kpi.md`

## Shipped

- `src/lib/trainingProgress.ts` (+ 5 tests): per-training status (Cancelled
  from the stored status; Scheduled / Ongoing / Completed from dates, a
  training running through the end of its last day), counts, total =
  calendar trainings minus cancelled, percent complete.
- `src/modules/admin/LNDDashboard.tsx`: loads this year's Training Calendar
  and adds the ring card (mockup option B) with "N of M trainings done" and
  the four status counts. KPI row is 5 cards at xl, 2 per row on medium.

## Deviations

- Added the "N of M trainings done" line at the user's request.
- Not checked visually: the local app needs an admin sign-in.

## Checks run

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 23 files, 248 tests passed.
- `npm run build`: succeeded.
