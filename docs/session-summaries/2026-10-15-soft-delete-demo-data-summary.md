# Soft-delete demo data: summary

Plan: [2026-10-15-soft-delete-demo-data](../plans/2026-10-15-soft-delete-demo-data.md)

## Shipped

- Migration `20261015_soft_delete_core_records.sql`: `deleted_at` on `job_postings`, `applicants`, `newly_hired`, `employees`, `employee_portal_accounts`; RLS on with an allow-all permissive policy where RLS was off; a restrictive `deleted_at is null` policy for anon and authenticated; `security_invoker` on the four dependent views.
- `scripts/soft-delete-demo-data.sql` and `scripts/restore-soft-deleted.sql`.
- Live DB: all 330 rows soft-deleted (26 job posts, 72 applicants, 61 newly hired, 93 employees, 78 portal accounts). The 5 staff logins in `auth.users` are untouched.

## Deviations

- The Supabase MCP auto-declines every write from the desktop app (its confirmation request never reaches the user), so the user ran both files in the SQL editor. The first attempt didn't execute; the editor's destructive-query warning has to be confirmed.
- Real row counts were 330, not the 137 from the table listing's estimates.

## Checks run

- As postgres: 330 of 330 rows have `deleted_at` set; nothing removed.
- As anon (`set local role anon`): 0 visible rows on the five tables and on `applicant_tracker_view`, `employees_with_department`, `job_postings_with_slot_summary`. `positions` (22) and `salary_grades` (33) still visible.
- `npx tsc --noEmit` passes.

## Not verified / known gaps

- `v_competency_gap_analysis` still returns 165 rows: it is driven by `ipcr_performance` (child table, left untouched by decision) with a left join to employees, so rows remain with blank names.
- Restore script not exercised on the live DB.
- In-app check not done: the legacy anon key in `.env` was disabled on 2026-09-24, so the local dev server can't reach Supabase.
