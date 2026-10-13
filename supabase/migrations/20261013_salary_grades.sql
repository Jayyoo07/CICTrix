-- ─────────────────────────────────────────────────────────────────────────────
-- CSC salary schedule (SG 1–33, steps 1–8)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every salary amount in the system comes from here. Before this, salary grade
-- and monthly salary were free text on each job post, so two postings at the
-- same grade could show different amounts and nothing checked either against
-- the official schedule.
--
-- Keyed by (salary_grade, step). Job posts and plantilla items carry only a
-- grade, so they always use Step 1 — the CSC hiring rate. Steps 2–8 hold the
-- rest of the schedule for reference and for step increments later.
--
-- Decision D1: editing an amount updates every job post at that grade,
-- including ones already published. The trigger at the bottom does that, so the
-- sync holds no matter which screen or script makes the edit — a service-layer
-- implementation would be bypassed by the next direct write.

create table if not exists public.salary_grades (
  salary_grade   smallint  not null check (salary_grade between 1 and 33),
  step           smallint  not null default 1 check (step between 1 and 8),
  monthly_salary numeric(12,2) not null check (monthly_salary > 0),
  updated_at     timestamptz not null default now(),
  -- auth.users id of the super admin who last changed the amount. Nullable
  -- because the seed below is written by the migration, not by a person.
  updated_by     uuid,
  primary key (salary_grade, step)
);

comment on table public.salary_grades is
  'Official CSC salary schedule. Step 1 is the hiring rate every job post uses; steps 2-8 are reference. Edited by super admins only.';

create or replace function public.salary_grades_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_salary_grades_updated_at on public.salary_grades;
create trigger trg_salary_grades_updated_at
  before update on public.salary_grades
  for each row execute function public.salary_grades_set_updated_at();

-- ── Access ──────────────────────────────────────────────────────────────────
-- Readable by everyone: public job pages show the salary, and the applicant
-- portal is anonymous to Postgres. Writable only by super admins, enforced in
-- the database rather than only in the UI, so hiding the sidebar tab is not the
-- thing standing between an RSP admin and the national salary schedule.
grant select on public.salary_grades to anon, authenticated;
grant insert, update, delete on public.salary_grades to authenticated;

alter table public.salary_grades enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'salary_grades'
                    and policyname = 'salary_grades_read') then
    create policy salary_grades_read
      on public.salary_grades for select to anon, authenticated using (true);
  end if;

  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'salary_grades'
                    and policyname = 'salary_grades_super_admin_insert') then
    create policy salary_grades_super_admin_insert
      on public.salary_grades for insert to authenticated
      with check (public.is_super_admin());
  end if;

  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'salary_grades'
                    and policyname = 'salary_grades_super_admin_update') then
    create policy salary_grades_super_admin_update
      on public.salary_grades for update to authenticated
      using (public.is_super_admin()) with check (public.is_super_admin());
  end if;

  -- Step 1 can never be deleted: every job post at that grade reads its amount,
  -- and removing it would leave those posts pointing at nothing. Enforced here
  -- rather than only in the UI for the same reason as above.
  if not exists (select 1 from pg_policies
                  where schemaname = 'public' and tablename = 'salary_grades'
                    and policyname = 'salary_grades_super_admin_delete') then
    create policy salary_grades_super_admin_delete
      on public.salary_grades for delete to authenticated
      using (public.is_super_admin() and step > 1);
  end if;
end $$;

-- ── Seed: Step 1 for all 33 grades, from the official schedule ──────────────
insert into public.salary_grades (salary_grade, step, monthly_salary)
select v.sg, 1, v.amount
from (values
  (1::smallint,  14634::numeric), (2,  15522), (3,  16486), (4,  17506),
  (5,  18581), (6,  19716), (7,  20914), (8,  22423),
  (9,  24329), (10, 26917), (11, 31705), (12, 33947),
  (13, 36125), (14, 38764), (15, 42178), (16, 45694),
  (17, 49562), (18, 53818), (19, 59153), (20, 66052),
  (21, 73303), (22, 81796), (23, 91306), (24, 102603),
  (25, 116643), (26, 131807), (27, 148940), (28, 167129),
  (29, 187531), (30, 210718), (31, 300961), (32, 356237),
  (33, 449157)
) as v(sg, amount)
where not exists (
  select 1 from public.salary_grades s where s.salary_grade = v.sg and s.step = 1
);

-- ── D1 sync: a Step 1 amount change rewrites the posts at that grade ────────
--
-- job_postings.salary_grade is not the same type in every environment — it is
-- an integer in production and text elsewhere, which is why 20260924 had to
-- cast before matching it. The same applies here: compare on text, and only
-- when the stored value is actually a number, so a row holding "N/A" is left
-- alone instead of failing the whole update.
create or replace function public.sync_salaries_for_grade()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
begin
  if new.step <> 1 then
    return new;
  end if;

  update public.job_postings jp
     set monthly_salary = new.monthly_salary
   where jp.salary_grade::text ~ '^[0-9]+$'
     and jp.salary_grade::text::int = new.salary_grade;

  update public.plantilla_slots ps
     set monthly_salary = new.monthly_salary
   where ps.salary_grade::text ~ '^[0-9]+$'
     and ps.salary_grade::text::int = new.salary_grade;

  return new;
end;
$$;

drop trigger if exists trg_salary_grades_sync on public.salary_grades;
create trigger trg_salary_grades_sync
  after update of monthly_salary on public.salary_grades
  for each row
  when (old.monthly_salary is distinct from new.monthly_salary)
  execute function public.sync_salaries_for_grade();

-- ─────────────────────────────────────────────────────────────────────────────
-- NOT run here: the one-off backfill that brings existing posts into line.
--
-- The trigger only fires on future edits, so posts written before this
-- migration keep whatever amount was typed into them. Aligning them is a data
-- decision for HR, not a schema one — it rewrites published salaries — so the
-- read-only query below lists the differences first. Run it, share the result,
-- and only then run the update underneath it.
--
--   select jp.id, jp.title, jp.salary_grade, jp.monthly_salary as posted,
--          sg.monthly_salary as official
--     from public.job_postings jp
--     join public.salary_grades sg
--       on sg.step = 1
--      and jp.salary_grade::text ~ '^[0-9]+$'
--      and jp.salary_grade::text::int = sg.salary_grade
--    where jp.monthly_salary is distinct from sg.monthly_salary;
--
--   -- then, once HR has agreed:
--   -- update public.job_postings jp set monthly_salary = sg.monthly_salary
--   --   from public.salary_grades sg
--   --  where sg.step = 1
--   --    and jp.salary_grade::text ~ '^[0-9]+$'
--   --    and jp.salary_grade::text::int = sg.salary_grade;
-- ─────────────────────────────────────────────────────────────────────────────
