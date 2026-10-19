-- Restores 20261001_ipcr_remarks_column.sql, which never ran on production.
-- The employee's own remarks beside each accomplishment (PM/IPCR spec §F).
-- Idempotent.
-- Plan: docs/plans/2026-10-20-migration-prod-gaps.md

alter table public.success_indicator_ratings
  add column if not exists remarks text;

comment on column public.success_indicator_ratings.remarks is
  'Employee''s own note on this success indicator (spec §F). Free text, entered in Phase 2 beside the accomplishment. Not the reviewer remarks of §E.';
