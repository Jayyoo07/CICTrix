# Job details page as one-line lists: summary

Plan: [2026-10-15-job-details-list-layout.md](../plans/2026-10-15-job-details-list-layout.md). Mockup: [2026-10-15-job-details-list-layout.html](../mockups/2026-10-15-job-details-list-layout.html).

## Shipped vs. planned

All five decisions shipped, in `src/components/JobDetailsPage.tsx` and `src/styles/applicant-flow.css`:

- **Posting summary** is a one-line label/value list: place of assignment, salary grade, monthly salary (when the posting has one), posted, application closes.
- **Qualification standards** use the same rows. The bordered tiles and their icons are gone.
- **Required documents** moved into the summary card as a numbered list followed by the instructions. They keep their own `<section>` and heading.
- **"Where do I stand?" and the equal-opportunity notice** are no longer rendered on this page. `QualificationGapPanel` stays in the codebase.
- **Plantilla chooser** items are one line (name, SG, status, with the monthly rate under the name). The list scrolls inside the card past 340px, so Continue stays visible on postings with many items.

The unused `.af-details`, `.af-detail` and `.af-req*` styles and the `allPostings` state (only the gap panel used it) were removed.

## Deviations

- **Not one screen on every posting.** The mockup fit 1366×768, but the live hero is taller (196px) and real postings add required skills and a position summary. On the posting checked, the page is 1115px tall at 1366×768. The chooser and Continue button sit at the top and stay visible, and only the left list scrolls.
- **Continue label unchanged.** The mockup read "Continue with 2 applications"; the button keeps "Continue to Application", which existing tests and the mobile action bar use.

## Checks run

- `npx tsc --noEmit`: clean.
- `npx vitest run src/components/JobDetailsPage.plantillas.test.tsx`: 6 tests pass.
- `npx vitest run`: 29 files and 305 tests pass.
- Visual check on the local dev server at 1366×768 on `/job-details/PLT-523D660B8D`. The rows, the documents list and the chooser render as designed, and the gap panel and notice are absent.
- **Not run:** the admin RSP view of this page, which needs a login.
