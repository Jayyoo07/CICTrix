# PM dashboard Action Required Queue as one collapsible card — summary

Plan: `docs/plans/2026-10-16-action-queue-dropdown.md`. Mockup: `docs/mockups/2026-10-16-action-queue-dropdown.html` (Option A).

## What shipped vs. planned

All of D1–D7 shipped in `src/modules/admin/PMDashboard.tsx`:

- The queue is one bar, collapsed on every load, with "N pending" (warning) and "N overdue" (error, hidden at 0) pills and a Show/Hide toggle (`aria-expanded`, `aria-controls`).
- Items carry a waiting time (`submitted_at ?? created_at` for evaluations, `uploaded_at` for document requests) and sort oldest first. Age chips follow §10: neutral under 3 days, warning at 3–6, error at 7+ or past a document's `due_date`. Thresholds are the `QUEUE_*` constants.
- Open, it shows the 5 oldest rows (name over "Department · Request type", age chip, `btn btn-sm btn-secondary` Review). "View all N" expands in place and becomes "Show fewer".
- Missing data reads "Employee not linked" / "No department".
- Review buttons still have no handler (D7, unchanged).

## Deviations

- The section carries `abyan-ds` so it can use the token variables and `.btn` classes, which are scoped to that class. It also gets `self-start`, so the collapsed bar doesn't stretch to the height of the Performance Distribution card beside it.

## Checks run

- `npx tsc --noEmit`: pass.
- `npm test` (Vitest): 27 files, 293 tests, all pass.
- ESLint: not run. The repo has no ESLint config, so `eslint` exits before linting.
- Browser: **not verified.** Admin login fails locally because the Supabase project has disabled legacy API keys ("Legacy API keys are disabled", 401) and `.env` still holds the legacy `eyJ…` anon key.
