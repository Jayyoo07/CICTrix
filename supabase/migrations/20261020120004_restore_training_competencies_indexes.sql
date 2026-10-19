-- Restores the three indexes from 20260816_training_competencies.sql that are
-- missing on production. The tables, constraints, grants and seeded tags
-- already exist. Idempotent.
-- Plan: docs/plans/2026-10-20-migration-prod-gaps.md

CREATE INDEX IF NOT EXISTS idx_training_competency_tags_name_key
  ON training_competency_tags (name_key);

CREATE INDEX IF NOT EXISTS idx_training_competencies_session
  ON training_competencies (session_id);
CREATE INDEX IF NOT EXISTS idx_training_competencies_competency
  ON training_competencies (competency_id);
