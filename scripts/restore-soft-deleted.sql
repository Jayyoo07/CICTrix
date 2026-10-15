-- Restore everything hidden by scripts/soft-delete-demo-data.sql.
-- To restore selectively, add a where clause (e.g. where id = '...').

begin;

update public.job_postings             set deleted_at = null where deleted_at is not null;
update public.applicants               set deleted_at = null where deleted_at is not null;
update public.newly_hired              set deleted_at = null where deleted_at is not null;
update public.employees                set deleted_at = null where deleted_at is not null;
update public.employee_portal_accounts set deleted_at = null where deleted_at is not null;

commit;
