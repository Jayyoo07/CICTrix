---
title: Looping ring animation in the landing hero background
date: 2026-10-15
status: Done
summary: Animate the public landing hero background with slowly drifting rings and a soft centre pulse, static under reduced motion.
spec: Option A in docs/mockups/2026-10-15-landing-hero-loop.html (chosen 2026-10-15)
---

## Goal

The landing hero (`src/components/LandingPage.tsx`) gets a calm, endlessly looping background: the two existing outline rings drift slowly, a third smaller ring is added, and three ripples spread from the centre on a staggered 9s cycle. Text and CTAs are unchanged.

## Approach

- New stylesheet `src/styles/landing-hero.css`, imported by `LandingPage.tsx`, holding the keyframes (`driftA`, `driftB`, `pulse`) and classes (`.landing-hero-ring`, `.landing-hero-pulse`). Tailwind can't express these keyframes without editing the Tailwind config, which is wider than this change.
- Ring and pulse colors are white / `--color-primary-200` at low alpha, matching the current rings. Cycle lengths (22s, 28s, 34s, 9s) are named as CSS custom properties at the top of the file.
- Decorative layer is `aria-hidden="true"` and `pointer-events: none`, behind the copy.
- `@media (prefers-reduced-motion: reduce)` turns all animations off, leaving today's static rings.
- Only `transform` and `opacity` animate, so it stays on the compositor and doesn't repaint the text.

## Steps

1. Branch `feat/landing-hero-loop` from `main`.
2. Add `landing-hero.css` and swap the two ring `<div>`s in the hero for the animated layer (3 rings + 3 pulses).
3. Run `npx tsc --noEmit`, `npm run lint`, `npm test`.
4. Check in the browser at mobile, tablet and desktop widths, and with reduced motion emulated.
5. Commit `feat(landing): animate hero background with drifting rings and pulse`.

## Risks

- Ripples scale to ~1.9× and could show past the hero edge on very tall mobile heroes; the section already has `overflow: hidden`.
- The hero gradient in code (`#050D65`, hard-coded) differs from the token `#040E6B`. Out of scope; not touched.

## Checks to run

- `npx tsc --noEmit`, `npm run lint`, `npm test` pass.
- Visual check: loop is seamless, text contrast unchanged, reduced motion is static.
