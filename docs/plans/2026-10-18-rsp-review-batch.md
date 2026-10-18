---
title: RSP review batch
date: 2026-10-18
status: Done
summary: Saved document review history, validate confirm/undo with schedule lock, second Edit button, For Hiring position level, job post list cleanup, and live updates on RSP pages.
---

## Goal

Apply the RSP review requests and deploy from `main` (user instruction: work on `main`, no new branch). R6 (Roster Management tab) and R8 (CSV export) are deferred.

## Approach

| # | Change | Where |
|---|---|---|
| R1 | "N left to review" on job posts | Already shipped in `ef7b0c5` |
| R2 | Edit button on Personal Information and Qualifications (modal from `848867f`) | `ApplicantDetailsPage.tsx` |
| R3 | Document history saved to `applicant_document_events`, actor = signed-in RSP email; per-slot list newest first | `src/lib/api/applicantDocumentEvents.ts`, `ApplicantDetailsPage.tsx` |
| R4 | Confirm popover beside Validate Documents; Undo until an exam/interview is scheduled (RPC `undo_document_validation` enforces it); each validate/undo logged with time | same |
| R5 | For Hiring: Department → Position → Applicant | `ForHiringPage.tsx` |
| R7 | Remove "Show all applicants in database" checkbox and amber fallback; reword empty state | `JobPostingsPage.tsx` |
| R9 | `useRealtimeRefresh` on RSP dashboard, Job Posts, Qualified Applicants | three pages |

Legacy `doc_validated` / `resubmission_request` marker rows in `applicant_attachments` are kept because the applicant portal reads them; the events table records history alongside them.

## Steps

1. Migration `20261018_applicant_document_events.sql` (table, RLS, undo RPC, `job_postings` + events table in Realtime).
2. Service + tests, detail page wiring.
3. For Hiring position level.
4. Job post cleanup + realtime.
5. `git push origin main` (deploys cic-trix, abyan-hris-iloilo, cictrix-hr-demo).

## Risks

- Until the migration is applied, history writes and Undo fail (logged, non-blocking); validate still works.
- The validation self-heal effect could re-create markers after an undo; it now skips approvals older than the last saved undo and waits for events to load.

## Checks to run

`npx tsc --noEmit`, `npm test`, `npm run build`. `npm run lint` has no ESLint config on `main`.
