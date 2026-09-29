-- ============================================================================
-- Rollback for 20260928_plantilla_labels_one_application_per_plantilla.sql
--
-- Restores the 20260922/20260923 behaviour. Applications, reference numbers,
-- plantilla rows and application_plantilla_slots links are all kept.
--
-- What is LOST on rollback:
--   * plantilla_slots.label        — admin-entered names revert to "Plantilla <ordinal>"
--                                    as computed by the app
--   * applicants.plantilla_slot_id — the per-application link column (the link
--                                    table still holds the same information)
--   * the one-application-per-plantilla guarantee and the delete guard
--
-- Plantillas created after the migration keep their PLT-… item_number keys;
-- they are valid (unique) values under the old schema too.
--
-- Deploy the previous frontend BEFORE running this: the new frontend degrades
-- gracefully without these columns, but the old one never used them.
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, pg_temp;

DROP VIEW IF EXISTS public.plantilla_slot_applicant_counts;

DROP TRIGGER IF EXISTS trg_block_delete_plantilla_with_applications ON public.plantilla_slots;
DROP FUNCTION IF EXISTS public.block_delete_of_plantilla_with_applications();

DROP TRIGGER IF EXISTS trg_link_application_to_its_plantilla ON public.applicants;
DROP FUNCTION IF EXISTS public.link_application_to_its_plantilla();

DROP INDEX IF EXISTS public.uq_applicants_one_per_plantilla;
DROP INDEX IF EXISTS public.idx_applicants_plantilla_slot;
ALTER TABLE public.applicants DROP CONSTRAINT IF EXISTS fk_applicants_plantilla_slot;
ALTER TABLE public.applicants DROP COLUMN IF EXISTS plantilla_slot_id;

ALTER TABLE public.plantilla_slots ALTER COLUMN item_number DROP DEFAULT;
COMMENT ON COLUMN public.plantilla_slots.item_number IS NULL;

DROP INDEX IF EXISTS public.uq_plantilla_slots_posting_label;
ALTER TABLE public.plantilla_slots DROP CONSTRAINT IF EXISTS chk_plantilla_slots_label_not_blank;
ALTER TABLE public.plantilla_slots DROP COLUMN IF EXISTS label;

NOTIFY pgrst, 'reload schema';

COMMIT;
