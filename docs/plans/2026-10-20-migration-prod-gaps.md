---
title: Add the schema pieces production never received
date: 2026-10-20
status: In Progress
summary: Ten migration files never fully ran on production (fyzdfgxaaowjzbjpwrii). The history repair marks them applied, so their missing pieces need new, idempotent migrations that the GitHub integration applies on merge. A read-only re-check, now including policies, triggers, constraints, grants and Realtime, sets exactly what each new file adds.
---

# Add the schema pieces production never received

## Goal

Production has every object the repo's migrations describe, apart from the deliberate exclusions below. The fix ships as new migration files merged by PR and applied by the Supabase GitHub integration. Nobody runs SQL in the dashboard.

Depends on `docs/plans/2026-10-20-supabase-migration-history-repair.md` (branch `chore/migration-unique-versions`). This PR merges **after** that one. Merging it first would make the integration run all 97 old files against prod, including the `DROP TABLE employees CASCADE` in `20260510`.

## Findings (read-only re-check, 2026-10-20)

| Source file | Missing on prod | New migration adds |
|---|---|---|
| `20260510_create_employees_table` | Indexes on `current_department`/`status`, trigger `trigger_employees_updated_at`, 3 policies | **Nothing.** The prod `employees` table has a different shape: it has no `current_department` or `updated_at` column. Equivalent indexes already exist (`idx_employees_department`, `idx_employees_status`) and so does a modified-at trigger. The policies are superseded by `employees_open_access`. Adding them would fail or change nothing. |
| `20260703_promotional_applications` | `promotional_application_docs`, `promotional_decisions` | Both tables, `if not exists`, with RLS left off like `promotional_applications` |
| `20260707_create_employee_password_resets` | Everything | Table, index, RLS off, grants (FK to `employee_portal_accounts.id`, which is `text` on prod) |
| `20260726000001_ipcr_demo_cycle_state` | `demo_settings.phase1_status`/`phase2_status`, constraint `ipcr_schedules_employee_unique` (also missing; prod has no duplicate `employee_id`), `cold_storage_vault` + index + grants | All of it **except the seeded `pm@lgu.gov` account**, whose password `demo1234` is hardcoded. It doesn't exist on prod and shouldn't. |
| `20260808000001_training_plan_publication` | Everything | Table, `publish_/unpublish_/rollover_training_plan`, RLS + `training_plan_publications_open` policy |
| `20260816_training_competencies` | The 3 indexes (tables, constraints, grants and the 12 seeded tags are present) | The 3 indexes |
| `20260923000002_pds_cs_form_212_pages_2to4` | 31 `employees` columns; `sort_order`/`status_of_appointment` on `employee_eligibility`/`employee_work_experience`; 3 tables; 5 indexes; grants, RLS, policies | All of it |
| `20260928_plantilla_labels_one_application_per_plantilla` | Everything (columns, constraints, indexes, 2 functions, 2 triggers, view) | All of it. The user decided to include it: the rollback file was committed together with the migration, so it doesn't show that a rollback ran, and the current frontend already expects these objects. Prod has no duplicate email-plus-plantilla pairs, and `uq_application_plantilla_pair` already backs the trigger's `ON CONFLICT`. |
| `20261001_ipcr_remarks_column` | `success_indicator_ratings.remarks` | Column + comment |
| `20261018000000_applicant_document_events` | Everything, including `job_postings` in `supabase_realtime` | All of it |

## Approach

There is one new file per source file that has something to add, so nine files. Each is created with `npx supabase migration new <name>`, which gives a unique 14-digit version, and copies only the missing statements from its source. The source's comments and transaction wrapping are kept where they apply.

Every statement is idempotent: `create table/index if not exists`, `add column if not exists`, `create or replace` for functions and views, `pg_constraint`/`pg_policies`/`pg_publication_tables` guards, and `drop trigger/policy if exists` immediately before re-creating the same object. No statement drops a table, column or data.

## Steps

1. Branch `chore/migration-fill-prod-gaps` off upstream `main` (worktree `../CICTrix-migfill`). Rebase it onto `main` once the repair PR has merged.
2. Create the nine files:
   - `restore_promotional_application_tables`
   - `restore_employee_password_resets`
   - `restore_ipcr_demo_cycle_state`
   - `restore_training_plan_publication`
   - `restore_training_competencies_indexes`
   - `restore_pds_cs_form_212_pages_2to4`
   - `restore_plantilla_labels_one_application_per_plantilla`
   - `restore_ipcr_remarks_column`
   - `restore_applicant_document_events`
   The CLI stamps versions in UTC, which gave `20261019…`. That sorts before the existing `20261020_remove_seeded_department_heads`, and the CLI refuses to apply files older than the newest remote version. So the files were renamed, keeping their order, to `20261020120000` through `20261020120008`.
3. Commit (`fix(db): add schema pieces missing from production`).
4. After the repair PR merges, rebase, push to `Jayyoo07/CICTrix` and open a PR to `dehandenver/CICTrix` `main` (each step needs the user's go-ahead).

## Risks

- **The PR merges before the repair PR.** The integration would replay the old files. The PR description states the dependency, and the PR stays a draft until the repair has merged.
- **No local database to dry-run on.** Docker isn't installed, so `supabase start` isn't available. The SQL is copied from files that already ran elsewhere, and each prerequisite (column types, the unique pair index, no duplicate rows) was checked on prod.
- **The Supabase Preview check on the PR** runs the new files against prod's schema on merge. A failure aborts that file's transaction, so a partial apply can only happen in the files that have no `begin`/`commit` wrapper, and those consist only of `if not exists` statements.
- **RLS stays off on `promotional_*`, `employee_password_resets` and `cold_storage_vault`.** This matches the original files and the existing tables they sit beside. Tightening RLS belongs to the separate security remediation plan.

## Checks to run

- Each new file's version is unique: `ls supabase/migrations | sed -E 's/^([0-9]+)_.*/\1/' | sort | uniq -d` prints nothing.
- `grep -niE '\bdrop (table|column|schema)|truncate|delete from' ` on the new files matches only the function body in `undo_document_validation`, which is copied as is.
- After the repair merges: `npx supabase db push --dry-run --linked` lists exactly the nine new files and nothing else (read-only).
- After the PR merges: the Supabase Preview check is green, and a read-only query confirms every object in the Findings table exists.
