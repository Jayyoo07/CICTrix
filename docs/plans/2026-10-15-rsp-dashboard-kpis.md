---
title: RSP dashboard KPIs grouped by function
date: 2026-10-15
status: In Progress
summary: Replace the RSP dashboard's cards, quick actions, urgent items, funnel, recent activity and department list with three function sections (Recruitment, Exams & interviews, Succession planning) under a gradient header strip with period and department filters.
spec: docs/mockups/2026-10-15-rsp-dashboard-kpis.html (chosen 2026-10-15, v11)
---

## Goal

The RSP admin sees the KPIs that drive their work, grouped by function, in DESIGN_IDENTITY.md colors, without the overview cards and quick actions that repeated the sidebar.

## Approach

Build to `docs/mockups/2026-10-15-rsp-dashboard-kpis.html`. The dashboard section of `src/modules/admin/RSPDashboard.tsx` renders a new `RspDashboardOverview` component; its styles live in `src/styles/rsp-dashboard.css`, scoped under `.rspdash`. The AdminHeader and the rail stay as they are.

| # | Decision |
|---|---|
| D1 | **Header strip:** gradient strip with title, subtitle, Month / Quarter / Year and department filters. Period scopes applicants and held sessions; department scopes every section. |
| D2 | **Job postings:** open, closing in 7 days or less (`applicationDeadline`), vacant 90+ days (posted date), under review (status Reviewing, replaces "Unpublished"), vacancy age bars by department. |
| D3 | **Applicants:** count, awaiting screening with the oldest wait, per open vacancy, qualified %, and a funnel in the system's order: Received → Shortlisted → Qualified → Hired, each bar counting everyone who reached that stage or later. |
| D4 | **Exams & interviews:** sessions are built from applicant `exam_date`, `oral_exam_date` and `interview_date` (with times and venue), grouped by date, time, type and position. Month calendar with dots plus the session list. "Results not encoded" = applicants whose interview date has passed and who have no scored evaluation. **No-show rate is dropped:** attendance is not recorded. |
| D5 | **Succession:** key positions, positions without a named successor, incumbents leaving within 24 months (`incumbent_leaving_date`), talent pool (distinct named candidates), coverage table. Readiness tiers need the full readiness engine per candidate, so the dashboard shows successor coverage counts instead. |
| D6 | Equal-height cards per row; colors from DESIGN_IDENTITY.md tokens only. |

## Steps

1. Add `getSuccessionDashboardOverview()` to `src/lib/api/succession.ts`.
2. Carry `oral_exam_date`, `oral_exam_time`, `venue` on RSP applicant records and keep the set of applicants with a scored evaluation.
3. Build `RspDashboardOverview.tsx` and `rsp-dashboard.css`; mount it for the dashboard section.
4. `npm run build`, `npm test`, visual check at 1366×768.
5. Commit on `main`, push (deploys cic-trix, abyan-hris-iloilo, cictrix-hr-demo), confirm the live sites.

## Risks

- No posting currently has an application deadline, so "Closing in 7 days" reads 0 until deadlines are set.
- Sessions exist only for applicants who were scheduled through Pending Assignment; the calendar is empty otherwise.
