---
title: Batch interview scheduling grouped by department
date: 2026-10-11
status: Done
summary: Replace the flat Pending Assignment table with a department → position → applicant checkbox tree and a "Schedule Applicants" modal that sets the oral interview date, session, rater and venue.
spec: Pasted task "Hierarchical Batch Interview Scheduling for Qualified Applicants" plus a classmate's Hiligaynon notes (2026-10-11 session)
---

## Goal

On Qualified Applicants → Pending Assignment, RSP staff pick applicants from a tree grouped by department and position, then schedule the whole selection at once from a modal.

## Approach

Edit `PendingAssignmentList.tsx` in place; the Scheduled and Rater Management sub-tabs stay as they are. Decisions made in the session:

- **D1, interview only.** The modal sets the oral interview date and time, the rater and an optional venue. The written exam is no longer part of batch scheduling, so "scheduled" now means interview date + time + rater. The Edit Schedule modal still lets staff set exam fields per applicant.
- **D2, one rater per batch.** It is stored in the existing `applicants.assigned_interviewer_email`, so there is no migration and the interviewer portal's access check is unchanged.
- **D3, branch** `feat/batch-interview-scheduling`.
- **No backend endpoint exists**, so the spec's JSON payload becomes a service function in `src/lib/applicantSchedule.ts`. The interview is stored in `interview_date` / `interview_time`, which the Scheduled tab and Applicant Score already read. The spec's `interview_type: "ORAL"` has no column and is implied by those fields.
- **Status:** applicants whose status can legally move to `Interview/Exam Scheduled` (only Shortlisted, per `canTransition`) are advanced. Everyone else keeps their status and just gets the schedule.

## Steps

1. Pure helpers in `src/lib/scheduleSelection.ts`, with Vitest tests: group applicants by department → position, derive a position's checkbox state, toggle a position or an applicant, split IDs into those that advance status and those that don't, and validate past dates.
2. `scheduleApplicantsBatch` in `applicantSchedule.ts`: at most two batched `update … in('id', …)` calls, checked against the returned rows so a silent RLS no-op is reported. No localStorage mirror.
3. Relax `isApplicantFullyAssigned` to interview date + time + rater. Keep applicants whose status is `Interview/Exam Scheduled` in the qualified filter so they don't vanish after scheduling.
4. Tree UI plus a selection bar ("N applicants selected" + Schedule Applicants, disabled at 0).
5. Modal (§9.10, 640px): selection summary, date (no past dates), session (Morning / Afternoon / Custom), rater select, venue/link. Cancel keeps the selection. Confirm saves, shows a success alert, clears the selection and refreshes.
6. Keep the page mounted on refresh (no full-page loading swap) so the success alert survives the reload.

## Risks

- Relaxing the "scheduled" rule moves any applicant that already has an interview date, time and rater but no exam date from Pending to Scheduled.
- The existing `isQualified` substring match also matches "Not Qualified". This is pre-existing behaviour and out of scope; flagged, not fixed.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- DESIGN_IDENTITY §16 checklist on the changed view.
