---
title: Job details page as one-line lists with a dedicated plantilla picker
date: 2026-10-15
status: Done
summary: Show the posting summary, qualification standards and required documents as one-line label/value lists in a single card, remove "Where do I stand?" and the equal-opportunity notice from the page, and make the plantilla chooser scale to many items.
spec: docs/mockups/2026-10-15-job-details-list-layout.html (chosen 2026-10-15)
---

## Goal

Applicants see the whole posting and the Continue button on one laptop screen (1366×768) without the page stretching into several tall cards.

## Approach

Build to `docs/mockups/2026-10-15-job-details-list-layout.html`. All changes are in `src/components/JobDetailsPage.tsx` and `src/styles/applicant-flow.css`.

| # | Decision |
|---|---|
| D1 | **Posting summary as rows:** place of assignment, salary grade, monthly salary, posted, application closes. One line each, label left, value right. Monthly salary is shown only when the posting has one. |
| D2 | **Qualification standards as rows** in the same card (education, experience, training, eligibility, competency). The bordered tiles go. |
| D3 | **Required documents** move into the summary card as a numbered one-line list, followed by the instructions. They keep their own `<section>` and heading. |
| D4 | **Removed from this page:** the "Where do I stand?" panel and the equal-opportunity notice. `QualificationGapPanel` stays in the codebase, only unmounted here. |
| D5 | **Chooser:** compact one-line items (name, SG, status). The list scrolls inside the card when there are many items, so the Continue button stays visible. Selection logic is unchanged. |

Responsibilities, position summary and required skills stay when a posting has them.

## Steps

1. Replace the summary details grid and requirement tiles with a row list (D1, D2).
2. Move required documents into the summary card and drop the gap panel and EEO notice (D3, D4).
3. Compact the chooser items and cap the list height (D5).
4. `npx tsc --noEmit`, `npm test`, visual check at 1366×768.
5. Commit on `main`, push (deploys cic-trix, abyan-hris-iloilo, cictrix-hr-demo).

## Risks

- The admin RSP view uses the same page, so it gets the same list layout.
- Removing the EEO notice drops that text from the public posting. Restore it if HR requires it on every posting.
