---
title: RSP edits posted job vacancies from the Details page
date: 2026-10-18
status: In Progress
summary: Add an Edit Posting button to the RSP view of a job's Details page that opens the existing Edit Position form prefilled, warns when people have already applied, and returns to Details after saving or cancelling.
spec: docs/mockups/2026-10-18-job-edit-entry.html (chosen 2026-10-18: B + X)
---

## Goal

RSP can correct a posted vacancy (title, plantillas, deadline, qualification standards) without deleting and re-posting it, while the Job posts list stays as compact as the Oct 7 density pass left it.

## Approach

| # | Decision |
|---|---|
| D1 | **Entry point (B):** the RSP view of `JobDetailsPage` (`/admin/rsp/job/:id`) gets an "Edit Posting" button (on-blue solid white, §9.1) in the hero. The applicant view never shows it. |
| D2 | The button navigates to `/admin/rsp/jobs` with `state.editJobId`. `JobPostingsPage` restores the prefill handler removed in `631cca6` and opens the existing Create/Edit modal for that job once the postings are loaded. |
| D3 | **Rule (X):** every field stays editable. When the posting has applicants, the modal shows a warning (§9.9) naming how many applied and that screened requirements may no longer match. |
| D4 | Saving or cancelling an edit that came from Details returns there (replace), so Back from Details still leads where it did. The Job posts row stays without an Edit button. |

## Steps

1. Restore `openEditModal`, open it from `state.editJobId`, return to Details on close or save.
2. Add the applicant warning to the modal in edit mode.
3. Add the Edit Posting button to the admin Details hero.
4. Tests, `npx tsc --noEmit`, `npm test`, `npm run build`, local check.
5. Commit on `main`, push (deploys cic-trix and cictrix-hr-demo), confirm live bundles.

## Risks

- Changing qualification standards after people applied is allowed by design (X); the warning is the only guard.
- The save path rewrites the posting through `saveJobPostings`, the same path the old Edit button used.
