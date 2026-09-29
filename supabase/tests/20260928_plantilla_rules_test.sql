-- ============================================================================
-- Tests for 20260928_plantilla_labels_one_application_per_plantilla.sql
-- (plus the 20260923 reference-number generator it relies on).
--
-- Run in the Supabase SQL editor AFTER the migration. Everything happens
-- inside one transaction that ends in ROLLBACK, so it leaves NO data behind —
-- safe on production. Success prints "ALL PLANTILLA RULE TESTS PASSED";
-- any failure aborts with "TEST FAILED: …".
-- ============================================================================

BEGIN;

SET LOCAL search_path = public, pg_temp;

DO $$
DECLARE
  posting_id   uuid;
  slot_a       uuid := gen_random_uuid();
  slot_b       uuid := gen_random_uuid();
  app1         uuid;
  app2         uuid;
  app3         uuid;
  ref1         text;
  ref2         text;
  raised       boolean;
  link_count   integer;
  new_key      text;
  email        text := 'plantilla.test.' || replace(gen_random_uuid()::text, '-', '') || '@example.com';
BEGIN
  -- Borrow any existing posting; everything is rolled back at the end.
  SELECT id INTO posting_id FROM public.job_postings LIMIT 1;
  IF posting_id IS NULL THEN RAISE EXCEPTION 'TEST FAILED: need at least one job posting to run against'; END IF;

  -- ── Plantillas are labels, not reference numbers ─────────────────────────
  INSERT INTO public.plantilla_slots (id, job_posting_id, slot_number, label)
  VALUES (slot_a, posting_id, 9001, 'Test Plantilla 20'),
         (slot_b, posting_id, 9002, 'Test Plantilla 100');

  SELECT item_number INTO new_key FROM public.plantilla_slots WHERE id = slot_a;
  IF new_key NOT LIKE 'PLT-%' THEN
    RAISE EXCEPTION 'TEST FAILED: new plantilla should get an internal PLT- key, got %', new_key;
  END IF;

  -- Same label twice in one posting (ignoring case/space) is rejected.
  raised := false;
  BEGIN
    INSERT INTO public.plantilla_slots (job_posting_id, slot_number, label)
    VALUES (posting_id, 9003, '  test plantilla 20 ');
  EXCEPTION WHEN unique_violation THEN raised := true;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'TEST FAILED: duplicate label within a posting was accepted'; END IF;

  -- ── Reference number: generated at submit, unique, not settable ──────────
  INSERT INTO public.applicants (first_name, last_name, email, contact_number, address, position, office,
                                 item_number, application_type, status, reference_no, plantilla_slot_id)
  VALUES ('Test', 'One', email, '09120000000', 'Test address', 'Test Position', 'Test Office',
          new_key, 'job', 'New Application', 'CLIENT-SUPPLIED', slot_a)
  RETURNING id, reference_no INTO app1, ref1;

  IF ref1 IS NULL OR ref1 !~ '^ABYAN-[0-9]{3}-[0-9]{3}(-[0-9]{3})?$' THEN
    RAISE EXCEPTION 'TEST FAILED: reference number not generated in ABYAN-000-000 format, got %', ref1;
  END IF;
  IF ref1 = 'CLIENT-SUPPLIED' THEN
    RAISE EXCEPTION 'TEST FAILED: a client-supplied reference number was accepted';
  END IF;

  -- Link row created by trigger.
  SELECT count(*) INTO link_count FROM public.application_plantilla_slots
   WHERE applicant_id = app1 AND plantilla_slot_id = slot_a;
  IF link_count <> 1 THEN RAISE EXCEPTION 'TEST FAILED: link row not created for the application'; END IF;

  -- ── Same applicant, DIFFERENT plantilla: allowed ─────────────────────────
  INSERT INTO public.applicants (first_name, last_name, email, contact_number, address, position, office,
                                 item_number, application_type, status, plantilla_slot_id)
  VALUES ('Test', 'One', upper(email), '09120000000', 'Test address', 'Test Position', 'Test Office',
          new_key, 'job', 'New Application', slot_b)
  RETURNING id, reference_no INTO app2, ref2;

  IF ref2 = ref1 THEN RAISE EXCEPTION 'TEST FAILED: two applications received the same reference number'; END IF;

  -- ── Same applicant, SAME plantilla: rejected (email case/space ignored) ──
  raised := false;
  BEGIN
    INSERT INTO public.applicants (first_name, last_name, email, contact_number, address, position, office,
                                   item_number, application_type, status, plantilla_slot_id)
    VALUES ('Test', 'One', '  ' || upper(email) || ' ', '09120000000', 'Test address', 'Test Position', 'Test Office',
            new_key, 'job', 'New Application', slot_a);
  EXCEPTION WHEN unique_violation THEN raised := true;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'TEST FAILED: second application to the same plantilla was accepted'; END IF;

  -- ── Different applicant, same plantilla: allowed (many per plantilla) ────
  INSERT INTO public.applicants (first_name, last_name, email, contact_number, address, position, office,
                                 item_number, application_type, status, plantilla_slot_id)
  VALUES ('Test', 'Two', 'other.' || email, '09120000000', 'Test address', 'Test Position', 'Test Office',
          new_key, 'job', 'New Application', slot_a)
  RETURNING id INTO app3;

  -- ── Reference number never changes once issued ───────────────────────────
  UPDATE public.applicants SET reference_no = 'ABYAN-000-000' WHERE id = app1;
  IF (SELECT reference_no FROM public.applicants WHERE id = app1) <> ref1 THEN
    RAISE EXCEPTION 'TEST FAILED: reference number was changed by an UPDATE';
  END IF;

  -- ── Applicant counts per plantilla ───────────────────────────────────────
  IF (SELECT applicant_count FROM public.plantilla_slot_applicant_counts WHERE plantilla_slot_id = slot_a) <> 2 THEN
    RAISE EXCEPTION 'TEST FAILED: plantilla_slot_applicant_counts should report 2 for slot A';
  END IF;

  -- ── A plantilla with applications cannot be deleted on its own ───────────
  raised := false;
  BEGIN
    DELETE FROM public.plantilla_slots WHERE id = slot_a;
  EXCEPTION WHEN raise_exception THEN raised := true;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'TEST FAILED: deleting a plantilla with applications was allowed'; END IF;

  -- …but closing it is fine.
  UPDATE public.plantilla_slots SET status = 'closed' WHERE id = slot_a;

  RAISE NOTICE 'ALL PLANTILLA RULE TESTS PASSED';
END $$;

ROLLBACK;
