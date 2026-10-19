-- Restores the parts of 20260703_promotional_applications.sql that never ran
-- on production: the document checklist and decision tables.
-- promotional_applications itself already exists. Idempotent.
-- Plan: docs/plans/2026-10-20-migration-prod-gaps.md

-- Per-application document checklist rows (one row per required doc type).
CREATE TABLE IF NOT EXISTS promotional_application_docs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES promotional_applications(id) ON DELETE CASCADE,
  document_type   text NOT NULL,
  file_name       text,
  status          text NOT NULL DEFAULT 'Pending',
  notes           text,
  submitted_at    timestamptz,
  submitted_by    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Final decision record written when PM sets stage to Approved or Denied.
CREATE TABLE IF NOT EXISTS promotional_decisions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   uuid NOT NULL REFERENCES promotional_applications(id) ON DELETE CASCADE,
  employee_name    text NOT NULL,
  target_position  text NOT NULL,
  decision         text NOT NULL CHECK (decision IN ('Approved', 'Denied')),
  decided_by       text NOT NULL,
  notes            text,
  decided_at       timestamptz NOT NULL DEFAULT now()
);
