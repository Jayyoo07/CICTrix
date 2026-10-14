-- ============================================================================
-- Migration: one Reference No. per applicant; hiring withdraws their other
-- applications
-- Date: 2026-10-15
-- Plan: docs/plans/2026-10-15-one-reference-multi-plantilla.md
-- Rollback: supabase/rollbacks/20261015_one_reference_per_applicant_rollback.sql
--
-- WHAT CHANGES
--
--   1. A Reference No. identifies a PERSON (normalised email; the public portal
--      has no accounts), not a single application. Every application that
--      person files carries the same number. New table
--      applicant_reference_numbers is where numbers are minted and the only
--      uniqueness guarantee: one primary number per email. The per-row unique
--      index from 20260923 is dropped, since rows now share a number.
--
--   2. Backfill. A person who already holds several numbers keeps the oldest
--      application's number as their primary; every one of their rows is
--      rewritten to it. The other numbers stay as ALIASES, so a printout an
--      applicant already has still finds them (resolve_application_reference).
--
--   3. New final status 'Withdrawn - Hired Elsewhere'. When an application is
--      hired (Selected / Hired / Accepted), every OTHER open application of the
--      same person is withdrawn, remembering the status it had and which hire
--      caused it. Reverting that hire restores them. Done here, not in the app,
--      because five separate client paths write a hire.
--
--   4. applicant_tracker_view gains the plantilla label and, for withdrawn
--      rows, where the person was hired. Columns are appended, so existing
--      readers are unaffected.
--
-- UNCHANGED: numbers are still assigned server-side on insert, still in the
-- ABYAN-000-000 shape, and still frozen once issued (except by this backfill).
-- A person hired earlier can still apply again (promotion); the new
-- application is open, because withdrawal only happens at the moment of a hire.
--
-- Requires 20260922, 20260923 and 20260928. Idempotent, safe to re-run.
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, pg_temp;

-- ── 0. Normalisers ──────────────────────────────────────────────────────────
-- The same expressions 20260923 and 20260928 use inline, named once here so
-- the triggers, backfill and lookup cannot drift apart.
CREATE OR REPLACE FUNCTION public.normalize_application_reference(raw text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT upper(regexp_replace(COALESCE(raw, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- Blank email -> NULL: such applications are never merged with anyone.
CREATE OR REPLACE FUNCTION public.normalize_applicant_email(raw text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT NULLIF(lower(btrim(COALESCE(raw, ''))), '') $$;

-- ── 1. Where numbers live ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applicant_reference_numbers (
  reference_no_normalized text PRIMARY KEY,
  reference_no            text NOT NULL,
  email_normalized        text,
  is_primary              boolean NOT NULL DEFAULT true,
  -- Alias rows only: the application that was issued this number before the
  -- merge. Lets the rollback hand every application its own number back.
  original_applicant_id   uuid,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_applicant_reference_one_primary_per_email
  ON public.applicant_reference_numbers (email_normalized)
  WHERE is_primary AND email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applicant_reference_email
  ON public.applicant_reference_numbers (email_normalized);

-- Not readable by the public portal directly. Anonymous lookups go through
-- resolve_application_reference, which returns only the primary number.
ALTER TABLE public.applicant_reference_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applicant_reference_numbers_staff_read ON public.applicant_reference_numbers;
CREATE POLICY applicant_reference_numbers_staff_read
  ON public.applicant_reference_numbers
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.applicant_reference_numbers TO authenticated, service_role;

-- ── 2. Shared numbers on applicants ─────────────────────────────────────────
DROP INDEX IF EXISTS public.uq_applicants_reference_no_normalized;

CREATE INDEX IF NOT EXISTS idx_applicants_reference_no_normalized
  ON public.applicants (reference_no_normalized);

-- ── 3. Generator: collisions are checked against the registry ───────────────
-- Same shape and widening rule as 20260923. Applicants is still checked as
-- well, in case a row's number was never registered.
CREATE OR REPLACE FUNCTION public.generate_application_reference_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  candidate text;
  attempts  integer := 0;
BEGIN
  LOOP
    IF attempts < 50 THEN
      candidate := 'ABYAN-'
        || lpad((floor(random() * 1000))::int::text, 3, '0')
        || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0');
    ELSE
      candidate := 'ABYAN-'
        || lpad((floor(random() * 1000))::int::text, 3, '0')
        || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0')
        || '-'
        || lpad((floor(random() * 1000))::int::text, 3, '0');
    END IF;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.applicant_reference_numbers r
       WHERE r.reference_no_normalized = normalize_application_reference(candidate)
    ) AND NOT EXISTS (
      SELECT 1 FROM public.applicants a
       WHERE a.reference_no_normalized = normalize_application_reference(candidate)
    );

    attempts := attempts + 1;
    IF attempts > 500 THEN
      RAISE EXCEPTION
        'Could not generate a unique application reference number after % attempts', attempts;
    END IF;
  END LOOP;

  RETURN candidate;
END $$;

-- ── 4. Assignment: reuse the person's number, or mint one ───────────────────
-- SECURITY DEFINER because applications are inserted by the anonymous portal,
-- which cannot read or write the registry itself.
CREATE OR REPLACE FUNCTION public.assign_application_reference_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  person   text := normalize_applicant_email(NEW.email);
  existing text;
  minted   text;
BEGIN
  IF person IS NULL THEN
    minted := generate_application_reference_no();
    INSERT INTO applicant_reference_numbers (reference_no_normalized, reference_no, email_normalized, is_primary)
    VALUES (normalize_application_reference(minted), minted, NULL, true);
    NEW.reference_no := minted;
    RETURN NEW;
  END IF;

  -- Two first applications from the same new email can race. The loser's
  -- INSERT does nothing and it picks up the winner's number on the next pass.
  FOR attempt IN 1..5 LOOP
    SELECT r.reference_no INTO existing
      FROM applicant_reference_numbers r
     WHERE r.email_normalized = person AND r.is_primary;

    IF existing IS NOT NULL THEN
      NEW.reference_no := existing;
      RETURN NEW;
    END IF;

    minted := generate_application_reference_no();
    INSERT INTO applicant_reference_numbers (reference_no_normalized, reference_no, email_normalized, is_primary)
    VALUES (normalize_application_reference(minted), minted, person, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE EXCEPTION 'Could not assign a reference number for this applicant';
END $$;

-- Triggers from 20260923 keep calling these by name; recreate them anyway so
-- a partially applied database ends up in the same state.
DROP TRIGGER IF EXISTS trg_assign_application_reference_no ON public.applicants;
CREATE TRIGGER trg_assign_application_reference_no
  BEFORE INSERT ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.assign_application_reference_no();

-- ── 5. Backfill ─────────────────────────────────────────────────────────────
-- Primary per person: the number already registered (re-runs), otherwise the
-- number on their oldest application. Every other number they hold becomes an
-- alias tied to the application that held it.
DO $$
BEGIN
  -- Rows with no email keep their own number, registered as its own primary.
  INSERT INTO applicant_reference_numbers (reference_no_normalized, reference_no, email_normalized, is_primary)
  SELECT DISTINCT ON (a.reference_no_normalized)
         a.reference_no_normalized, a.reference_no, NULL, true
    FROM applicants a
   WHERE normalize_applicant_email(a.email) IS NULL
     AND COALESCE(btrim(a.reference_no), '') <> ''
   ORDER BY a.reference_no_normalized, a.created_at NULLS LAST, a.id
  ON CONFLICT DO NOTHING;

  -- Oldest application's number becomes the person's primary.
  INSERT INTO applicant_reference_numbers (reference_no_normalized, reference_no, email_normalized, is_primary)
  SELECT DISTINCT ON (normalize_applicant_email(a.email))
         a.reference_no_normalized, a.reference_no, normalize_applicant_email(a.email), true
    FROM applicants a
   WHERE normalize_applicant_email(a.email) IS NOT NULL
     AND COALESCE(btrim(a.reference_no), '') <> ''
     AND NOT EXISTS (
       SELECT 1 FROM applicant_reference_numbers r
        WHERE r.email_normalized = normalize_applicant_email(a.email) AND r.is_primary
     )
   ORDER BY normalize_applicant_email(a.email), a.created_at NULLS LAST, a.id
  ON CONFLICT DO NOTHING;

  -- Everyone else's numbers are kept as aliases.
  INSERT INTO applicant_reference_numbers
         (reference_no_normalized, reference_no, email_normalized, is_primary, original_applicant_id)
  SELECT a.reference_no_normalized, a.reference_no, normalize_applicant_email(a.email), false, a.id
    FROM applicants a
   WHERE normalize_applicant_email(a.email) IS NOT NULL
     AND COALESCE(btrim(a.reference_no), '') <> ''
  ON CONFLICT DO NOTHING;
END $$;

-- The freeze trigger would silently undo this rewrite, so it is paused for
-- exactly this statement. It is the one sanctioned change to an issued number.
ALTER TABLE public.applicants DISABLE TRIGGER trg_freeze_application_reference_no;

UPDATE public.applicants a
   SET reference_no = r.reference_no
  FROM public.applicant_reference_numbers r
 WHERE r.is_primary
   AND r.email_normalized = normalize_applicant_email(a.email)
   AND a.reference_no IS DISTINCT FROM r.reference_no;

ALTER TABLE public.applicants ENABLE TRIGGER trg_freeze_application_reference_no;

-- ── 6. Lookup for the public tracker ────────────────────────────────────────
-- Any number a person was ever given (primary or alias) -> their primary.
-- Returns NULL for an unknown number. Reveals nothing the holder of the
-- number could not already see.
CREATE OR REPLACE FUNCTION public.resolve_application_reference(raw text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(p.reference_no, r.reference_no)
    FROM applicant_reference_numbers r
    LEFT JOIN applicant_reference_numbers p
      ON p.is_primary
     AND p.email_normalized = r.email_normalized
     AND r.email_normalized IS NOT NULL
   WHERE r.reference_no_normalized = normalize_application_reference(raw)
$$;

GRANT EXECUTE ON FUNCTION public.resolve_application_reference(text) TO anon, authenticated, service_role;

-- ── 7. Withdrawal bookkeeping ───────────────────────────────────────────────
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS hired_elsewhere_application_id uuid;
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS status_before_withdrawal text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applicants_hired_elsewhere') THEN
    ALTER TABLE public.applicants
      ADD CONSTRAINT fk_applicants_hired_elsewhere
      FOREIGN KEY (hired_elsewhere_application_id) REFERENCES public.applicants (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applicants_hired_elsewhere
  ON public.applicants (hired_elsewhere_application_id)
  WHERE hired_elsewhere_application_id IS NOT NULL;

-- Per-plantilla link rows get the same treatment, so screens that read the
-- link table also see the withdrawal.
ALTER TABLE public.application_plantilla_slots ADD COLUMN IF NOT EXISTS status_before_withdrawal text;

-- 20260922 declared the status CHECK inline, so its name is whatever Postgres
-- generated. Find it by content rather than guess.
DO $$
DECLARE
  old_check text;
BEGIN
  FOR old_check IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.application_plantilla_slots'::regclass
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%status%'
       AND c.conname <> 'chk_application_plantilla_slots_status'
  LOOP
    EXECUTE format('ALTER TABLE public.application_plantilla_slots DROP CONSTRAINT %I', old_check);
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_application_plantilla_slots_status') THEN
    ALTER TABLE public.application_plantilla_slots
      ADD CONSTRAINT chk_application_plantilla_slots_status
      CHECK (status IN ('applied', 'shortlisted', 'not_selected', 'hired', 'withdrawn'));
  END IF;
END $$;

-- ── 8. Hiring withdraws the person's other open applications ────────────────
-- 'Selected' is the canonical hire; 'Hired' and 'Accepted' are still written
-- by older paths (hiredApplicantSync, employeesApi). A change between two of
-- them (Selected -> Hired) is not a new hire and does nothing.
CREATE OR REPLACE FUNCTION public.is_hired_application_status(s text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$ SELECT lower(btrim(COALESCE(s, ''))) IN ('selected', 'hired', 'accepted') $$;

-- Final statuses are never withdrawn: their outcome is already decided.
CREATE OR REPLACE FUNCTION public.is_final_application_status(s text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT lower(btrim(COALESCE(s, ''))) IN (
    'selected', 'hired', 'accepted',
    'disqualified', 'not selected', 'rejected',
    'withdrawn - hired elsewhere'
  )
$$;

-- SECURITY DEFINER: the person's other applications may sit under offices the
-- hiring admin's own policies do not cover. The hire still has to happen.
CREATE OR REPLACE FUNCTION public.withdraw_on_hire_elsewhere()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  person   text := normalize_applicant_email(NEW.email);
  affected uuid[];
BEGIN
  IF is_hired_application_status(NEW.status) AND NOT is_hired_application_status(OLD.status) THEN
    IF person IS NULL THEN
      RETURN NULL;
    END IF;

    WITH withdrawn AS (
      UPDATE applicants o
         SET status_before_withdrawal       = o.status,
             status                         = 'Withdrawn - Hired Elsewhere',
             hired_elsewhere_application_id = NEW.id,
             updated_at                     = now()
       WHERE o.id <> NEW.id
         AND normalize_applicant_email(o.email) = person
         AND NOT is_final_application_status(o.status)
      RETURNING o.id
    )
    SELECT array_agg(id) INTO affected FROM withdrawn;

    IF affected IS NOT NULL THEN
      UPDATE application_plantilla_slots s
         SET status_before_withdrawal = s.status,
             status                   = 'withdrawn',
             updated_at               = now()
       WHERE s.applicant_id = ANY (affected)
         AND s.status IN ('applied', 'shortlisted');
    END IF;

  ELSIF is_hired_application_status(OLD.status) AND NOT is_hired_application_status(NEW.status) THEN
    -- The hire was reverted: put back what it withdrew.
    WITH restored AS (
      UPDATE applicants o
         SET status                         = COALESCE(o.status_before_withdrawal, 'Submitted'),
             status_before_withdrawal       = NULL,
             hired_elsewhere_application_id = NULL,
             updated_at                     = now()
       WHERE o.hired_elsewhere_application_id = NEW.id
         AND o.status = 'Withdrawn - Hired Elsewhere'
      RETURNING o.id
    )
    SELECT array_agg(id) INTO affected FROM restored;

    IF affected IS NOT NULL THEN
      UPDATE application_plantilla_slots s
         SET status                   = COALESCE(s.status_before_withdrawal, 'applied'),
             status_before_withdrawal = NULL,
             updated_at               = now()
       WHERE s.applicant_id = ANY (affected)
         AND s.status = 'withdrawn';
    END IF;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_withdraw_on_hire_elsewhere ON public.applicants;
CREATE TRIGGER trg_withdraw_on_hire_elsewhere
  AFTER UPDATE OF status ON public.applicants
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.withdraw_on_hire_elsewhere();

-- Anyone already hired before this migration: withdraw their other open
-- applications now, exactly as the trigger would have. The newest hire wins
-- when a person somehow holds several.
WITH latest_hire AS (
  SELECT DISTINCT ON (normalize_applicant_email(h.email))
         h.id, normalize_applicant_email(h.email) AS person
    FROM public.applicants h
   WHERE is_hired_application_status(h.status)
     AND normalize_applicant_email(h.email) IS NOT NULL
   ORDER BY normalize_applicant_email(h.email), h.updated_at DESC NULLS LAST, h.id
),
withdrawn AS (
  UPDATE public.applicants o
     SET status_before_withdrawal       = o.status,
         status                         = 'Withdrawn - Hired Elsewhere',
         hired_elsewhere_application_id = lh.id,
         updated_at                     = now()
    FROM latest_hire lh
   WHERE normalize_applicant_email(o.email) = lh.person
     AND o.id <> lh.id
     AND NOT is_final_application_status(o.status)
     -- Applied after being hired: a promotion application, left open.
     AND o.created_at <= (SELECT h.updated_at FROM public.applicants h WHERE h.id = lh.id)
  RETURNING o.id
)
UPDATE public.application_plantilla_slots s
   SET status_before_withdrawal = s.status,
       status                   = 'withdrawn',
       updated_at               = now()
  FROM withdrawn w
 WHERE s.applicant_id = w.id
   AND s.status IN ('applied', 'shortlisted');

-- ── 9. Tracker view ─────────────────────────────────────────────────────────
-- Columns from 20260923 unchanged and in the same order; new ones appended,
-- which CREATE OR REPLACE allows without dropping dependants.
CREATE OR REPLACE VIEW public.applicant_tracker_view AS
SELECT
  a.id,
  a.item_number,
  a.reference_no,
  a.reference_no_normalized,
  a.first_name,
  a.last_name,
  a.email,
  a.contact_number,
  a.position,
  a.office,
  a.status,
  a.created_at,
  a.updated_at,
  a.application_type,
  a.disqualification_reason,
  a.exam_date,
  a.exam_time,
  a.oral_exam_date,
  a.oral_exam_time,
  a.interview_date,
  a.interview_time,
  a.venue,
  a.schedule_instructions,
  a.disqualified_at,
  a.disqualification_reason_category,
  a.is_final,
  CASE
    WHEN a.disqualification_message_visible THEN a.disqualification_message
    ELSE NULL
  END AS disqualification_message,
  a.disqualification_message_visible,
  -- disqualified_by is intentionally omitted — never exposed to the public tracker.
  a.plantilla_slot_id,
  ps.label  AS plantilla_label,
  a.hired_elsewhere_application_id,
  h.position AS hired_elsewhere_position,
  hps.label AS hired_elsewhere_plantilla_label
FROM public.applicants a
LEFT JOIN public.plantilla_slots ps  ON ps.id  = a.plantilla_slot_id
LEFT JOIN public.applicants      h   ON h.id   = a.hired_elsewhere_application_id
LEFT JOIN public.plantilla_slots hps ON hps.id = h.plantilla_slot_id;

GRANT SELECT ON public.applicant_tracker_view TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
