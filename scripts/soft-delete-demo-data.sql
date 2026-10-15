-- Soft-delete every job post, applicant, newly hired record, employee and
-- employee portal account. Nothing is removed; undo with
-- scripts/restore-soft-deleted.sql. Staff logins (auth.users) are untouched.
-- Requires supabase/migrations/20261015_soft_delete_core_records.sql.

begin;

update public.job_postings             set deleted_at = now() where deleted_at is null;
update public.applicants               set deleted_at = now() where deleted_at is null;
update public.newly_hired              set deleted_at = now() where deleted_at is null;
update public.employees                set deleted_at = now() where deleted_at is null;
update public.employee_portal_accounts set deleted_at = now() where deleted_at is null;

commit;
