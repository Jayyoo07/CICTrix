-- ─────────────────────────────────────────────────────────────────────────────
-- Make phase_schedules changes actually reach the employee portal
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Reported fault: PM presses "Open phase" in IPCR Management, the admin screen
-- says OPEN, and the employee portal keeps saying CLOSED until the page is
-- reloaded — or until the phase is closed and opened a second time.
--
-- The employee page subscribes to phase_schedules over Realtime. Two things on
-- the database side stop that event arriving:
--
--   1. The table has to be in the supabase_realtime publication. It is added by
--      20260729_enable_realtime_ipcr.sql, but that migration has not run on
--      every environment, and a database restored from a backup does not carry
--      publication membership. Re-adding it is harmless where it is present.
--
--   2. REPLICA IDENTITY. Opening a phase is an UPDATE, and the default replica
--      identity puts only the primary key in the WAL for the old row. Realtime
--      needs the full old row to evaluate subscriptions against it, so the
--      event it emits for an update can be dropped or arrive without the
--      columns a client filters on. FULL makes an update carry the whole row.
--
-- The table is two rows that change a handful of times per cycle, so the write
-- cost of FULL is irrelevant here.
--
-- This is the fast path only. The portal also polls the gate, because an event
-- arriving is not something a permission check should depend on.

do $$
begin
  alter publication supabase_realtime add table phase_schedules;
exception
  when duplicate_object then null;
  when undefined_object then null;  -- publication absent (self-hosted without Realtime)
end $$;

alter table phase_schedules replica identity full;

-- The per-employee half of the Phase 2 gate, for the same reason: opening the
-- rating phase updates phase2_status on each sheet, and the employee page
-- watches that table to unlock the rating form.
do $$
begin
  alter publication supabase_realtime add table ipcr_submissions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table ipcr_submissions replica identity full;
