---
title: One posting per title per office, each plantilla with its own description
date: 2026-10-21
status: Done
summary: Merge job postings that share a title within the same office into one posting whose plantilla slots each keep their own division, summary and duties, and show those per plantilla on the existing Details page and a plantilla count on the existing Vacancies list.
spec: Chat decision 2026-10-21 (keep the existing UI; filled plantillas show locked under open postings, fully filled postings stay off the portal)
---

## Goal

The sheet import (2026-10-20) created one posting per plantilla row, so "Nurse II (Public Health Nurse)" appears three times in City Health. Applicants should see one posting per title per office, with every plantilla under it, and each plantilla's own job description.

## Approach

| # | Decision |
|---|---|
| D1 | `plantilla_slots` gains `division`, `summary` and `responsibilities` (same type as `job_postings.responsibilities`). Empty means "use the posting's". |
| D2 | Postings group by lower(trim(title)) + lower(trim(department)). The oldest posting survives; the others' slots move onto it with their posting's division, summary and duties copied onto the slot. The survivor's own slots get its values too, so every plantilla in a merged group carries its text. |
| D3 | Every `public` column named `job_posting_id` is repointed from merged postings to the survivor, found at run time, so applications, evaluations and anything added later follow. Merged postings are then deleted. |
| D4 | Survivor status is the most open in the group: Open, then On Hold, then Closed. Deadline and posted date come from the survivor, else the latest open one. |
| D5 | Slot numbers are re-sequenced per survivor in label order; labels ("Plantilla 113") are unique per posting, so no clash. |
| D6 | UI keeps the existing layout. Details page: when slots carry their own text, the existing Position summary and Responsibilities blocks list it per plantilla under an "af-caps" heading ("Plantilla 113 · Division"). Vacancies table and cards: the existing title cell gets a muted "3 plantillas · 2 open" line. |
| D7 | Fully filled postings stay Closed and off the portal; open postings show filled plantillas as locked items (existing behaviour). |

## Steps

1. Migration `supabase/migrations/20261021100000_merge_postings_per_plantilla.sql`, one transaction, idempotent, ends with a merge report.
2. `PlantillaSlot` type and `toSlot` read the new columns.
3. Details page renders per-plantilla summary and duties.
4. Vacancies list shows plantilla count.
5. `npx tsc --noEmit`, related tests, `npm run build`.
6. Commit on the feature branch; push and run the migration only on the user's go-ahead.

## Risks

- Qualifications stay the survivor's; the import varied wording per row, so merged-away wording is dropped (the CSC standard is the same per title).
- A table with a unique constraint on `job_posting_id` (one row per posting) would fail the repoint; the transaction rolls back and the report names it.
