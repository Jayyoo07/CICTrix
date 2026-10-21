# Remove the plantilla chooser from Job Details — summary

Plan: `docs/plans/2026-10-21-remove-plantilla-chooser.md`

## Shipped vs planned

All of D1–D3 as planned, no deviations.

## Checks

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 42 files, 386 tests pass; the Job Details plantilla tests were rewritten for one plantilla per vacancy (named plantilla, fallback, filled and already-applied states, own summary and duties only).
- `npm run build`: succeeds.
