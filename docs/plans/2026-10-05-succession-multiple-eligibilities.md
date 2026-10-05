---
title: Score multiple eligibilities, with configurable points per type
date: 2026-10-05
status: Done
summary: Replace the single-field eligibility score with one computed from an employee's eligibility records, using points per type that RSP/HR configures, capped at the 15% weight.
spec: Succession specification sections B, C and D
---

## Goal

Sections B–D of the succession spec, none of which is built:

- **B.** An employee may hold more than one eligibility. The system must not
  limit them to one. Named examples: Latin Honors, Barangay Eligibility, Civil
  Service, Professional, CSC, PRC licence, Professional Driver's Licence, plus
  further types the RSP/HR administrator configures.
- **C.** Every record stays visible on the profile, retaining type, date
  obtained, validity/expiry, licence number, supporting document and
  verification status.
- **D.** Multiple valid eligibilities raise the score, but not without limit.
  `Eligibility Raw Score = points from valid/relevant records`, then
  `Weighted = Raw × 15%`. **The administrator configures the points per type.**

What shipped earlier today scores eligibility from `employees.eligibility`, a
single text column, as the margin above the position's required level. That is
not section D: it cannot see a second eligibility, and the points are hardcoded
rather than configured. It gets replaced.

## What already exists

`employee_eligibility` (from the PDS work) already holds one row per
eligibility: `eligibility_type`, `rating`, `date_of_exam`,
`place_of_examination`, `license_number`, `validity_date`, `sort_order`.

Missing against section C: **supporting document** and **verification status**.

## Approach

### Points configuration (new)

`eligibility_types`: `name`, `points`, `is_active`, `sort_order`. Seeded with
the types section B names. Points are what the administrator tunes; the seed is
a placeholder, not a recommendation.

### Raw score

Sum `points` for the employee's records that are **valid** (no
`validity_date`, or it has not passed) and whose type is active. Divide by a
configurable `eligibility_points_cap` so the raw score is 0–1, then multiply by
the 15% weight. The cap is what stops a long list of minor credentials reaching
full marks, which is what section D asks for.

A record whose type is not in `eligibility_types` scores nothing and is
reported, rather than being silently ignored — an unconfigured type is a
configuration gap, not a zero.

### The filter still gates

Section A keeps qualification as a filter. The required-eligibility check now
looks across **all** of an employee's records instead of one text field, so
somebody holding the required eligibility as their second entry stops being
excluded.

### Fallback

Where an employee has no `employee_eligibility` rows, fall back to the legacy
`employees.eligibility` text so nobody's score silently drops to zero while the
records are still being entered. Reported as a fallback, not presented as a
complete answer.

## Steps

1. Migration: `eligibility_types` (name, points, is_active, sort_order,
   points_for_full_marks) with a seed, grants and RLS matching the existing
   pattern. `employee_eligibility` is NOT touched.
2. `src/lib/api/eligibilityTypes.ts` — CRUD for the configuration.
3. `successionCriteria.ts` — replace `eligibilityBeyondMinimumRatio` with
   `eligibilityRawScore(records, config, cap)`; keep the filter check separate.
4. `succession.ts` — load records per employee, pass them in, report unmatched
   types and the fallback.
5. Admin screen for the points table.
6. `SuccessionPlanningPage.tsx` — detail panel lists which eligibilities scored.
7. Tests: cap behaviour, expired records excluded, unconfigured type reported,
   filter sees a non-first record, fallback path.

## Open question

**Step 1 touches `employee_eligibility`, which belongs to the PDS work owned by
Jayyoo07.** The two new columns are additive and I would not touch his UI, but
it is his table. Confirm before I add them, or I build steps 2–7 against the
existing columns and leave supporting document / verification status to him.

## Risks

- **Production may have no `employee_eligibility` rows yet.** The fallback keeps
  scores sane, but until records are entered the criterion is only as good as
  the legacy text column.
- **Scores move again.** Third change to the eligibility criterion today.
- Seed points are placeholders. Ranking is meaningless until HR sets them.

## Checks to run

- `npx tsc --noEmit`
- `npx vitest run`
- `npm run build`
