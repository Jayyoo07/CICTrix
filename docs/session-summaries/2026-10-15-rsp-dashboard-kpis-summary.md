# RSP dashboard KPIs grouped by function: summary

Plan: [2026-10-15-rsp-dashboard-kpis.md](../plans/2026-10-15-rsp-dashboard-kpis.md). Mockup: [2026-10-15-rsp-dashboard-kpis.html](../mockups/2026-10-15-rsp-dashboard-kpis.html) (v11).

## Shipped vs. planned

All plan decisions (D1–D6) shipped in `5f5a7d5`:

- **Header strip:** gradient strip with the title, Month / Quarter / Year (default Quarter) and a department filter. Period scopes applicants and held sessions; department scopes every section.
- **Job postings:** Open, Closing ≤ 7d, Vacant 90d+, Under review, and vacancy-age bars for the top five departments.
- **Applicants:** count for the period, unscreened with the oldest wait, per open vacancy, qualified rate (of screened), and a cumulative funnel Received → Shortlisted → Qualified → Hired.
- **Exams & interviews:** sessions are grouped from applicant written exam, oral exam and interview schedules. The month calendar has exam and interview dots, a Today button and month navigation; clicking a day filters the session list to that day. Held interviews without a scored evaluation show "Scores missing" and feed the "Interview scores not encoded" count.
- **Succession:** key positions, no successor, incumbents leaving within 24 months, talent pool, a covered / partial / none bar, and a coverage table sorted by risk.
- Old overview cards, Quick Actions, Urgent Items, the old funnel, Recent Activity and Positions by Department are removed, along with their now-unused memos.

New code: `src/modules/admin/RspDashboardOverview.tsx`, `src/styles/rsp-dashboard.css`, `getSuccessionDashboardOverview()` in `src/lib/api/succession.ts`. `RSPDashboard.tsx` now carries `oral_exam_date`, `oral_exam_time`, `venue` and the set of applicants with a scored evaluation.

## Deviations

- **No-show rate dropped** (no attendance data), **"Unpublished" shown as "Under review"**, and the funnel uses the system's stage order. All three were agreed before the build.
- **Readiness tiers not shown.** Succession shows successor coverage (covered / partial / none) instead, because tiers need the per-candidate readiness engine.
- **The fourth Exams stat is "Upcoming (30 days)"**, replacing the dropped no-show rate.
- **The hero title is a `role="heading"` div**, because `admin.css` forces `.admin-content h1` to brand blue with `!important`. The department select gets an inline white color for the same reason (`rsp-design.css`).

## Checks

- `npx tsc --noEmit`: clean.
- `npm test`: 30 files, 309 tests pass, including 4 new tests in `RspDashboardOverview.test.tsx` (posting KPIs, cumulative funnel, session grouping and missing scores, succession coverage and risk).
- `npm run build`: passes.
- Local check at 1366×768: no horizontal scroll; card rows are equal height (268 / 265 / 243px). The local database returned no job postings or applicants, so live numbers for those sections were verified through the tests, not on screen.
- Deploy: pushed `main` (`5f5a7d5`). About 90s later both cic-trix.vercel.app (`index-Dg3WsGVT.js`) and cictrix-hr-demo.vercel.app (`index-CjhZfLIA.js`) served bundles containing the new dashboard.
