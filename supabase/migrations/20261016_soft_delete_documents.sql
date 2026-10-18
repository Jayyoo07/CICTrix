-- Hide documents of soft-deleted applicants and employees.
--
-- Extends 20261015_soft_delete_core_records.sql. Nothing is removed: each
-- rule keys on the parent's deleted_at, so restoring the applicant or
-- employee restores its documents.
--
-- Plan: docs/plans/2026-10-16-soft-delete-documents.md

begin;

-- 1. Attachment rows of soft-deleted applicants. Reads only, so the
--    application wizard's insert flow is unaffected.
drop policy if exists applicant_attachments_hide_soft_deleted on public.applicant_attachments;
create policy applicant_attachments_hide_soft_deleted on public.applicant_attachments
  as restrictive for select to anon, authenticated
  using (exists (
    select 1 from public.applicants a
    where a.id = applicant_attachments.applicant_id and a.deleted_at is null
  ));

-- 2. Employee documents. RLS was off, so turn it on with an allow-all policy
--    to keep current access, then hide rows of soft-deleted employees.
--    Rows with no employee stay visible.
alter table public.employee_documents enable row level security;

drop policy if exists employee_documents_open_access on public.employee_documents;
create policy employee_documents_open_access on public.employee_documents
  as permissive for all to anon, authenticated using (true) with check (true);

drop policy if exists employee_documents_hide_soft_deleted on public.employee_documents;
create policy employee_documents_hide_soft_deleted on public.employee_documents
  as restrictive for select to anon, authenticated
  using (
    employee_id is null
    or exists (
      select 1 from public.employees e
      where e.id = employee_documents.employee_id and e.deleted_at is null
    )
  );

-- 3. Files in the private applicant-attachments bucket. The lookup must see
--    attachment rows that step 1 hides from the caller, so it runs as the
--    function owner. Files no attachment row points to stay readable, so
--    uploads (which happen before the row is saved) keep working.
--
--    storage.objects is owned by supabase_storage_admin, so postgres can't
--    create policies on it here. Apply the policy change in the dashboard
--    (Storage > Policies), editing "Allow public read attachments" to:
--      bucket_id = 'applicant-attachments'
--      and not public.applicant_file_is_soft_deleted(name)
create or replace function public.applicant_file_is_soft_deleted(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applicant_attachments aa
    join public.applicants a on a.id = aa.applicant_id
    where aa.file_path = object_name and a.deleted_at is not null
  );
$$;

revoke all on function public.applicant_file_is_soft_deleted(text) from public;
grant execute on function public.applicant_file_is_soft_deleted(text) to anon, authenticated;

-- The employee-documents bucket is public: its URLs bypass RLS, so those
-- files are hidden only by step 2 removing their links from the app.

commit;
