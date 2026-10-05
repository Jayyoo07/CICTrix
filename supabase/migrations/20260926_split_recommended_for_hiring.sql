-- ─────────────────────────────────────────────────────────────────────────────
-- Resolve 'Recommended for Hiring' into Shortlisted or Qualified
-- ─────────────────────────────────────────────────────────────────────────────
--
-- One stored string was written by two different buttons meaning two different
-- things:
--
--   * RSP document screening ("Qualify" on the applicant detail page). Its gate
--     checks only that every required document is uploaded, reviewed and
--     approved — nothing about an interview. That is the screening decision:
--     Shortlisted, per the RSP specification, "passed the initial screening,
--     waiting for interview/examination schedule".
--
--   * The post-ranking action ("Mark for Hiring") and the interviewer portal's
--     Qualify, both reached only after the interview and exam are scored. That
--     is the complete selection process: Qualified.
--
-- The application code now writes the two apart. This resolves the rows already
-- stored, which cannot say on their own which stage they reached.
--
-- The evidence is the evaluations table. An applicant with an evaluation row
-- was interviewed and scored; one without only ever had documents checked.
-- That is a record of what happened, not an inference from the status string.
--
-- Expected effect on the live data: 13 applicants carry 'Recommended for
-- Hiring'. Those with an evaluation become Qualified; the rest become
-- Shortlisted. The RSP dashboard's "Qualified" count falls accordingly — it was
-- counting document screening as a completed selection process.
--
-- Idempotent: it only ever reads and rewrites rows whose status is still
-- 'Recommended for Hiring', so a second run changes nothing.

begin;

-- Interviewed and scored → the selection process is complete.
update public.applicants a
   set status = 'Qualified',
       updated_at = now()
 where lower(trim(a.status)) = 'recommended for hiring'
   and exists (select 1 from public.evaluations e where e.applicant_id = a.id);

-- No evaluation on record → documents were validated, nothing more.
--
-- Shortlisted rather than Qualified deliberately. This is a status the
-- applicant reads: telling someone they completed a selection process they
-- never sat is the worse of the two errors, and a shortlisted applicant who was
-- in fact interviewed is corrected by the next action taken on them.
update public.applicants a
   set status = 'Shortlisted',
       updated_at = now()
 where lower(trim(a.status)) = 'recommended for hiring';

commit;

-- What the statuses look like afterwards. 'Recommended for Hiring' should be
-- gone; if any row remains, it was written between the two statements above.
select status, count(*) as applicants
  from public.applicants
 group by status
 order by applicants desc;
