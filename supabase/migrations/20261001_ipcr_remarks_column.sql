-- ─────────────────────────────────────────────────────────────────────────────
-- Remarks on the employee's IPCR row (PM/IPCR spec §F)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Section F asks for a Remarks column on the employee's IPCR, a plain text
-- field, so a row can read:
--
--   Performance Indicator | Accomplishment       | Rating | Remarks
--   Process reports       | 20 reports completed |      5 | Submitted ahead of deadline
--
-- It sits on success_indicator_ratings, beside `accomplishment`, because that
-- is where the employee's Phase 2 entry already lives — one row per success
-- indicator. Remarks then follow the same lifecycle as the rest of the entry:
-- saved with a draft, locked on submission, returned with a revision.
--
-- Not on success_indicators. That table holds the target the office set and the
-- employee may not edit it; these are the employee's own words about their own
-- accomplishment.
--
-- Distinct from the PM / Department Head remarks in §E, which are a reviewer's
-- comments on a submission and belong to the amendment workflow. Keeping them
-- apart is what makes it clear whose voice a line is written in.

alter table public.success_indicator_ratings
  add column if not exists remarks text;

comment on column public.success_indicator_ratings.remarks is
  'Employee''s own note on this success indicator (spec §F). Free text, entered in Phase 2 beside the accomplishment. Not the reviewer remarks of §E.';
