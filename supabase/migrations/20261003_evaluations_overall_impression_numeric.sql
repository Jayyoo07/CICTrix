-- ============================================================================
-- Migration: evaluations.overall_impression_score accepts decimals
-- Date: 2026-10-03
-- Rollback: supabase/rollbacks/20261003_evaluations_overall_impression_numeric_rollback.sql
--
-- WHY
--
--   For promotional applicants the interviewer form stores the PCPT average
--   (e.g. 4.5) in overall_impression_score. The column was INTEGER, so Postgres
--   rejected every promotional evaluation whose average was not a whole number.
--
-- WHAT CHANGES
--
--   overall_impression_score: integer -> numeric. The stored value is exactly
--   what the form computes; no score is recalculated or rounded. Existing
--   integer values convert without loss.
--
-- Idempotent, safe to re-run.
-- ============================================================================

BEGIN;

ALTER TABLE public.evaluations
  ALTER COLUMN overall_impression_score TYPE numeric
  USING overall_impression_score::numeric;

-- Make PostgREST pick up the new column type immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;
