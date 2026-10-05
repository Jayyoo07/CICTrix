grant select on public.user_roles to authenticated;

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

create table if not exists public.user_roles (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  email      text,
  name       text,
  role       text        not null,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_user_id_unique unique (user_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

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
    create policy user_roles_self_read
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

end $$;

alter table public.employees
  add column if not exists place_of_birth            text,
  add column if not exists height_m                  numeric(4,2),
  add column if not exists weight_kg                 numeric(5,2),
  add column if not exists blood_type                text,
  add column if not exists umid_number               text,
  add column if not exists philsys_number            text,
  add column if not exists citizenship               text,
  add column if not exists citizenship_basis         text,
  add column if not exists dual_citizenship_country  text,
  add column if not exists telephone_number          text,
  add column if not exists mobile_number             text,

  add column if not exists residential_house_lot     text,
  add column if not exists residential_street        text,
  add column if not exists residential_subdivision   text,
  add column if not exists residential_barangay      text,
  add column if not exists residential_city          text,
  add column if not exists residential_province      text,
  add column if not exists residential_zip           text,

  add column if not exists permanent_house_lot       text,
  add column if not exists permanent_street          text,
  add column if not exists permanent_subdivision     text,
  add column if not exists permanent_barangay        text,
  add column if not exists permanent_city            text,
  add column if not exists permanent_province        text,
  add column if not exists permanent_zip             text,

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
  add column if not exists mother_surname            text,
  add column if not exists mother_first_name         text,
  add column if not exists mother_middle_name        text,

  add column if not exists pds_signed_at             timestamptz,
  add column if not exists pds_updated_at            timestamptz;

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

alter table public.employee_education
  add column if not exists level                text,
  add column if not exists period_from          text,
  add column if not exists period_to            text,
  add column if not exists highest_level_units  text,
  add column if not exists scholarship_honors   text,
  add column if not exists sort_order           integer not null default 0;

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

create table if not exists public.idp_form_config (
  id            uuid        primary key default gen_random_uuid(),

  scope         text        not null default 'system',

  form_url      text,
  responses_url text,

  instructions  text,

  mode          text        not null default 'Closed'
                            check (mode in ('Auto', 'Open', 'Closed')),
  opens_at      date,
  closes_at     date,

  updated_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint idp_form_config_scope_unique unique (scope)
);

insert into public.idp_form_config (scope, mode, instructions)
values (
  'system',
  'Closed',
  'Complete your Individual Development Plan for this cycle.'
)
on conflict (scope) do nothing;

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

create table if not exists public.idp_submissions (
  id            uuid        primary key default gen_random_uuid(),

  employee_id   text        not null,

  cycle_year    integer     not null,

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

  skills_to_develop             text,
  strengths_to_utilize          text,
  works_outside_job_description boolean,
  outside_tasks                 text,

  career_needs      text[]  not null default '{}',
  career_other      text,
  career_specifics  text,

  personal_goals     text[] not null default '{}',
  personal_other     text,
  personal_specifics text,

  other_topics  text,

  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint idp_submissions_employee_cycle_unique unique (employee_id, cycle_year)
);

create index if not exists idp_submissions_cycle_office_idx
  on public.idp_submissions (cycle_year, office);
create index if not exists idp_submissions_employee_idx
  on public.idp_submissions (employee_id, cycle_year);

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
    create policy idp_submissions_portal_access
      on public.idp_submissions
      for all
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

alter table public.positions
  add column if not exists salary_grade      smallint,

  add column if not exists position_level    text,

  add column if not exists level_order       smallint,

  add column if not exists parent_position_id uuid
    references public.positions(id) on delete set null,

  add column if not exists min_education             text,
  add column if not exists min_education_field       text,
  add column if not exists required_eligibility      text,
  add column if not exists min_years_experience      numeric(4,1),
  add column if not exists min_training_hours        numeric(6,1),
  add column if not exists required_training_categories text[] not null default '{}',

  add column if not exists is_active         boolean not null default true;

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
create index if not exists positions_name_lower_idx   on public.positions (lower(name));

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

insert into public.positions (
  name, department, salary_grade, min_education, min_education_field,
  required_eligibility, min_years_experience, min_training_hours
)
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
