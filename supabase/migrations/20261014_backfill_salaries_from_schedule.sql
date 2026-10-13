-- ─────────────────────────────────────────────────────────────────────────────
-- Bring existing job posts in line with the CSC salary schedule
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 20261013 created salary_grades and a trigger that keeps job posts in step
-- whenever a Step 1 amount changes. The trigger only fires on future edits, so
-- posts written before it kept whatever was typed into them — including one
-- advertising SG 1 at Php 3.00 against an official rate of ₱14,634.
--
-- This was deliberately left out of 20261013 because it rewrites salaries on
-- published vacancies, which is a decision for HR rather than a schema change.
-- Run STEP 1 first and look at what it returns. Only run STEP 2 once those
-- differences have been agreed.
--
-- Rows whose salary_grade is empty or non-numeric are left alone: there is no
-- schedule entry to align them to, and guessing would be worse than leaving a
-- posting as it was written.

-- ── STEP 1 — read-only. What would change, and from what to what. ───────────
select
  'job_posting'              as record,
  jp.id,
  jp.title                   as identifier,
  -- Cast to text on both sides of the union: this column is an integer in
  -- production and text elsewhere, so an uncast union fails on type mismatch.
  jp.salary_grade::text,
  jp.monthly_salary          as currently_posted,
  sg.monthly_salary          as official_rate
from public.job_postings jp
join public.salary_grades sg
  on sg.step = 1
 and jp.salary_grade::text ~ '^[0-9]+$'
 and jp.salary_grade::text::int = sg.salary_grade
where jp.monthly_salary is distinct from sg.monthly_salary

union all

select
  'plantilla_slot',
  ps.id,
  -- item_number, not label: `label` is added by migration 20260928, which has
  -- not run on every environment. item_number has been on the table since it
  -- was created and identifies the slot just as well.
  ps.item_number,
  ps.salary_grade::text,
  ps.monthly_salary,
  sg.monthly_salary
from public.plantilla_slots ps
join public.salary_grades sg
  on sg.step = 1
 and ps.salary_grade::text ~ '^[0-9]+$'
 and ps.salary_grade::text::int = sg.salary_grade
where ps.monthly_salary is distinct from sg.monthly_salary

order by record, id;

-- ── STEP 2 — the rewrite. Run only after STEP 1 has been reviewed. ──────────
--
-- Uncomment and run together. Both statements are idempotent: a second run
-- matches nothing, because the amounts already agree.
--
-- begin;
--
-- update public.job_postings jp
--    set monthly_salary = sg.monthly_salary
--   from public.salary_grades sg
--  where sg.step = 1
--    and jp.salary_grade::text ~ '^[0-9]+$'
--    and jp.salary_grade::text::int = sg.salary_grade
--    and jp.monthly_salary is distinct from sg.monthly_salary;
--
-- update public.plantilla_slots ps
--    set monthly_salary = sg.monthly_salary
--   from public.salary_grades sg
--  where sg.step = 1
--    and ps.salary_grade::text ~ '^[0-9]+$'
--    and ps.salary_grade::text::int = sg.salary_grade
--    and ps.monthly_salary is distinct from sg.monthly_salary;
--
-- commit;
--
-- ── Afterwards: postings that still cannot be aligned ───────────────────────
-- These carry no usable salary grade, so nothing in the schedule applies to
-- them. Worth a look, since a vacancy with no grade cannot be priced at all.
--
--   select id, title, salary_grade, monthly_salary
--     from public.job_postings
--    where salary_grade is null or salary_grade::text !~ '^[0-9]+$';
