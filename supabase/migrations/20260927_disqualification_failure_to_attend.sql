-- ─────────────────────────────────────────────────────────────────────────────
-- Record which scheduled activity a no-show applicant missed
-- ─────────────────────────────────────────────────────────────────────────────
--
-- RSP specification §8: an applicant who does not appear for their scheduled
-- interview or examination can be disqualified with the reason "Failure to
-- Attend Scheduled Interview/Examination", and the system records:
--
--   * date of the scheduled activity   -> missed_activity_date / _time
--   * type of activity                 -> missed_activity_type
--   * applicant status                 -> applicants.status (existing)
--   * reason for disqualification      -> disqualification_reason_category (existing)
--   * date the status was updated      -> disqualified_at (existing)
--   * admin who updated the status     -> disqualified_by (existing)
--
-- Only the first two are new. The rest were already captured when the structured
-- disqualification fields were added.
--
-- The activity is copied onto the applicant at the moment of disqualification
-- rather than read back from exam_date / interview_date when it is displayed.
-- Those columns are editable and can be cleared, and an audit field that
-- changes after the decision was taken does not record anything — it has to
-- still say what it said when the admin pressed the button.

alter table public.applicants
  -- 'interview' | 'written_exam' | 'oral_exam'. Text rather than an enum so a
  -- new kind of assessment does not need a type migration before it can be
  -- recorded; the application owns the vocabulary.
  add column if not exists missed_activity_type text,
  add column if not exists missed_activity_date date,
  add column if not exists missed_activity_time time;

comment on column public.applicants.missed_activity_type is
  'Which scheduled activity the applicant failed to attend, frozen at disqualification time. Set only when disqualification_reason_category = ''failure_to_attend''.';

-- Finding every no-show for a period is a reporting question RSP will ask, and
-- the column is null for all but a few rows, so the index stays small.
create index if not exists applicants_missed_activity_date_idx
  on public.applicants (missed_activity_date)
  where missed_activity_date is not null;
