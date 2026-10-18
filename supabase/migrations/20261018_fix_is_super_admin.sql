-- ─────────────────────────────────────────────────────────────────────────────
-- Make is_super_admin() actually return true for a super admin
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Symptom: a super admin editing the salary schedule got "new row violates
-- row-level security policy for table salary_grades" on insert. That error
-- means the request WAS authenticated — an anonymous one is stopped earlier by
-- the missing INSERT grant with 42501 — so the policy ran and
-- public.is_super_admin() returned false.
--
-- Checked directly: public.user_roles holds role 'ADMIN', is_active true, for
-- that user_id, and the same test the function performs returns true when run
-- in the SQL editor. So the row is right and the function disagrees. Two things
-- can cause that, and this migration closes both rather than guessing:
--
--   1. RLS on user_roles hiding the row FROM THE FUNCTION. is_super_admin() is
--      SECURITY DEFINER, so it runs as its owner. If that owner is not exempt
--      from RLS on user_roles, the EXISTS sees zero rows and returns false, no
--      matter how correct the row is. Running the same query as postgres in the
--      SQL editor would still look fine, which is exactly what was observed.
--
--   2. A role string the function does not recognise. It handled underscores
--      but not spaces or surrounding whitespace, so 'Super Admin' or
--      'super-admin ' would fail the IN list while looking correct to a reader.
--
-- Nothing here widens who counts as a super admin. The role list is the same
-- one normalizeAdminRole() uses in src/App.tsx, and the new policy lets an
-- account read ONLY its own row.

-- ── 1. Let an authenticated account read its own role row ───────────────────
-- Needed so the lookup works whether it runs as the function's owner or as the
-- caller. Scoped to the caller's own row: this is not "read user_roles", it is
-- "read the row that is already about you".
grant select on public.user_roles to authenticated;

alter table public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'user_roles'
       and policyname = 'user_roles_read_own'
  ) then
    create policy user_roles_read_own
      on public.user_roles
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- ── 2. Rebuild the function so a stray space cannot defeat it ───────────────
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = auth.uid()
       and coalesce(ur.is_active, true)
       -- Mirrors normalizeAdminRole() in src/App.tsx, plus trim and spaces:
       -- 'ADMIN', 'super_admin', 'Super Admin' and 'super-admin ' all count.
       and replace(replace(lower(btrim(ur.role)), '_', '-'), ' ', '-')
             in ('admin', 'superadmin', 'super-admin')
  );
$$;

-- The function reads user_roles on behalf of the caller, so it must run as a
-- role that can see those rows. Ownership is what makes it exempt from the
-- table's RLS; the policy above covers the case where it is not.
alter function public.is_super_admin() owner to postgres;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;

-- ── 3. Check it ─────────────────────────────────────────────────────────────
-- Run as the signed-in user from the app, this returns true for a super admin.
-- Run here in the SQL editor auth.uid() is null, so it returns false — that is
-- expected and is NOT a sign the fix failed.
--
--   select public.is_super_admin();
--
-- To verify the data instead, which does work from the editor:
--
--   select u.email, ur.role, ur.is_active,
--          replace(replace(lower(btrim(ur.role)), '_', '-'), ' ', '-')
--            in ('admin','superadmin','super-admin') as would_pass
--     from public.user_roles ur
--     join auth.users u on u.id = ur.user_id
--    order by u.email;
