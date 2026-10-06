---
title: L&D and PM portals on the side navigation rail
date: 2026-10-06
status: In Progress
summary: L&D Admin and PM Admin swap their white sidebars for the §9.12 rail RSP already ships, the rail scrolls when items don't fit, and L&D drops the Training Evaluation page.
spec: DESIGN_IDENTITY.md §9.12; mockup docs/mockups/2026-10-06-portal-rails.html
---

## Goal

All three admin portals (RSP, L&D, PM) share one side navigation: the
collapsible icon rail from §9.12. L&D loses its Training Evaluation page.

## Approach

Reuse `RailNav` rather than copying its markup into two dashboards. L&D and PM
switch sections with component state, not routes, so a rail item gains an
optional `onSelect`: with it the item renders as a button, without it as a
`Link` (RSP, unchanged).

L&D has 10 items after the removal. That fits a 768px-tall laptop, but not a
shorter window, and today `.rail` has `overflow: hidden`, so the bottom items
would be cut off. The rail gets a scroll wrapper that holds both groups and the
highlight, so the highlight scrolls with its item and can still slide to
Settings. A fade at the bottom signals more items below. Chosen over tighter
44px items, which would fork the §9.12 sizes per portal.

The `LndTrainingEvaluation` component is unlinked from the portal, not deleted.

## Steps

1. `RailNav.tsx` / `rail-nav.css`: optional `onSelect` (button items), scroll
   wrapper, highlight measured inside the wrapper, bottom fade.
2. `LNDDashboard.tsx`: remove Training Evaluation (menu entry, `MenuId`
   member, render branch, import); replace `LndSidebar` with `RailNav`.
3. `PMDashboard.tsx`: replace the inline sidebar with `RailNav`.
4. `DESIGN_IDENTITY.md` §9.12 implementation notes: L&D and PM rollout, and
   the scroll behaviour.

## Risks

- `RailNav` is shared with RSP. RSP's 9 items fit at normal heights, so the
  scroll wrapper changes nothing visible there; on short windows it now scrolls
  instead of clipping Settings.
- The sessionStorage highlight position is per browser tab; each tab holds one
  admin role, so portals don't share a stale position.
- PM's sidebar was `print:hidden`; the rail keeps that.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npx vitest run`
- `npm run build`
- Dev server: hover, select and keyboard through the RSP, L&D and PM rails.
