-- ============================================================================
-- Rollback for 20261003_evaluations_overall_impression_numeric.sql
--
-- Restores overall_impression_score to INTEGER.
--
-- What is LOST on rollback:
--   * decimal PCPT averages saved after the migration are rounded to the
--     nearest whole number (4.5 -> 5, 3.67 -> 4)
--
-- After rollback, promotional evaluations with a non-whole PCPT average fail
-- to save again.
-- ============================================================================

BEGIN;

ALTER TABLE public.evaluations
  ALTER COLUMN overall_impression_score TYPE integer
  USING round(overall_impression_score)::integer;

NOTIFY pgrst, 'reload schema';

COMMIT;
