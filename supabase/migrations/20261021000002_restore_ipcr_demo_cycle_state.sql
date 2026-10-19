-- Restores 20260726000001_ipcr_demo_cycle_state.sql, which never ran on
-- production: the demo_settings phase toggles, one schedule per employee, and
-- cold_storage_vault. Idempotent.
--
-- Deliberately left out: the source file's seeded PM Admin account
-- (pm@lgu.gov). It carries a hardcoded password and has no place in production.
--
-- Plan: docs/plans/2026-10-20-migration-prod-gaps.md

BEGIN;

-- ── Global phase toggles on the single demo_settings row ────────────────────
ALTER TABLE demo_settings
  ADD COLUMN IF NOT EXISTS phase1_status text NOT NULL DEFAULT 'Closed'
    CHECK (phase1_status IN ('Closed', 'Open')),
  ADD COLUMN IF NOT EXISTS phase2_status text NOT NULL DEFAULT 'Closed'
    CHECK (phase2_status IN ('Closed', 'Open'));

-- ── One schedule row per employee, so the app can upsert on employee_id ─────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ipcr_schedules_employee_unique'
  ) THEN
    ALTER TABLE ipcr_schedules
      ADD CONSTRAINT ipcr_schedules_employee_unique UNIQUE (employee_id);
  END IF;
END $$;

-- ── cold_storage_vault — PM's locked target vault ───────────────────────────
CREATE TABLE IF NOT EXISTS cold_storage_vault (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  schedule_id         uuid REFERENCES ipcr_schedules(id) ON DELETE SET NULL,
  locked_at           timestamptz NOT NULL DEFAULT now(),
  locked_by           uuid REFERENCES accounts(id) ON DELETE SET NULL,
  phase2_eligible_date date,
  UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS cold_storage_vault_employee_idx ON cold_storage_vault (employee_id);

-- ── Access — same app-layer posture as the other demo tables ────────────────
ALTER TABLE cold_storage_vault DISABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON cold_storage_vault TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
