# Migration guard: summary

Plan: [docs/plans/2026-10-20-migration-guard.md](../plans/2026-10-20-migration-guard.md)

## What shipped

- `scripts/check-migrations.mjs`: fails on duplicate versions, a version that prefixes another, and any version that isn't 14 digits unless it is one of the 54 grandfathered 8-digit versions on `main`.
- `.github/workflows/migration-guard.yml`: runs the check on PRs that touch `supabase/migrations` (and on pushes to `main`), Node 20, no install step.
- `npm run check:migrations` for local runs.
- `scripts/check-migrations.test.mjs`: 7 Vitest cases, including the real directory and one failing case per rule.
- CLAUDE.md: the `check:migrations` command and an "Adding a migration" section.

No deviations from the plan.

## Checks run

- `node scripts/check-migrations.mjs` on `main` (106 files): passes, exit 0.
- Throwaway file per rule, each removed afterwards: `20261021000000_dup_test.sql` (duplicate), `20261020120000_prefix_test.sql` (prefix of `20261020`), `20261101_fmt_test.sql` (8-digit): each exits 1 with the matching message.
- `npx vitest run scripts/check-migrations.test.mjs`: 7 passed.
