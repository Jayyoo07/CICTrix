# L&D and PM portals on the side navigation rail — summary

Plan: `docs/plans/2026-10-06-lnd-pm-rail-nav.md`
Mockup: `docs/mockups/2026-10-06-portal-rails.html`

## Shipped vs. planned

All four planned steps shipped:

- `RailNav.tsx` / `rail-nav.css`: button items (`onSelect`), a scroll area that
  holds both groups and the highlight, a bottom fade while more items sit
  below, and the active item scrolled into view on short windows.
- L&D: Training Evaluation removed (menu entry, `MenuId` member, render branch,
  import); the white sidebar is replaced by the rail. 10 items.
- PM: the white sidebar is replaced by the rail. 7 items.
- `DESIGN_IDENTITY.md` §9.12: notes for the second rollout and the scroll
  behaviour.

## Deviations

- Added an optional `title` on `RailNavItem` so each item's former sublabel
  stays reachable as a tooltip, as the mockup specifies.
- `RailNavItem.icon` is now typed `LucideIcon`. The old prop-shape type
  rejected Lucide icons; RSP never hit it because its menu types icons as `any`.
- `button.rail-item` gets a reset in `rail-nav.css`: `globals.css`
  `button:hover` would otherwise paint a background and dark text on hover.
- `print:hidden` on PM's old sidebar became an `@media print` rule on the rail
  slot, so every portal's rail stays out of print.
- `LndTrainingEvaluation.tsx` is unlinked, not deleted; nothing else imports it.

## Checks run

- `npx tsc --noEmit`: pass.
- `npx vitest run`: 16 files, 202 tests, all pass.
- `npm run build`: pass (existing large-chunk warning only).
- `npm run lint`: could not run. The repo has no ESLint config, so it fails the
  same way on `main`.
- Dev server, browser pane: L&D rail shows the 10 items without Training
  Evaluation; clicking switches the section and marks the item
  `aria-current="page"`; hover gives the light pill with white text; at the
  pane's 744px height the rail scrolled with the fade showing. PM: 7 items,
  Settings in the bottom group, selection switches sections. RSP: items still
  links, navigation to Job Posts works, highlight aligned with the active item.
