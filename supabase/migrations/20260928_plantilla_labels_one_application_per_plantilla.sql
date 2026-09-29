-- ============================================================================
-- Migration: plantillas are admin labels; one application per applicant per
-- plantilla
-- Date: 2026-09-28
-- Rollback: supabase/rollbacks/20260928_plantilla_labels_one_application_per_plantilla_rollback.sql
--
-- WHAT CHANGES
--
--   1. A plantilla is a LABEL the RSP Admin types ("Plantilla 1", "Plantilla 20").
--      New column plantilla_slots.label, unique per job posting. Existing rows
--      are backfilled from their ordinal, so they read exactly as before.
--
--   2. plantilla_slots.item_number stops being a visible "Plantilla Item No."
--      and becomes a hidden internal key. It is NOT dropped and existing values
--      are NOT rewritten: applicants.item_number and ~17 places in the app
--      still match applications to postings on it, and old applications must
--      keep resolving. New plantillas get a neutral PLT-… key by default, so
--      nothing ABYAN-shaped is ever created for a plantilla again.
--
--   3. Each application row links directly to ITS plantilla
--      (applicants.plantilla_slot_id). One applicant (identified by email, the
--      public portal has no accounts) can file ONE application per plantilla:
--      enforced by a unique index. They can still apply to several plantillas.
--      application_plantilla_slots is kept in step by a trigger, so every RSP
--      screen that reads it keeps working.
--
--   4. A plantilla that already has applications cannot be deleted on its own
--      (close it instead). Deleting a whole job posting still works — it is
--      archived by the app and its plantillas go with it.
--
--   5. plantilla_slot_applicant_counts: applicants per plantilla, for RSP.
--
-- UNCHANGED: application reference numbers (ABYAN-000-000). They are still
-- generated server-side on insert by trg_assign_application_reference_no from
-- 20260923, unique, and frozen once issued.
--
-- Requires 20260922 and 20260923. Additive, idempotent, safe to re-run.
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, pg_temp;

-- ── 1. Admin-entered label ──────────────────────────────────────────────────
ALTER TABLE public.plantilla_slots ADD COLUMN IF NOT EXISTS label text;

-- Existing plantillas were shown as "Plantilla <ordinal>"; keep that wording.
UPDATE public.plantilla_slots
   SET label = 'Plantilla ' || slot_number
 WHERE label IS NULL OR btrim(label) = '';

ALTER TABLE public.plantilla_slots ALTER COLUMN label SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_plantilla_slots_label_not_blank') THEN
    ALTER TABLE public.plantilla_slots
      ADD CONSTRAINT chk_plantilla_slots_label_not_blank CHECK (btrim(label) <> '');
  END IF;
END $$;

-- "Plantilla 2" and " plantilla 2 " are the same label within one posting.
-- Different postings may reuse a label freely.
CREATE UNIQUE INDEX IF NOT EXISTS uq_plantilla_slots_posting_label
  ON public.plantilla_slots (job_posting_id, lower(btrim(label)));

-- ── 2. item_number becomes an internal key ──────────────────────────────────
-- Clients no longer need to invent one. The system-wide unique index from
-- 20260922 still applies, and 10 hex chars of a UUID won't collide in practice.
ALTER TABLE public.plantilla_slots
  ALTER COLUMN item_number
  SET DEFAULT ('PLT-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 10)));

COMMENT ON COLUMN public.plantilla_slots.item_number IS
  'Internal key only; never displayed. Kept because applicants.item_number matches on it. Label is the display name.';
COMMENT ON COLUMN public.plantilla_slots.label IS
  'Admin-entered display name, e.g. "Plantilla 2". Unique per job posting.';

-- ── 3. Application -> its plantilla ─────────────────────────────────────────
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS plantilla_slot_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_applicants_plantilla_slot') THEN
    ALTER TABLE public.applicants
      ADD CONSTRAINT fk_applicants_plantilla_slot
      FOREIGN KEY (plantilla_slot_id) REFERENCES public.plantilla_slots (id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'applicants -> plantilla_slots FK skipped: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_applicants_plantilla_slot
  ON public.applicants (plantilla_slot_id);

-- Backfill. Only an application linked to EXACTLY ONE plantilla can be said to
-- be "for" that plantilla; older applications that ticked several plantillas
-- in one submission keep their link rows and a NULL here (they still show on
-- every RSP screen through application_plantilla_slots).
--
-- If one email already holds two applications for the same plantilla, the
-- unique index below could not be created. The oldest keeps the link; the
-- rest keep their application and link rows, just not this column. Nothing is
-- deleted. The NOTICE reports how many were left unlinked.
DO $$
DECLARE
  skipped integer;
BEGIN
  WITH single_link AS (
    SELECT aps.applicant_id, min(aps.plantilla_slot_id::text)::uuid AS slot_id
      FROM public.application_plantilla_slots aps
     GROUP BY aps.applicant_id
    HAVING count(*) = 1
  ),
  ranked AS (
    SELECT a.id,
           s.slot_id,
           row_number() OVER (
             PARTITION BY lower(btrim(COALESCE(a.email, ''))), s.slot_id
             ORDER BY a.created_at NULLS LAST, a.id
           ) AS rank_in_group
      FROM public.applicants a
      JOIN single_link s ON s.applicant_id = a.id
     WHERE a.plantilla_slot_id IS NULL
       -- Re-run safety: never claim a pair that is already taken.
       AND NOT EXISTS (
         SELECT 1 FROM public.applicants other
          WHERE other.id <> a.id
            AND other.plantilla_slot_id = s.slot_id
            AND lower(btrim(COALESCE(other.email, ''))) = lower(btrim(COALESCE(a.email, '')))
       )
  )
  UPDATE public.applicants a
     SET plantilla_slot_id = r.slot_id
    FROM ranked r
   WHERE a.id = r.id
     AND r.rank_in_group = 1;

  SELECT count(*) INTO skipped
    FROM public.applicants a
    JOIN public.application_plantilla_slots aps ON aps.applicant_id = a.id
   WHERE a.plantilla_slot_id IS NULL;
  RAISE NOTICE '% application link(s) left without plantilla_slot_id (multi-plantilla legacy or duplicate); their link rows are intact.', skipped;
END $$;

-- The rule itself: one application per applicant per plantilla.
CREATE UNIQUE INDEX IF NOT EXISTS uq_applicants_one_per_plantilla
  ON public.applicants (lower(btrim(email)), plantilla_slot_id)
  WHERE plantilla_slot_id IS NOT NULL;

-- Keep the link table in step, so RSP screens that read it see every new
-- application even if the client's own link call never lands.
CREATE OR REPLACE FUNCTION public.link_application_to_its_plantilla()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.plantilla_slot_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.plantilla_slot_id IS DISTINCT FROM OLD.plantilla_slot_id) THEN
    INSERT INTO public.application_plantilla_slots (applicant_id, plantilla_slot_id, status)
    VALUES (NEW.id, NEW.plantilla_slot_id, 'applied')
    ON CONFLICT (applicant_id, plantilla_slot_id) DO NOTHING;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_link_application_to_its_plantilla ON public.applicants;
CREATE TRIGGER trg_link_application_to_its_plantilla
  AFTER INSERT OR UPDATE OF plantilla_slot_id ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.link_application_to_its_plantilla();

-- ── 4. No deleting a plantilla that has applications ────────────────────────
-- Fires before trg_flag_orphaned_applicants (triggers run in name order), so a
-- blocked delete never flags anyone.
--
-- A whole job posting being deleted cascades here with its parent row already
-- gone; that path is allowed, because the app archives those applicants first.
CREATE OR REPLACE FUNCTION public.block_delete_of_plantilla_with_applications()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  application_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.job_postings jp WHERE jp.id = OLD.job_posting_id) THEN
    RETURN OLD; -- cascading from the posting's own deletion
  END IF;

  SELECT count(DISTINCT applicant_id) INTO application_count FROM (
    SELECT aps.applicant_id FROM public.application_plantilla_slots aps WHERE aps.plantilla_slot_id = OLD.id
    UNION
    SELECT a.id FROM public.applicants a WHERE a.plantilla_slot_id = OLD.id
  ) linked;

  IF application_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format('plantilla_has_applications: "%s" has %s application(s). Close it instead of deleting it.',
                       OLD.label, application_count),
      HINT = 'Set plantilla_slots.status = ''closed''.';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_block_delete_plantilla_with_applications ON public.plantilla_slots;
CREATE TRIGGER trg_block_delete_plantilla_with_applications
  BEFORE DELETE ON public.plantilla_slots
  FOR EACH ROW EXECUTE FUNCTION public.block_delete_of_plantilla_with_applications();

-- ── 5. Applicants per plantilla ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.plantilla_slot_applicant_counts AS
SELECT ps.id AS plantilla_slot_id,
       ps.job_posting_id,
       ps.label,
       COALESCE(counts.applicant_count, 0) AS applicant_count
  FROM public.plantilla_slots ps
  LEFT JOIN (
    SELECT slot_id, count(DISTINCT applicant_id) AS applicant_count
      FROM (
        SELECT aps.plantilla_slot_id AS slot_id, aps.applicant_id FROM public.application_plantilla_slots aps
        UNION
        SELECT a.plantilla_slot_id, a.id FROM public.applicants a WHERE a.plantilla_slot_id IS NOT NULL
      ) pairs
     GROUP BY slot_id
  ) counts ON counts.slot_id = ps.id;

GRANT SELECT ON public.plantilla_slot_applicant_counts TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
