-- Soft delete for the core recruitment and employee records.
--
-- Rows with deleted_at set are hidden from the browser roles (anon,
-- authenticated) by a RESTRICTIVE policy, so no app query needs changing.
-- service_role and the table owner still see everything.
-- Restore a row with: update <table> set deleted_at = null where ...;
--
-- Plan: docs/plans/2026-10-15-soft-delete-demo-data.md

begin;

-- 1. The soft-delete marker.
alter table public.job_postings             add column if not exists deleted_at timestamptz;
alter table public.applicants               add column if not exists deleted_at timestamptz;
alter table public.newly_hired              add column if not exists deleted_at timestamptz;
alter table public.employees                add column if not exists deleted_at timestamptz;
alter table public.employee_portal_accounts add column if not exists deleted_at timestamptz;

-- 2. These four had RLS off, which meant full access for anon and
--    authenticated. Turn RLS on with an allow-all policy so live rows keep
--    exactly that access. (applicants already has RLS and its own policies.)
do $$
declare
  t text;
begin
  foreach t in array array['job_postings', 'newly_hired', 'employees', 'employee_portal_accounts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_open_access', t);
    execute format(
      'create policy %I on public.%I as permissive for all to anon, authenticated using (true) with check (true)',
      t || '_open_access', t
    );
  end loop;
end $$;

-- 3. Hide soft-deleted rows from the browser roles on all five tables.
do $$
declare
  t text;
begin
  foreach t in array array['job_postings', 'applicants', 'newly_hired', 'employees', 'employee_portal_accounts'] loop
    execute format('drop policy if exists %I on public.%I', t || '_hide_soft_deleted', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to anon, authenticated using (deleted_at is null) with check (true)',
      t || '_hide_soft_deleted', t
    );
  end loop;
end $$;

-- 4. Views run as their owner by default and would bypass the policy above.
alter view public.applicant_tracker_view         set (security_invoker = true);
alter view public.employees_with_department      set (security_invoker = true);
alter view public.job_postings_with_slot_summary set (security_invoker = true);
alter view public.v_competency_gap_analysis      set (security_invoker = true);

commit;
