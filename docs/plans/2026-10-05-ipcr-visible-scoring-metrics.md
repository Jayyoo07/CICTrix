---
title: Show employees what each IPCR rating means
date: 2026-10-05
status: Done
summary: A PM-configurable 1–5 rating scale, shown beside the Quality/Efficiency/Timeliness fields while an employee completes Phase 2.
spec: PM/IPCR specification section G
---

## Goal

Section G: "The scoring criteria used in Phase 2 should be visible to the
employee. Employees should not have to guess what a rating means." The
definitions must be configurable by the PM Administrator and displayed beside or
below the rating field, while Phase 2 is being completed.

Today the Phase 2 sheet offers three dropdowns per success indicator — Quality,
Efficiency, Timeliness — each 1 to 5, with no explanation anywhere. An employee
picking 4 over 3 is guessing.

## Approach

### Scale (new table)

`ipcr_rating_scale`: one row per rating, holding `rating` (1–5), `label`
(e.g. Outstanding) and `description`. Seeded with the wording section G gives.

Global rather than per-office. The spec says "configurable by the PM
Administrator" and never mentions offices, and a scale that differed between
offices would make ratings across the LGU non-comparable — which is the opposite
of what a published scale is for.

### Employee side

A legend beside the rating table listing 1–5 with label and description, plus
the definition of the value currently chosen shown against the field. Read-only;
it explains the scale, it does not change it.

### PM side

An editing screen under IPCR Management, following OfficeWeightingPanel's shape
like the eligibility points screen does, so the admin surfaces stay consistent.

## Steps

1. Migration: `ipcr_rating_scale` with seed, grants, RLS.
2. `src/lib/api/ipcrRatingScale.ts` — list and update.
3. `EmployeePhase2.tsx` — legend plus per-field definition.
4. PM editing panel, mounted in IPCR Management.
5. Tests for the fallback and ordering.

## Risks

- A missing or unreadable table must not block Phase 2. The sheet falls back to
  the built-in wording rather than rendering an empty legend, because the
  employee's ability to rate cannot depend on a configuration row.
- Seeded wording comes from the spec's examples; PM should review it.

## Checks to run

- `npx tsc --noEmit`
- `npx vitest run`
- `npm run build`
