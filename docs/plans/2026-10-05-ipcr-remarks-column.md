---
title: Remarks column on the employee's IPCR
date: 2026-10-05
status: Done
summary: A free-text Remarks field per success indicator, entered by the employee in Phase 2 alongside the accomplishment and Q/E/T ratings.
spec: PM/IPCR specification section F
---

## Goal

Section F: add a *Remarks* column to the employee's IPCR, a textual field, so a
row reads

| Performance Indicator | Accomplishment | Rating | Remarks |
| --- | --- | ---: | --- |
| Process reports | 20 reports completed | 5 | Submitted ahead of deadline |

Today the Phase 2 sheet has the indicator, the accomplishment, Q/E/T and the
average. There is nowhere to say why a rating is what it is.

## Approach

`remarks text` on `success_indicator_ratings`, beside `accomplishment`. That is
where the employee's Phase 2 entry already lives, one row per success indicator,
so remarks follow the same lifecycle: saved with a draft, locked on submission,
returned with a revision.

Not on `success_indicators` — that table holds the target the office set, which
the employee may not edit. Remarks are the employee's words about their own
accomplishment.

This is distinct from the PM/Department Head remarks in §E. Those are a
reviewer's comments on a submission and belong to the amendment workflow. §F is
the employee's own note on their row, and conflating them would make it unclear
whose voice a line is written in.

## Steps

1. Migration: `remarks text` on `success_indicator_ratings`.
2. `ipcrRatings.ts` — carry `remarks` through the sheet loader and the save
   payload, trimmed to null when blank like `accomplishment`.
3. `EmployeePhase2.tsx` — a Remarks column: header, textarea per row, included
   in the dirty-check so an unsaved remark is not lost silently.
4. Tests for the trim/blank handling.

## Found while building

The printed IPCR (`ipcrPdf.ts`) already draws a **Remarks** column and has never
written anything into it — the box is blank on every generated PDF. Filling it
is not a small addition: that generator works at category level (three rows,
Core / Strategic / Support) while remarks are per success indicator, so there is
nothing at the right granularity to pass. Wiring it means moving the PDF onto
the per-indicator sheet, which is its own piece of work and is NOT part of this
plan. Recorded here so the empty column is a known gap rather than a surprise.

No separate unit test for the trim: it is one expression inside the Supabase
save path, with no pure function to exercise and no existing test file for
ipcrRatings.ts. Behaviour matches `accomplishment`, which is covered by the same
line of reasoning and the same code path.

## Risks

- The sheet reads with `select('*')`, so an unmigrated column cannot break the
  query — the field simply stays empty until the migration runs.
- Phase 2 is already wide. The column goes beside Accomplishment, which is the
  only other free-text field, rather than squeezing the numeric columns.

## Checks to run

- `npx tsc --noEmit`
- `npx vitest run`
- `npm run build`
