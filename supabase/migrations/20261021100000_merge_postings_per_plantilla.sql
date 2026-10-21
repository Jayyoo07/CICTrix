-- One posting per title per office; each plantilla keeps its own description.
--
-- The sheet import (20261020) created one job posting per plantilla row, so a
-- title such as "Nurse II (Public Health Nurse)" appears three times in City
-- Health. This folds those into one posting whose plantilla slots carry what
-- used to differ per posting: division, summary and duties.
--
--   1. plantilla_slots gains division, summary, responsibilities. Empty means
--      "use the posting's", so untouched postings render exactly as before.
--   2. Postings group by title + department (trimmed, case-insensitive), live
--      rows only. The oldest survives; the rest move their slots onto it and
--      are soft-deleted (deleted_at, 20261015), never hard-deleted.
--   3. Every column that points at job_postings.id (a foreign key, or a column
--      named job_posting_id) is repointed from merged postings to the survivor.
--   4. The survivor takes the most open status in its group.
--
-- Plan: docs/plans/2026-10-21-merged-postings-per-plantilla.md
-- One transaction. Re-running finds no duplicate groups and changes nothing.
-- Undo a merge: update job_postings set deleted_at = null where id = ...;
-- (slots stay on the survivor; move them back by job_posting_id if needed).

begin;

set local search_path = public, pg_temp;

-- ── 1. Per-plantilla description columns ─────────────────────────────────────
alter table public.plantilla_slots add column if not exists division text;
alter table public.plantilla_slots add column if not exists summary  text;

-- responsibilities is text[] in some environments and jsonb in others; copy
-- whatever job_postings uses so values move across without a cast.
do $$
declare
  resp_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into resp_type
    from pg_attribute a
   where a.attrelid = 'public.job_postings'::regclass
     and a.attname = 'responsibilities'
     and not a.attisdropped;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'plantilla_slots' and column_name = 'responsibilities'
  ) then
    execute format('alter table public.plantilla_slots add column responsibilities %s', coalesce(resp_type, 'text[]'));
  end if;
end $$;

comment on column public.plantilla_slots.summary is
  'This plantilla''s own position summary. Null means the posting''s summary applies.';
comment on column public.plantilla_slots.responsibilities is
  'This plantilla''s own duties. Null means the posting''s responsibilities apply.';
comment on column public.plantilla_slots.division is
  'Division this plantilla sits in, when it differs between plantillas of one posting.';

-- GSO postings were seeded with their text in `description`, which the
-- Details page does not show; the portal reads `summary`.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'job_postings' and column_name = 'description'
  ) then
    update public.job_postings
       set summary = description
     where coalesce(btrim(summary), '') = ''
       and coalesce(btrim(description), '') <> '';
  end if;
end $$;

-- ── 2. Duplicate groups ──────────────────────────────────────────────────────
create temp table _merge on commit drop as
with live as (
  select jp.id, jp.created_at,
         lower(btrim(jp.title)) || '|' || lower(btrim(coalesce(jp.department, ''))) as group_key
    from public.job_postings jp
   where jp.deleted_at is null
     and coalesce(btrim(jp.title), '') <> ''
),
ranked as (
  select id, group_key,
         first_value(id) over (partition by group_key order by created_at nulls last, id) as survivor_id,
         count(*)        over (partition by group_key) as group_size
    from live
)
select id as posting_id, survivor_id, group_key
  from ranked
 where group_size > 1;

-- Every plantilla in a merged group carries its own posting's text, the
-- survivor's included, so all of them render per plantilla.
update public.plantilla_slots ps
   set division         = coalesce(ps.division, jp.division),
       summary          = coalesce(ps.summary, jp.summary),
       responsibilities = coalesce(ps.responsibilities, jp.responsibilities)
  from _merge m
  join public.job_postings jp on jp.id = m.posting_id
 where ps.job_posting_id = m.posting_id;

-- Slot ordinal and label are unique per posting. Before the slots meet on the
-- survivor: park every ordinal on a value no other slot uses, and suffix a
-- label that two merged postings share (both still "Plantilla 1", say) so RSP
-- can rename it in Edit Posting. The report at the end lists those.
update public.plantilla_slots ps
   set slot_number = 100000 + r.park,
       label = case when r.label_rank > 1 then ps.label || ' (duplicate ' || r.label_rank || ')' else ps.label end
  from (
    select ps2.id,
           row_number() over (order by ps2.id) as park,
           row_number() over (
             partition by m.survivor_id, lower(btrim(ps2.label))
             order by (m.posting_id = m.survivor_id) desc, ps2.slot_number
           ) as label_rank
      from public.plantilla_slots ps2
      join _merge m on m.posting_id = ps2.job_posting_id
  ) r
 where ps.id = r.id;

-- ── 3. Repoint everything that references a merged posting ───────────────────
do $$
declare
  ref record;
  moved bigint;
begin
  for ref in
    -- Foreign keys onto job_postings.id, whatever the column is called…
    select n.nspname as schema_name, c.relname as table_name, a.attname as column_name
      from pg_constraint k
      join pg_class c      on c.oid = k.conrelid
      join pg_namespace n  on n.oid = c.relnamespace
      join pg_attribute a  on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
     where k.contype = 'f'
       and k.confrelid = 'public.job_postings'::regclass
       and array_length(k.conkey, 1) = 1
    union
    -- …plus columns named job_posting_id that never got a foreign key.
    select table_schema, table_name, column_name
      from information_schema.columns
     where table_schema = 'public'
       and column_name = 'job_posting_id'
       and table_name in (select table_name from information_schema.tables
                           where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    -- Compare as text: the column is uuid in some tables and text in others.
    execute format(
      'update %I.%I t set %I = m.survivor_id::text::%s
         from _merge m
        where t.%I::text = m.posting_id::text and m.posting_id <> m.survivor_id',
      ref.schema_name, ref.table_name, ref.column_name,
      (select format_type(a.atttypid, a.atttypmod)
         from pg_attribute a
        where a.attrelid = format('%I.%I', ref.schema_name, ref.table_name)::regclass
          and a.attname = ref.column_name),
      ref.column_name
    );
    get diagnostics moved = row_count;
    if moved > 0 then
      raise notice 'Repointed % row(s) in %.%.%', moved, ref.schema_name, ref.table_name, ref.column_name;
    end if;
  end loop;
end $$;

-- Slot ordinals restart per survivor in plantilla-number order (parked above,
-- so this never clashes).
update public.plantilla_slots ps
   set slot_number = r.new_number
  from (
    select ps2.id,
           row_number() over (
             partition by ps2.job_posting_id
             order by nullif(regexp_replace(coalesce(ps2.label, ''), '\D', '', 'g'), '')::int nulls last, ps2.slot_number
           ) as new_number
      from public.plantilla_slots ps2
     where ps2.job_posting_id in (select survivor_id from _merge)
  ) r
 where ps.id = r.id;

-- ── 4. Survivor status, counts; retire the merged postings ───────────────────
update public.job_postings sv
   set status = g.best_status,
       application_deadline = coalesce(sv.application_deadline, g.latest_deadline),
       number_of_positions  = g.slot_count
  from (
    select m.survivor_id,
           case min(case jp.status when 'Open' then 1 when 'On Hold' then 2 else 3 end)
             when 1 then 'Open' when 2 then 'On Hold' else 'Closed'
           end as best_status,
           max(jp.application_deadline) filter (where jp.status = 'Open') as latest_deadline,
           (select count(*) from public.plantilla_slots ps where ps.job_posting_id = m.survivor_id) as slot_count
      from _merge m
      join public.job_postings jp on jp.id = m.posting_id
     group by m.survivor_id
  ) g
 where sv.id = g.survivor_id;

update public.job_postings jp
   set deleted_at = now()
  from _merge m
 where jp.id = m.posting_id
   and m.posting_id <> m.survivor_id;

-- ── Report ───────────────────────────────────────────────────────────────────
select jp.department,
       jp.title,
       jp.status,
       count(ps.id)                                       as plantillas,
       string_agg(ps.label, ', ' order by ps.slot_number) as labels,
       bool_or(ps.label like '% (duplicate %') as needs_rename
  from (select distinct survivor_id from _merge) s
  join public.job_postings jp on jp.id = s.survivor_id
  left join public.plantilla_slots ps on ps.job_posting_id = jp.id
 group by jp.department, jp.title, jp.status
 order by jp.department, jp.title;

commit;
