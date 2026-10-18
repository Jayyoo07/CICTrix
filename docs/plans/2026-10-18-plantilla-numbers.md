---
title: Plantilla numbers entered as numbers, not a fixed 1, 2, 3
date: 2026-10-18
status: In Progress
summary: In the Create/Edit Position form, each plantilla row takes a Plantilla No. (digits) behind a fixed "Plantilla" prefix, new rows start empty instead of auto-numbered, and the saved label is "Plantilla <n>".
spec: docs/mockups/2026-10-18-plantilla-numbers.html (chosen 2026-10-18, option A)
---

## Goal

RSP can post one position with plantillas such as 21 and 13 and change those numbers later through Edit Posting. The form stops suggesting 1, 2, 3.

## Approach

| # | Decision |
|---|---|
| D1 | Each plantilla row shows a "Plantilla No." prefix and a digits-only input. Typing "21" stores the label "Plantilla 21"; leading zeros are dropped so 021 and 21 can't both exist. |
| D2 | New rows, including the first row of a new posting, start empty. `suggestPlantillaLabel` is removed. |
| D3 | A row whose saved label isn't "Plantilla <n>" (older free-text names) keeps its label until RSP types a number; the row shows the current name as a hint. |
| D4 | An empty row fails save with "Enter a plantilla number for row N." The shared `validatePlantillaLabels` (uniqueness, length, Reference No. guard) is unchanged. |
| D5 | Labels stay the storage format, so the apply flow, Details page and lists need no change. |

## Steps

1. `plantillaNumberOf` and `plantillaLabelForNumber` in `src/lib/plantillaRules.ts`, with tests.
2. Switch the row input in `JobPostingsPage.tsx`, empty new rows, empty-number message.
3. `npx tsc --noEmit`, `npm test`, `npm run build`, local check (no save to the live database).
4. Commit on `main`, push (deploys cic-trix and cictrix-hr-demo), confirm live bundles.

## Risks

- Older custom names (e.g. "Plantilla 21-A") can't be typed again once replaced; they stay as they are unless RSP enters a number.
