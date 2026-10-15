---
title: PM dashboard Action Required Queue as one collapsible card
date: 2026-10-16
status: Done
summary: Collapse the PM dashboard's Action Required Queue into a single bar with pending and overdue counts; opening it shows the 5 oldest items with how long each has waited.
spec: Option A in docs/mockups/2026-10-16-action-queue-dropdown.html (chosen 2026-10-16)
---

## Goal

The Action Required Queue renders every pending item (20 today) as a full-width row, which pushes the rest of the PM dashboard far down. It should take one line until the PM chooses to open it.

## Approach

Build to `docs/mockups/2026-10-16-action-queue-dropdown.html`, using DESIGN_IDENTITY tokens and components. All changes stay in the queue section of `src/modules/admin/PMDashboard.tsx` (around lines 455–480 and 1031–1070). No API or schema changes: the dates already come back from `getDocumentRequests` and `getEvaluationsWithEmployee`.

| # | Decision |
|---|---|
| D1 | **Collapsed by default** on every load, as one bar: title "Action required", a warning pill "N pending", an error pill "N overdue" (hidden when 0), and a "Show ⌄ / Hide ⌃" toggle on the right. The whole bar is one `<button aria-expanded aria-controls>`. No persistence; remembering the state was not asked for. |
| D2 | **Waiting time** per item: evaluations use `submitted_at ?? created_at`, document requests use `uploaded_at`. Items sort oldest first. |
| D3 | **Age chip** (§10 colours): under 3 days neutral ("Today" / "Waiting N days"), 3–6 days warning, 7+ days error. Thresholds are named constants. **Overdue** = 7+ days waiting, or a document request whose `due_date` has passed. |
| D4 | **Open state** shows the 5 oldest rows: name (Headline S) over "Department · Request type" (Body S), the age chip, and a small secondary Review pill (§9.1). The column-header row goes away. |
| D5 | **"View all N"** expands the list in place to every item and becomes "Show fewer". Today's "View all" link has no handler, so this makes the other items reachable without a new page. |
| D6 | **Missing data** reads as a state: "Employee not linked" (muted, italic) and "No department", replacing "Unknown" / "Unassigned". |
| D7 | **Review buttons keep their current behaviour** (no handler today). Wiring them to the document-review modal is separate work. |

## Steps

1. Extend the queue builder with `waitingSince`, `daysWaiting`, `overdue`; sort oldest first (D2, D3).
2. Replace the section markup with the collapsible bar and list (D1, D4, D6).
3. Add the in-place View all / Show fewer toggle (D5).
4. Run the checks below and the §16 PR checklist.

## Risks

- `submitted_at` may be null on older evaluations; `created_at` is the fallback, so their age may read longer than the true review wait.
- The 7-day overdue threshold is my default, not a policy from HRMO. Easy to change via the constant.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm test`.
- In the browser at desktop and mobile widths: collapsed bar height, open/close by mouse and keyboard (Enter/Space, visible focus), counts match the old "N pending", oldest item first, View all / Show fewer, empty state ("No pending actions") when the queue is empty.
