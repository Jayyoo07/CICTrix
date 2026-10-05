-- ─────────────────────────────────────────────────────────────────────────────
-- What each IPCR rating means, shown to the employee (PM/IPCR spec §G)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Section G: "The scoring criteria used in Phase 2 should be visible to the
-- employee. Employees should not have to guess what a rating means." The
-- definitions are "configurable by the PM Administrator", which is why this is
-- a table rather than wording in the code.
--
-- Global, not per office. The spec names one administrator and never mentions
-- offices, and a scale that differed between offices would make ratings across
-- the LGU non-comparable — the opposite of what publishing a scale is for.
--
-- The employee portal falls back to built-in wording when this table is empty
-- or unreadable. Someone's ability to rate their own accomplishments must not
-- depend on a configuration row existing.

create table if not exists public.ipcr_rating_scale (
  id          uuid primary key default gen_random_uuid(),
  -- 1–5. The Likert scale the Phase 2 sheet already offers.
  rating      smallint not null unique check (rating between 1 and 5),
  label       text not null,
  description text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.ipcr_rating_scale_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ipcr_rating_scale_updated_at on public.ipcr_rating_scale;
create trigger trg_ipcr_rating_scale_updated_at
  before update on public.ipcr_rating_scale
  for each row execute function public.ipcr_rating_scale_set_updated_at();

-- ── Access ──────────────────────────────────────────────────────────────────
-- anon included deliberately: the employee portal authenticates at the
-- application layer and is anonymous to Postgres, and it is the surface that
-- most needs to read this.
grant select, insert, update, delete on public.ipcr_rating_scale to anon, authenticated;

alter table public.ipcr_rating_scale enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ipcr_rating_scale'
      and policyname = 'ipcr_rating_scale_portal_access'
  ) then
    create policy ipcr_rating_scale_portal_access
      on public.ipcr_rating_scale
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- ── Seed ────────────────────────────────────────────────────────────────────
-- The wording section G gives as its example. PM should review it: these are
-- the definitions employees will rate themselves against.
insert into public.ipcr_rating_scale (rating, label, description)
select v.rating, v.label, v.description
from (values
  (5, 'Outstanding',
      'Accomplishment significantly exceeds the established target, or demonstrates exceptional accomplishment.'),
  (4, 'Very Satisfactory',
      'Accomplishment exceeds the expected target.'),
  (3, 'Satisfactory',
      'Accomplishment meets the expected target.'),
  (2, 'Unsatisfactory',
      'Accomplishment partially met the expected target.'),
  (1, 'Poor',
      'Accomplishment did not meet the expected target.')
) as v(rating, label, description)
where not exists (
  select 1 from public.ipcr_rating_scale t where t.rating = v.rating
);
