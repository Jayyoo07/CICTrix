# RSP review batch — summary

Plan: `docs/plans/2026-10-18-rsp-review-batch.md`

## Shipped

- R2: second Edit button on the Qualifications card (opens the existing edit modal).
- R3: `applicant_document_events` table and service; each document slot shows its history newest first (current version, re-uploads, resubmission requests with reason/time/RSP email, original upload). Pre-existing requests show "RSP (user not recorded)".
- R4: "Are you sure?" popover anchored to Validate Documents; Undo button next to the Validated chip, locked once `exam_date`, `oral_exam_date` or `interview_date` is set (UI and RPC); validation log lists every validate/undo with time and email.
- R5: For Hiring position level.
- R7: show-all checkbox and amber fallback removed; empty state reworded.
- R9: realtime on RSP dashboard, Job Posts, Qualified Applicants.

## Deviations

- R1 was already on `main` (`ef7b0c5`); nothing changed.
- Lucide/ui-preview mockups were skipped; layouts follow the existing folder-table and card patterns.
- R6 and R8 deferred by the user.

## Checks run

- `npx tsc --noEmit`: clean.
- `npm test`: 32 files, 319 tests passed (3 new for the history builder).
- `npm run build`: passed.
- `npm run lint`: not run, no ESLint config on `main`.

## Pending

Apply `supabase/migrations/20261018_applicant_document_events.sql` in the Supabase SQL editor for the main HRIS and HR Demo databases.
