-- RSP document review history, saved to the database.
--
-- Until now the resubmission/validation timeline lived in component state and
-- every entry was signed "RSP Admin". This table records who did what, and
-- when, for each applicant document. The legacy marker rows in
-- applicant_attachments (doc_validated, resubmission_request) stay as they
-- are, because the applicant portal reads them.
--
-- Also adds job_postings to Realtime so RSP pages refresh live.
--
-- Plan: docs/plans/2026-10-18-rsp-review-batch.md

begin;

create table if not exists public.applicant_document_events (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null,
  -- Raw document type (e.g. 'pds', 'transcript'); null for applicant-wide
  -- events such as "all documents validated".
  document_type text,
  event_type    text not null check (event_type in ('resubmission_requested', 'validated', 'validation_undone')),
  reason        text,
  actor_email   text,
  created_at    timestamptz not null default now()
);

create index if not exists applicant_document_events_applicant_idx
  on public.applicant_document_events (applicant_id, created_at desc);

alter table public.applicant_document_events enable row level security;

-- Same access as the other RSP tables: the browser roles read and append.
drop policy if exists applicant_document_events_read on public.applicant_document_events;
create policy applicant_document_events_read on public.applicant_document_events
  for select to anon, authenticated using (true);

drop policy if exists applicant_document_events_insert on public.applicant_document_events;
create policy applicant_document_events_insert on public.applicant_document_events
  for insert to anon, authenticated with check (true);

-- Undo a document validation. Runs as the owner so it can remove the
-- doc_validated marker rows whatever the attachment table's delete policy is.
-- Refuses once the applicant has an exam or interview scheduled.
create or replace function public.undo_document_validation(p_applicant_id uuid, p_actor_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scheduled boolean;
begin
  select (a.exam_date is not null or a.oral_exam_date is not null or a.interview_date is not null)
    into v_scheduled
    from public.applicants a
   where a.id = p_applicant_id;

  if v_scheduled is null then
    return 'not_found';
  end if;
  if v_scheduled then
    return 'locked';
  end if;

  delete from public.applicant_attachments
   where applicant_id = p_applicant_id
     and document_type = 'doc_validated';

  insert into public.applicant_document_events (applicant_id, event_type, actor_email)
  values (p_applicant_id, 'validation_undone', p_actor_email);

  update public.applicants set updated_at = now() where id = p_applicant_id;

  return 'ok';
end;
$$;

grant execute on function public.undo_document_validation(uuid, text) to anon, authenticated;

-- Realtime for live RSP pages (applicants and applicant_attachments are
-- already published).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'job_postings'
  ) then
    alter publication supabase_realtime add table public.job_postings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'applicant_document_events'
  ) then
    alter publication supabase_realtime add table public.applicant_document_events;
  end if;
end $$;

commit;
