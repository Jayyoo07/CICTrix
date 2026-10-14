# Landing hero loop animation: summary

Plan: `docs/plans/2026-10-15-landing-hero-loop.md`. Spec: option A in `docs/mockups/2026-10-15-landing-hero-loop.html`.

## Shipped vs. planned

Shipped as planned. `src/styles/landing-hero.css` holds the drift and pulse keyframes, with cycle lengths as custom properties (22s, 28s, 34s, 9s). In `LandingPage.tsx` the two static rings became an `aria-hidden` layer with three drifting rings and three ripples staggered at 0s, 3s and 6s. Under `prefers-reduced-motion: reduce` the rings stop and the ripples are hidden, which leaves the old static look.

## Deviations

None.

## Checks run

- `npx tsc --noEmit`: passed.
- `npm test`: 28 files, 300 tests passed.
- `npm run lint`: could not run. The repo has no ESLint config file, so ESLint exits before it checks anything. This was already the case before this change.
- Browser, desktop at 800px and mobile at 375px: rings drift and ripples cycle behind the copy, and the page has no horizontal scroll. The reduced-motion rule is loaded, but the pane can't emulate reduced motion, so the static state was not checked visually.
