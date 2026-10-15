---
title: Soft-delete demo job posts, applicants and employees
date: 2026-10-15
status: Done
summary: Hide every job post, applicant, newly hired record, employee and employee portal account behind a deleted_at column and a restrictive RLS policy, keeping all rows restorable and leaving the admin and interviewer logins untouched.
---

## Goal

Clear the live system of demo job posts, applicants and employees without removing any row, so everything can be restored. The staff logins in `auth.users` (superadmin, RSP, PM, L&D, interviewer) stay as they are.

## Approach

Add `deleted_at timestamptz` to `job_postings`, `applicants`, `newly_hired`, `employees` and `employee_portal_accounts`. A restrictive RLS policy (`deleted_at is null`) hides soft-deleted rows from the anon and authenticated roles, so no app code changes are needed. Tables that had RLS off get RLS on plus an allow-all permissive policy, so access to live rows is unchanged. The four views over these tables switch to `security_invoker` so they respect the policy. Child rows (attachments, notifications, IPCR, evaluations, storage files) are left alone.

Restore is `update <table> set deleted_at = null`.

## Steps

1. Migration `supabase/migrations/20261015_soft_delete_core_records.sql`.
2. `scripts/soft-delete-demo-data.sql` and `scripts/restore-soft-deleted.sql`.
3. Apply the migration and run the soft-delete script on the live DB after explicit go-ahead.
4. Verify as anon and in the app; commit on `chore/soft-delete-demo-data`.

## Risks

- Unique constraints still count hidden rows: `employees.employee_number` and `employee_portal_accounts.username` can collide with a hidden record if reused.
- Service-role code (Python `backend/`, `src/lib/api/officeWeighting.ts`) bypasses RLS and still sees hidden employees.
- Screens that query child tables directly can still show rows whose parent is hidden.
- `security_invoker` views now respect RLS on every joined table.

## Checks to run

- `set role anon`: counts on the five tables and four views are 0; as postgres the rows remain with `deleted_at` set.
- App: public job list, RSP applicants/job posts and employee list are empty; superadmin, RSP and interviewer logins still work.
- Restore one row, confirm it reappears, hide it again.
- `npx tsc --noEmit`.
