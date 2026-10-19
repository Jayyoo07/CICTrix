---
title: Guard supabase/migrations against version drift
date: 2026-10-20
status: Done
summary: A Node check, run by a GitHub Actions workflow on every PR that touches supabase/migrations, fails on duplicate versions, an 8-digit version that prefixes a longer one, and any non-grandfathered version that isn't 14 digits. CLAUDE.md gains an "Adding a migration" section.
---

# Guard supabase/migrations against version drift

## Goal

The Supabase Preview check broke for months because `supabase/migrations` drifted: duplicate 8-digit versions, a 14-digit version starting with an existing 8-digit one, and SQL run by hand. PRs #14–#17 repaired it. This guard fails a PR before the same drift can return.

## Approach

- **`scripts/check-migrations.mjs`** (plain Node, no dependencies, like the other `scripts/*.mjs`). It exports `checkMigrations(filenames)`, which returns a list of error strings, and runs it against `supabase/migrations/*.sql` when executed directly, exiting 1 on any error. The version is the digits before the first `_`.
  1. **Duplicate version:** two files share a version.
  2. **Prefix collision:** a version is a strict prefix of another version (e.g. `20261020` and `20261020120000`).
  3. **Bad format:** a version that isn't 14 digits, unless it is in the grandfathered list. Files without a leading-digits version also fail.
- **Grandfathering by explicit allowlist**, not by git diff. The script holds the 8-digit versions present on `main` today. An allowlist works the same locally and in CI, needs no base-branch fetch, and also catches a renamed file. Removing an entry is fine; adding one should never happen.
- **`.github/workflows/migration-guard.yml`**: runs on `pull_request` (and `push` to `main`) when `supabase/migrations/**` or the script changes; checks out, sets up Node 20, runs `node scripts/check-migrations.mjs`. No `npm ci`, so it takes seconds. There are no other workflows in the repo; the Supabase Preview check is the Supabase GitHub integration, not Actions.
- **`npm run check:migrations`** for running it locally.
- **`scripts/check-migrations.test.mjs`** (Vitest): one passing case and one failing case per rule, plus a run against the real directory.
- **CLAUDE.md "Adding a migration"** section: create files with `npx supabase migration new <name>`, merge by PR, let the Supabase GitHub integration apply them; no SQL in the dashboard and no MCP `apply_migration` for repo files.

## Steps

1. Write the script and its test; run both against current `main`.
2. Add the workflow and npm script.
3. Add the CLAUDE.md section.
4. Commit, confirm push to `origin` (Jayyoo07/CICTrix), open a PR to `dehandenver/CICTrix` `main`.

## Risks

- The allowlist must be exact. It is generated from the current directory listing, then the script is run to confirm `main` passes.
- Path filters mean the check doesn't run on PRs that don't touch migrations. Those PRs can't introduce drift, so that's intended. If it is made a required status check later, the path filter would block unrelated PRs; drop the filter then.
- Does not detect SQL run by hand against prod. That stays a process rule (the CLAUDE.md section).

## Checks to run

- `node scripts/check-migrations.mjs` passes on current `main`.
- `npx vitest run scripts/check-migrations.test.mjs`: each rule has a failing case that fails.
- A throwaway local file per rule makes the CLI exit 1 with the expected message; files removed afterwards.
- The workflow runs green on the PR.
