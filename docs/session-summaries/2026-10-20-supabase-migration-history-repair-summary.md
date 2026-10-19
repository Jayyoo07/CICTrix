# Session Summary: Supabase Migration History Repair

**Date:** 2026-10-20
**Status:** Completed
**Plans:** [`2026-10-20-supabase-migration-history-repair.md`](../plans/2026-10-20-supabase-migration-history-repair.md), [`2026-10-20-migration-prod-gaps.md`](../plans/2026-10-20-migration-prod-gaps.md)

The "Supabase Preview" check passes again on merges to `main`. Production's migration log now matches `supabase/migrations/` (106 versions), and the schema pieces that 10 older migrations never applied are now in prod.

## What Shipped vs. Planned

| Planned | Shipped | Details |
|---|---|---|
| Give every migration file a unique version | **Shipped** (#15) | 42 files that shared a version renamed to `YYYYMMDD0000NN_`, keeping their order within each day. |
| Rewrite the remote log to match the repo | **Shipped** (dashboard) | Deleted the 6 orphan rows and marked all 97 files applied, in one transaction run by the user in the SQL editor. |
| Supabase Preview green with nothing run on prod | **Shipped** | Passed on `908cf66`; the Supabase branch status moved from `MIGRATIONS_FAILED` to `FUNCTIONS_DEPLOYED`. |
| Close the 10 prod gaps in a reviewed PR | **Shipped** (#14, #16) | 9 idempotent restore migrations, applied by the integration on the #16 merge (`b2b7aa2`). |

## Deviations

- **Upstream had 5 more migrations** than the first count (97, not 92), including another duplicate date (`20261018`). The repair was rebuilt on upstream `main`.
- **The gap list grew from 5 files to 10.** A wider read-only check covered columns, indexes, views and functions, not just tables, and found the extra gaps. All were marked applied, so the integration couldn't replay them (`20260510` begins with `DROP TABLE IF EXISTS employees CASCADE`), and they were fixed forward in #14.
- **The first repair run didn't take.** The log stayed at 6 rows until the SQL was re-run in the dashboard with the `postgres` role.
- **The #14 merge failed the check, with nothing applied.** The CLI sorts local files by filename but remote versions as text: `20261020120000_…` sorted before `20261020_…` by name, but after `20261020` by version. #16 renamed the 9 files to `20261021000000–08`, and the next merge applied them.
- **`20260510` was not restored.** Prod already has equivalent indexes (`idx_employees_department`, `idx_employees_status`) under different names.

## Checks Run

- Read-only object check against prod (40 tables, columns, indexes, views and functions from the 10 gap files): all present except the two `20260510` indexes, which have equivalents.
- `supabase_migrations.schema_migrations`: 106 rows, including `20261021000000`–`20261021000008`.
- Supabase Preview: `success` on `908cf66` (#15) and on `b2b7aa2` (#16); `failure` on `f776fb1` (#14, explained above).
- `supabase/migrations`, sorted by filename (`LC_ALL=C`), gives the same version order as sorted by version. No duplicate versions, and no 8-digit version that prefixes a longer one.
- Not checked: RLS policies and triggers from the original 10 files, beyond what #14's own check covered.

## Going Forward

Create migrations with `npx supabase migration new <name>`, merge them by PR, and let the integration apply them. Don't run SQL in the dashboard, and don't use MCP `apply_migration` for repo files. New 14-digit versions must not start with an existing 8-digit version (for example `20261020…`), or the filename and version orders disagree again.
