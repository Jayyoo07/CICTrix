-- ============================================================================
-- Rollback for 20261021200000_one_reference_per_applicant.sql
--
-- Restores one unique Reference No. per application (20260923/20260928).
--
--   * Applications that held their own number before the merge get it back
--     (from the alias rows' original_applicant_id).
--   * Applications filed AFTER the migration share their person's number; all
--     but the oldest per number are issued a fresh one. Those applicants will
--     need the new number to track that application.
--   * Withdrawn applications are restored to the status they had before the
--     withdrawal. Withdrawal does not happen again on later hires.
--
-- Deploy the previous frontend BEFORE running this.
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, pg_temp;

-- ── Withdrawal ──────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_withdraw_on_hire_elsewhere ON public.applicants;
DROP FUNCTION IF EXISTS public.withdraw_on_hire_elsewhere();

UPDATE public.applicants
   SET status = COALESCE(status_before_withdrawal, 'Submitted'),
       updated_at = now()
 WHERE status = 'Withdrawn - Hired Elsewhere';

UPDATE public.application_plantilla_slots
   SET status = COALESCE(status_before_withdrawal, 'applied'),
       updated_at = now()
 WHERE status = 'withdrawn';

ALTER TABLE public.application_plantilla_slots DROP CONSTRAINT IF EXISTS chk_application_plantilla_slots_status;
ALTER TABLE public.application_plantilla_slots
  ADD CONSTRAINT application_plantilla_slots_status_check
  CHECK (status IN ('applied', 'shortlisted', 'not_selected', 'hired'));
ALTER TABLE public.application_plantilla_slots DROP COLUMN IF EXISTS status_before_withdrawal;

-- ── Tracker view back to its 20260923 shape (must precede dropping columns) ─
DROP VIEW IF EXISTS public.applicant_tracker_view;
CREATE VIEW public.applicant_tracker_view WITH (security_invoker = true) AS
SELECT
  a.id, a.item_number, a.reference_no, a.reference_no_normalized,
  a.first_name, a.last_name, a.email, a.contact_number, a.position, a.office,
  a.status, a.created_at, a.updated_at, a.application_type,
  a.disqualification_reason, a.exam_date, a.exam_time, a.oral_exam_date,
  a.oral_exam_time, a.interview_date, a.interview_time, a.venue,
  a.schedule_instructions, a.disqualified_at, a.disqualification_reason_category,
  a.is_final,
  CASE WHEN a.disqualification_message_visible THEN a.disqualification_message ELSE NULL END
    AS disqualification_message,
  a.disqualification_message_visible
FROM public.applicants a;
GRANT SELECT ON public.applicant_tracker_view TO anon, authenticated, service_role;

ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS fk_applicants_hired_elsewhere;
DROP INDEX IF EXISTS public.idx_applicants_hired_elsewhere;
ALTER TABLE public.applicants DROP COLUMN IF EXISTS hired_elsewhere_application_id;
ALTER TABLE public.applicants DROP COLUMN IF EXISTS status_before_withdrawal;

DROP FUNCTION IF EXISTS public.is_hired_application_status(text);
DROP FUNCTION IF EXISTS public.is_final_application_status(text);

-- ── Reference numbers back to one per application ───────────────────────────
ALTER TABLE public.applicants DISABLE TRIGGER trg_freeze_application_reference_no;

UPDATE public.applicants a
   SET reference_no = r.reference_no
  FROM public.applicant_reference_numbers r
 WHERE r.original_applicant_id = a.id
   AND NOT r.is_primary;

-- Anything still sharing a number: oldest keeps it, the rest get fresh ones.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT id FROM (
      SELECT a.id,
             row_number() OVER (PARTITION BY a.reference_no_normalized
                                ORDER BY a.created_at NULLS LAST, a.id) AS rank_in_group
        FROM public.applicants a
       WHERE COALESCE(btrim(a.reference_no), '') <> ''
    ) ranked
    WHERE rank_in_group > 1
  LOOP
    UPDATE public.applicants
       SET reference_no = generate_application_reference_no()
     WHERE id = target.id;
  END LOOP;
END $$;

ALTER TABLE public.applicants ENABLE TRIGGER trg_freeze_application_reference_no;

DROP INDEX IF EXISTS public.idx_applicants_reference_no_normalized;
CREATE UNIQUE INDEX IF NOT EXISTS uq_applicants_reference_no_normalized
  ON public.applicants (reference_no_normalized)
  WHERE reference_no IS NOT NULL AND btrim(reference_no) <> '';

-- 20260923 versions of the generator and assignment.
CREATE OR REPLACE FUNCTION public.generate_application_reference_no()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  attempts  integer := 0;
BEGIN
  LOOP
    IF attempts < 50 THEN
      candidate := 'ABYAN-'
        || lpad((floor(random() * 1000))::int::text, 3, '0') || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0');
    ELSE
      candidate := 'ABYAN-'
        || lpad((floor(random() * 1000))::int::text, 3, '0') || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0') || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0');
    END IF;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.applicants
       WHERE reference_no_normalized = upper(regexp_replace(candidate, '[^A-Za-z0-9]', '', 'g'))
    );
    attempts := attempts + 1;
    IF attempts > 500 THEN
      RAISE EXCEPTION
        'Could not generate a unique application reference number after % attempts', attempts;
    END IF;
  END LOOP;
  RETURN candidate;
END $$;

CREATE OR REPLACE FUNCTION public.assign_application_reference_no()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.reference_no := generate_application_reference_no();
  RETURN NEW;
END $$;

DROP FUNCTION IF EXISTS public.resolve_application_reference(text);
DROP TABLE IF EXISTS public.applicant_reference_numbers;
DROP FUNCTION IF EXISTS public.normalize_applicant_email(text);
DROP FUNCTION IF EXISTS public.normalize_application_reference(text);

NOTIFY pgrst, 'reload schema';

COMMIT;
