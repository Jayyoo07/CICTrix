-- ============================================================================
-- Pending migrations for PRODUCTION (fyzdfgxaaowjzbjpwrii)
-- Regenerated 2026-10-05. Paste into the Supabase SQL Editor and Run.
--
-- Additive only: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, GRANT, CREATE POLICY, and INSERTs guarded by
-- ON CONFLICT DO NOTHING. Nothing is dropped, truncated or overwritten, so
-- re-running it is safe.
--
-- Check the project ref in the editor URL reads fyzdfgxaaowjzbjpwrii first.
-- ============================================================================


-- ─── 20260921_user_roles_grant_authenticated_select.sql ───────────────────────────────

-- Fix: admin login fails with "No role assigned. Contact the admin." on any
-- cloned Supabase project (first hit on the HR demo, hydqhmtppkghqaatdgwx).
--
-- LoginPage.tsx reads public.user_roles after signInWithPassword to resolve
-- which admin portal to route to:
--
--     .from('user_roles').select('role').eq('user_id', user.id).single()
--
-- public.user_roles was created by hand in the Supabase dashboard on production
-- and never captured in a migration, so neither the table nor its grants travel
-- with the schema. On a clone the rows get restored by scripts/restore-database
-- but `authenticated` holds no SELECT privilege, so that read fails with
--
--     42501  permission denied for table user_roles
--
-- LoginPage treats any error from the lookup as "no role", discards the session
-- and shows "No role assigned" — so a correctly provisioned admin with a valid
-- user_roles row still cannot log in. Auth succeeds; only the role read fails.
--
-- Idempotent and a no-op on production, where the grant already exists.

grant select on public.user_roles to authenticated;

-- If RLS is enabled on the table, the grant alone still yields zero rows and
-- .single() errors out to the same message. Add a self-read policy, but only
-- when RLS is actually on and nothing already grants SELECT — this must not
-- loosen a project that has deliberately stricter policies.
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename  = 'user_roles'
      and rowsecurity
  ) and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_roles'
      and cmd in ('SELECT', 'ALL')
  ) then
    create policy user_roles_select_own
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;


-- ─── 20260923_user_roles_table.sql ───────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- user_roles — maps a Supabase Auth user to an admin portal role
-- ─────────────────────────────────────────────────────────────────────────────
--
-- This table existed only in production, created by hand in the dashboard and
-- captured in no migration. Two failures followed from that, both hit on the
-- HR demo clone:
--
--   * The clone had the table but no grant to `authenticated`, so the role
--     lookup failed with 42501 and every admin saw "No role assigned. Contact
--     the admin." while Supabase Auth was happily returning a valid session.
--   * Rebuilding the clone's schema dropped the table outright, and nothing in
--     the repo could recreate it — the same lockout, with no way back except
--     hand-writing the DDL again.
--
-- Capturing it here means a fresh project gets a working admin login from the
-- migrations alone.
--
-- LoginPage.tsx reads this immediately after signInWithPassword:
--   .from('user_roles').select('role').eq('user_id', user.id).single()
-- and treats any error as "no role", so a missing grant and a missing row are
-- indistinguishable to the person trying to sign in.

create table if not exists public.user_roles (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  email      text,
  name       text,
  -- Stored as written by scripts/create-admin-accounts.mjs (ADMIN, RSP, LND,
  -- PM); LoginPage normalises it, so no CHECK constraint here that would have
  -- to be kept in step with the front end.
  role       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_user_id_unique unique (user_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- ── Access ──────────────────────────────────────────────────────────────────
-- Explicit, because the absence of exactly this grant is what broke admin
-- login on the clone. `authenticated` is the role that matters: the admin
-- portals sign in through Supabase Auth, so the lookup runs as that role.
grant select, insert, update, delete on public.user_roles to authenticated;
grant select on public.user_roles to anon;

alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'user_roles'
      and policyname = 'user_roles_self_read'
  ) then
    -- A signed-in user reads their own role row. That is all LoginPage needs,
    -- and it keeps one admin from enumerating the others.
    create policy user_roles_self_read
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

end $$;


-- ─── 20260922_pds_cs_form_212_page1.sql ───────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Personal Data Sheet — CS Form No. 212 (Revised 2025), page 1
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The employee portal's "Personal Information" tab showed nine read-only fields.
-- It is being replaced by a Personal Data Sheet that follows the actual CSC
-- form, so the columns below are the page-1 fields the employees table did not
-- already carry.
--
-- Already present and deliberately reused rather than duplicated:
--   first_name / middle_name / last_name   1. and 2. SURNAME / FIRST / MIDDLE
--   suffix                                 NAME EXTENSION (JR., SR.)
--   date_of_birth                          3. DATE OF BIRTH
--   sex                                    5. SEX AT BIRTH
--   civil_status                           6. CIVIL STATUS
--   employee_number                        15. AGENCY EMPLOYEE NO.
--   email                                  21. E-MAIL ADDRESS
--   tin_number / sss_number /              14. TIN, and the GSIS/PhilHealth/
--   philhealth_number / pagibig_number /       Pag-IBIG identifiers
--   gsis_number
--
-- Addresses are stored as discrete components rather than one free-text line
-- because the form prints them into separate boxes (House/Block/Lot, Street,
-- Subdivision/Village, Barangay, City/Municipality, Province, ZIP) and a single
-- string cannot be split back apart reliably.

-- ── I. PERSONAL INFORMATION ─────────────────────────────────────────────────
alter table public.employees
  add column if not exists place_of_birth            text,
  add column if not exists height_m                  numeric(4,2),
  add column if not exists weight_kg                 numeric(5,2),
  add column if not exists blood_type                text,
  add column if not exists umid_number               text,
  add column if not exists philsys_number            text,
  add column if not exists citizenship               text,
  -- 16. CITIZENSHIP is "by birth" or "by naturalization", with the country
  -- named only when the holder has dual citizenship.
  add column if not exists citizenship_basis         text,
  add column if not exists dual_citizenship_country  text,
  add column if not exists telephone_number          text,
  -- `phone` already exists and is written by several older code paths, so the
  -- form's 20. MOBILE NO. gets its own column rather than redefining that one.
  add column if not exists mobile_number             text,

  -- 17. RESIDENTIAL ADDRESS
  add column if not exists residential_house_lot     text,
  add column if not exists residential_street        text,
  add column if not exists residential_subdivision   text,
  add column if not exists residential_barangay      text,
  add column if not exists residential_city          text,
  add column if not exists residential_province      text,
  add column if not exists residential_zip           text,

  -- 18. PERMANENT ADDRESS
  add column if not exists permanent_house_lot       text,
  add column if not exists permanent_street          text,
  add column if not exists permanent_subdivision     text,
  add column if not exists permanent_barangay        text,
  add column if not exists permanent_city            text,
  add column if not exists permanent_province        text,
  add column if not exists permanent_zip             text,

-- ── II. FAMILY BACKGROUND ───────────────────────────────────────────────────
  add column if not exists spouse_surname            text,
  add column if not exists spouse_first_name         text,
  add column if not exists spouse_middle_name        text,
  add column if not exists spouse_suffix             text,
  add column if not exists spouse_occupation         text,
  add column if not exists spouse_employer           text,
  add column if not exists spouse_business_address   text,
  add column if not exists spouse_telephone          text,
  add column if not exists father_surname            text,
  add column if not exists father_first_name         text,
  add column if not exists father_middle_name        text,
  add column if not exists father_suffix             text,
  -- 25. MOTHER'S MAIDEN NAME — maiden surname, so it is not father_surname.
  add column if not exists mother_surname            text,
  add column if not exists mother_first_name         text,
  add column if not exists mother_middle_name        text,

-- ── Sheet metadata ──────────────────────────────────────────────────────────
  -- The form carries a signature and date; recording when the employee last
  -- affirmed the sheet is what makes a printed copy defensible.
  add column if not exists pds_signed_at             timestamptz,
  add column if not exists pds_updated_at            timestamptz;

-- ── 23. NAME of CHILDREN ────────────────────────────────────────────────────
-- A repeating list on the form, so it cannot live in columns on employees.
create table if not exists public.employee_children (
  id            uuid        primary key default gen_random_uuid(),
  employee_id   uuid        not null references public.employees(id) on delete cascade,
  full_name     text        not null,
  date_of_birth date,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists employee_children_employee_idx
  on public.employee_children (employee_id, sort_order);

-- ── III. EDUCATIONAL BACKGROUND ─────────────────────────────────────────────
-- employee_education already exists but only held school / degree /
-- year_graduated. The form needs the level it belongs to, the attendance
-- period, units earned when not graduated, and honours received.
alter table public.employee_education
  add column if not exists level                text,
  add column if not exists period_from          text,
  add column if not exists period_to            text,
  add column if not exists highest_level_units  text,
  add column if not exists scholarship_honors   text,
  add column if not exists sort_order           integer not null default 0;

-- ── Access ──────────────────────────────────────────────────────────────────
-- Granted explicitly. A clone of this project came up with tables restored but
-- no grants, which made every read fail with 42501 and left the portal blank
-- behind a working login; a new table must not reintroduce that.
--
-- Both roles: the admin portals use Supabase Auth (authenticated), while the
-- employee portal authenticates against employee_portal_accounts at the
-- application layer and is therefore anonymous to Postgres.
grant select, insert, update, delete on public.employee_children to anon, authenticated;

alter table public.employee_children enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'employee_children'
      and policyname = 'employee_children_portal_access'
  ) then
    create policy employee_children_portal_access
      on public.employee_children
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;


-- ─── 20260922_idp_form_config.sql ───────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Individual Development Plan — form link and its own open/close window
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The IDP is filled in through a Google Form, and L&D wants it reachable only
-- during a scheduled window rather than all year round.
--
-- Deliberately its own table, not a new phase key on phase_schedules. That
-- table drives the IPCR Target-Setting and Rating phases, which are a different
-- cycle owned by Performance Management: bolting the IDP onto it would mean
-- L&D and PM editing the same rows, and an IPCR phase change silently moving
-- the IDP window. The two schedules have no reason to move together.
--
-- The form and responses URLs live in the database rather than in the bundle so
-- L&D can point the portal at a new form each cycle without a redeploy — a form
-- link is not something that should require an engineer.

create table if not exists public.idp_form_config (
  id            uuid        primary key default gen_random_uuid(),

  -- 'system' is the single active configuration. The column exists so a later
  -- per-office window can be added without reshaping the table.
  scope         text        not null default 'system',

  -- The employee-facing Google Form, and the responses spreadsheet L&D reads.
  -- The responses sheet is never shown to employees; it is recorded here so the
  -- pair stays together and nobody has to go hunting for which sheet belongs to
  -- which form.
  form_url      text,
  responses_url text,

  -- Shown above the form. Somewhere for L&D to say what this round is for.
  instructions  text,

  -- 'Auto' derives open/closed from the dates below; 'Open' and 'Closed' force
  -- it regardless, which is what you want when a deadline slips.
  mode          text        not null default 'Closed'
                            check (mode in ('Auto', 'Open', 'Closed')),
  opens_at      date,
  closes_at     date,

  updated_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint idp_form_config_scope_unique unique (scope)
);

-- Seed the single system row so the L&D screen has something to edit and the
-- employee page has something to read. Closed by default: a window that opens
-- itself the moment the migration lands is not what anyone wants.
insert into public.idp_form_config (scope, mode, instructions)
values (
  'system',
  'Closed',
  'Complete your Individual Development Plan for this cycle.'
)
on conflict (scope) do nothing;

-- ── Access ──────────────────────────────────────────────────────────────────
-- Both roles: the L&D admin screens use Supabase Auth (authenticated), while
-- the employee portal authenticates against employee_portal_accounts at the
-- application layer and is anonymous to Postgres.
--
-- Granted explicitly because a clone of this project came up with tables
-- restored but no grants, which made every read fail with 42501 and left the
-- portal blank behind a working login.
grant select, insert, update, delete on public.idp_form_config to anon, authenticated;

alter table public.idp_form_config enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'idp_form_config'
      and policyname = 'idp_form_config_portal_access'
  ) then
    create policy idp_form_config_portal_access
      on public.idp_form_config
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;


-- ─── 20260923_idp_submissions.sql ───────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- IDP submissions — the Individual Development Plan questionnaire
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The IDP was originally a Google Form. It is now filled in inside the portal,
-- built the same way as the interviewer evaluation form, because the responses
-- have to be readable by the system: L&D's annual output is a per-office matrix
-- of development needs, and that cannot be produced from a spreadsheet the app
-- has no access to.
--
-- Structure follows the printed questionnaire section for section:
--   PERSONAL DATA -> SELF-EVALUATION -> Part III (conditional)
--   -> CAREER DEVELOPMENT -> PERSONAL DEVELOPMENT -> RECOMMENDATION
--
-- The two checkbox groups are stored as arrays rather than child tables. The
-- option sets are fixed and short, and every read of them is "count responses
-- per category per office", which unnest() answers directly.

create table if not exists public.idp_submissions (
  id            uuid        primary key default gen_random_uuid(),

  -- Text, not a uuid FK: the employee portal identifies people by the same
  -- employee number that employee_portal_accounts.employee_id carries, and that
  -- column is text in both the production and the older employees shapes.
  employee_id   text        not null,

  -- The form runs once a year, so the cycle is part of the identity of a
  -- submission rather than something derived from submitted_at — a window that
  -- straddles New Year would otherwise split one cycle across two years.
  cycle_year    integer     not null,

  -- ── PERSONAL DATA ─────────────────────────────────────────────────────────
  -- Pre-filled from the employee's record where known, but stored here as
  -- answered: the sheet is a point-in-time declaration, and a later promotion
  -- must not silently rewrite what somebody submitted last cycle.
  full_name                 text,
  office                    text,
  division                  text,
  position                  text,
  salary_grade              text,
  years_in_position         text,
  years_government_service  text,
  eligibility               text,
  educational_attainment    text,
  age                       text,
  gender                    text,
  email                     text,

  -- ── SELF-EVALUATION ───────────────────────────────────────────────────────
  skills_to_develop             text,
  strengths_to_utilize          text,
  works_outside_job_description boolean,
  -- Part III, asked only when the answer above is YES.
  outside_tasks                 text,

  -- ── CAREER DEVELOPMENT ────────────────────────────────────────────────────
  career_needs      text[]  not null default '{}',
  career_other      text,
  career_specifics  text,

  -- ── PERSONAL DEVELOPMENT ──────────────────────────────────────────────────
  personal_goals     text[] not null default '{}',
  personal_other     text,
  personal_specifics text,

  -- ── RECOMMENDATION ────────────────────────────────────────────────────────
  other_topics  text,

  -- Null while a draft is in progress; set when the employee submits. The
  -- report counts submitted rows only.
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- One submission per employee per cycle. Re-opening a window lets an employee
  -- revise their row rather than file a second one.
  constraint idp_submissions_employee_cycle_unique unique (employee_id, cycle_year)
);

-- The report groups by office within a cycle; the tracker looks up one
-- employee's row for the current cycle.
create index if not exists idp_submissions_cycle_office_idx
  on public.idp_submissions (cycle_year, office);
create index if not exists idp_submissions_employee_idx
  on public.idp_submissions (employee_id, cycle_year);

-- ── Access ──────────────────────────────────────────────────────────────────
-- Both roles: L&D reads through Supabase Auth (authenticated), while the
-- employee portal authenticates at the application layer and is anonymous to
-- Postgres.
--
-- Granted explicitly, because a clone of this project came up with tables
-- restored but no grants, which made every read fail with 42501.
grant select, insert, update, delete on public.idp_submissions to anon, authenticated;

alter table public.idp_submissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'idp_submissions'
      and policyname = 'idp_submissions_portal_access'
  ) then
    -- NOTE: this is as tight as the current architecture allows. Employees have
    -- no Supabase identity — the portal authenticates them against
    -- employee_portal_accounts at the application layer — so there is no
    -- auth.uid() to scope rows by, and a per-employee policy is not expressible
    -- here. Anyone holding the public anon key can therefore read every
    -- submission, which for self-evaluations and salary grades is worth closing
    -- properly by moving the employee portal onto Supabase Auth.
    create policy idp_submissions_portal_access
      on public.idp_submissions
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;


-- ─── 20260924_srp_position_ranking.sql ───────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- System of Ranking Positions (SRP) — succession specification, section C
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Succession needs to know how positions rank relative to one another, so that
-- a candidate's current position can be judged appropriate for a target — and
-- so the system never proposes somebody in a higher-ranked position for a
-- lower-ranked one.
--
-- Extends the existing `positions` table rather than adding another. It already
-- holds name/department and is already the thing
-- position_competency_requirements points at, which is the SRP's "required
-- competencies" line; a parallel table would split the definition in two.
--
-- The SRP is meant to define, per section C:
--   Position                  -> positions.name (existing)
--   Position level / rank     -> salary_grade + position_level + level_order
--   Minimum qualifications    -> min_education, min_education_field,
--                                required_eligibility
--   Required experience       -> min_years_experience
--   Required training         -> min_training_hours, required_training_categories
--   Required competencies     -> position_competency_requirements (existing FK)
--   Position hierarchy        -> parent_position_id
--
-- Two ranking signals, deliberately:
--
--   salary_grade is the civil-service ladder and the one to trust — it is
--   ordinal, externally defined, and already recorded against most job
--   postings. Where it is set, it decides rank.
--
--   level_order exists because it is not always set. Production job postings
--   carry a salary grade on 14 of 22 rows, so a grade-only comparison would
--   leave a third of positions unrankable. The Staff -> Senior Staff ->
--   Supervisor -> Division Chief ladder from the spec gives a coarse fallback.
--   Comparing a position that has neither must return "unknown" rather than
--   "equal", or an unranked position silently reads as a peer of everything.

alter table public.positions
  -- Civil-service salary grade, 1–33. The primary rank signal.
  add column if not exists salary_grade      smallint,

  -- Human-readable rung, e.g. 'Staff', 'Senior Staff', 'Supervisor',
  -- 'Division Chief'. Free text so an office can use its own vocabulary.
  add column if not exists position_level    text,

  -- Numeric ordering for position_level, since the labels themselves do not
  -- sort. Higher means more senior. Only meaningful within an organisation.
  add column if not exists level_order       smallint,

  -- Position hierarchy: the position this one reports into. Self-referencing,
  -- so a chain reads Staff -> Senior Staff -> Supervisor -> Division Chief.
  add column if not exists parent_position_id uuid
    references public.positions(id) on delete set null,

  -- Minimum qualifications, mirroring what critical_positions already carries
  -- so a critical position can inherit from its SRP entry instead of repeating
  -- every threshold by hand.
  add column if not exists min_education             text,
  add column if not exists min_education_field       text,
  add column if not exists required_eligibility      text,
  add column if not exists min_years_experience      numeric(4,1),
  add column if not exists min_training_hours        numeric(6,1),
  add column if not exists required_training_categories text[] not null default '{}',

  -- A position that has been abolished stays on the record for history but
  -- should not appear as a succession target.
  add column if not exists is_active         boolean not null default true;

-- Salary grade is an external scale; a typo outside it is a data error, not a
-- very senior position.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'positions_salary_grade_range'
  ) then
    alter table public.positions
      add constraint positions_salary_grade_range
      check (salary_grade is null or (salary_grade between 1 and 33));
  end if;
end $$;

-- A position cannot report to itself. Deeper cycles are not caught here — that
-- needs a recursive check the application does when editing the hierarchy.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'positions_no_self_parent'
  ) then
    alter table public.positions
      add constraint positions_no_self_parent
      check (parent_position_id is null or parent_position_id <> id);
  end if;
end $$;

create index if not exists positions_salary_grade_idx on public.positions (salary_grade);
create index if not exists positions_parent_idx       on public.positions (parent_position_id);
-- Resolving an employee's rank from their free-text position title needs a
-- case-insensitive lookup on name; employees.position_id is rarely populated.
create index if not exists positions_name_lower_idx   on public.positions (lower(name));

-- ── Access ──────────────────────────────────────────────────────────────────
-- Granted explicitly: a clone of this project came up with tables restored but
-- no grants, which made every read fail with 42501 behind a working login.
grant select, insert, update, delete on public.positions to anon, authenticated;

alter table public.positions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'positions'
      and policyname = 'positions_portal_access'
  ) then
    create policy positions_portal_access
      on public.positions
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- ── Seeding from existing job postings ──────────────────────────────────────
-- job_postings already carries title, department, salary grade and every
-- requirement the SRP wants, for 22 real positions. Lifting them gives the SRP
-- something to stand on rather than an empty screen.
--
-- position_level is deliberately left null: that column is null on every job
-- posting too, so there is nothing to copy and guessing a rung from a title
-- would put invented hierarchy into the system of record. HR fills it in.
insert into public.positions (
  name, department, salary_grade, min_education, min_education_field,
  required_eligibility, min_years_experience, min_training_hours
)
-- Every source column is cast to text before matching. These columns are not
-- the same type in every environment — salary_grade is an integer in
-- production and text elsewhere — and the regex operator does not accept an
-- integer, so an uncast match fails outright with 42883. Casting to text first
-- works for both, and keeps the guard meaningful where the column really is
-- free text holding things like "N/A".
select distinct on (lower(jp.title), lower(coalesce(jp.department, '')))
  jp.title,
  coalesce(jp.department, 'Unassigned'),
  case when jp.salary_grade::text ~ '^[0-9]+$'
         and jp.salary_grade::text::int between 1 and 33
       then jp.salary_grade::text::smallint end,
  jp.education_requirement,
  jp.education_field,
  jp.eligibility,
  case when jp.experience_years::text ~ '^[0-9]+(\.[0-9]+)?$'
       then jp.experience_years::text::numeric end,
  case when jp.training_requirement::text ~ '^[0-9]+(\.[0-9]+)?$'
       then jp.training_requirement::text::numeric end
from public.job_postings jp
where coalesce(trim(jp.title), '') <> ''
order by lower(jp.title), lower(coalesce(jp.department, '')), jp.created_at desc
on conflict (name, department) do nothing;

