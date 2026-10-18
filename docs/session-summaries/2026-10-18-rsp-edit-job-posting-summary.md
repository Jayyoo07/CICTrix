# RSP edits posted job vacancies from the Details page: summary

Plan: [2026-10-18-rsp-edit-job-posting.md](../plans/2026-10-18-rsp-edit-job-posting.md). Mockup: [2026-10-18-job-edit-entry.html](../mockups/2026-10-18-job-edit-entry.html) (B + X).

## Shipped vs. planned

All plan decisions (D1–D4) shipped in `bec84a8`:

- **Edit Posting button** (solid white on the hero, Pencil icon) on RSP's Details page, `/admin/rsp/job/:id`, to the right of the title. The applicant Details page does not show it.
- **Prefilled edit form:** the button goes to `/admin/rsp/jobs` with `state.editJobId`; `JobPostingsPage` opens the existing Edit Position modal with `openEditModal`, restored unchanged from before `631cca6`. The request is cleared from history so a refresh doesn't reopen the form.
- **Applicant warning (X):** in edit mode, when the posting has applicants, an orange note says how many applied and that their screened requirements may no longer match. Every field stays editable.
- **Return to Details:** Close, Cancel, the overlay and Save all go through `closeModal`, which steps back to Details when the form was opened from there. Create Position from the list behaves as before.

## Deviations

- None in scope. The Job posts rows still have no Edit button (D4).

## Checks

- `npx tsc --noEmit`: clean.
- `npm test`: 33 files, 321 tests pass, including 2 new tests in `JobDetailsPage.edit.test.tsx` (button opens the edit request for that posting; not shown to applicants).
- `npm run build`: passes.
- Local check at 1366×768 against the live database: the button sits right of the title (white, brand-blue text); clicking opened "Edit Position" prefilled with "Administrative Aide I (laborer I)"; Close returned to the same Details page. Nothing was saved.
- **Not checked on screen:** the applicant warning. The only posting in the database has 0 applicants, so the warning correctly did not show.
- Deploy: pushed `main` (`bec84a8`). About 60s later cic-trix.vercel.app (`index-BFYodVUA.js`) and cictrix-hr-demo.vercel.app (`index-BM24aTnk.js`) both served bundles containing Edit Posting.
