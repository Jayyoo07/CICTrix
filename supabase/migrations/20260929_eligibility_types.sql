-- ─────────────────────────────────────────────────────────────────────────────
-- Configurable points per eligibility type (succession spec §B–D)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Section D: multiple valid eligibilities raise an employee's Eligibility score,
-- but not without limit.
--
--   Eligibility Raw Score      = points from valid/relevant eligibility records
--   Eligibility Weighted Score = Raw Score × 15%
--
-- and, in the spec's words, "the RSP/HR administrator should be able to
-- configure the points assigned to each eligibility type". That is the whole
-- reason this is a table and not a constant in the code.
--
-- The cap is what keeps a long list of minor credentials from reaching full
-- marks. points_for_full_marks is the raw total that earns the entire 15%;
-- anything beyond it is capped. It lives on each row so the single-row
-- settings table this would otherwise need does not exist — every row carries
-- the same value and the application reads it from the first active row.
--
-- employee_eligibility is NOT touched here. It belongs to the Personal Data
-- Sheet work; its supporting-document and verification-status columns are
-- being added there, so scoring reads only the columns that exist today:
-- eligibility_type, date_of_exam, validity_date, license_number.

create table if not exists public.eligibility_types (
  id          uuid primary key default gen_random_uuid(),
  -- Matched case-insensitively against employee_eligibility.eligibility_type.
  name        text not null,
  -- What one record of this type contributes to the raw score. Set by HR; the
  -- seed below is a placeholder, not a recommendation.
  points      numeric(6,2) not null default 0,
  -- Raw total that earns the full Eligibility weight. Same on every row.
  points_for_full_marks numeric(6,2) not null default 100,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One configuration per type name. Case-insensitive, because the names arrive
-- from free-text PDS entry and "CSC Professional" must not sit beside
-- "csc professional" with different points.
create unique index if not exists eligibility_types_name_uq
  on public.eligibility_types (lower(name));

create index if not exists eligibility_types_active_idx
  on public.eligibility_types (is_active, sort_order);

create or replace function public.eligibility_types_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_eligibility_types_updated_at on public.eligibility_types;
create trigger trg_eligibility_types_updated_at
  before update on public.eligibility_types
  for each row execute function public.eligibility_types_set_updated_at();

-- ── Access ──────────────────────────────────────────────────────────────────
-- Granted explicitly: a clone of this project came up with tables restored but
-- no grants, which made every read fail with 42501 behind a working login.
grant select, insert, update, delete on public.eligibility_types to anon, authenticated;

alter table public.eligibility_types enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'eligibility_types'
      and policyname = 'eligibility_types_portal_access'
  ) then
    create policy eligibility_types_portal_access
      on public.eligibility_types
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- ── Seed ────────────────────────────────────────────────────────────────────
-- The types section B names. POINTS ARE PLACEHOLDERS — ranking is not
-- meaningful until HR sets them in Succession → Eligibility Points. They are
-- seeded non-zero only so the screen is not empty on first open; zero would be
-- indistinguishable from "configured as worth nothing".
insert into public.eligibility_types (name, points, sort_order)
select v.name, v.points, v.sort_order
from (values
  ('Civil Service Eligibility (Professional)', 40::numeric, 1),
  ('Civil Service Eligibility (Sub-Professional)', 25::numeric, 2),
  ('PRC Professional License', 40::numeric, 3),
  ('Bar / Board Eligibility (RA 1080)', 40::numeric, 4),
  ('Latin Honors', 15::numeric, 5),
  ('Barangay Eligibility', 10::numeric, 6),
  ("Professional Driver's License", 5::numeric, 7),
  ('Other Recognized Eligibility', 5::numeric, 8)
) as v(name, points, sort_order)
where not exists (
  select 1 from public.eligibility_types t where lower(t.name) = lower(v.name)
);
