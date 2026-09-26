# DESIGN.md

Visual system for the CICTrix HRIS front end. Documented from the existing code on 2026-09-26: `tailwind.config.js`, `src/styles/globals.css`, and a usage count of the colors and classes in `src/`. Where the code disagrees with itself, the **Rule** lines name the value to use going forward.

## Brand

The brand is **Abyan blue**. It appears in the code as the Tailwind `abyan` color and as the `--accent-primary` CSS variable.

| Token | Hex | Tailwind | CSS var | Use |
|---|---|---|---|---|
| Abyan | `#363EE8` | `abyan` | `--accent-primary`, `--color-primary` | Primary buttons, active nav, links, focus borders, key numbers |
| Abyan dark | `#040E6B` | `abyan-dark` | `--color-primary-dark` | Headings on light surfaces, deep brand panels |
| Abyan light | `#C8D1FF` | `abyan-light` | none | Soft brand fills, chips, borders on brand surfaces |
| Abyan tint | `#EEF2FF` | `indigo-50` | none | Hover and selected row backgrounds, subtle brand wash |
| Abyan hover | `#2F35D0` | none | `--color-primary-hover` | Hover state of Abyan-filled controls |

Abyan is used about 380 times as a hex value and in 33 `abyan` class references, which makes it the one fixed anchor of the palette.

**Rule:** In new code, use `bg-abyan` / `text-abyan` / `bg-abyan-dark` instead of `bg-[#363EE8]`-style arbitrary values.
**Rule:** Abyan dark is `#040E6B`. The near-duplicate `#050D65` (about 70 uses, mostly `AboutPage.tsx` and the landing surfaces) should converge on it.
**Rule:** Hover on an Abyan fill is `#2F35D0`. The code currently scatters `#2E35D4`, `#2931C5`, `#2D34C4`, and `#2830C5` for this. Add `abyan.hover` to the Tailwind config if it keeps coming up.

## Neutrals

Neutrals use Tailwind **slate**. Slate is by far the most common family (`text-slate-500` alone appears about 650 times), and the dark theme is built on slate too.

| Role | Light | Class | Dark |
|---|---|---|---|
| Page background | `#FFFFFF` | `bg-white` | `#0B1220` |
| Sidebar / section background | `#F8FAFC` | `bg-slate-50` | `#0F172A` |
| Control / card surface | `#FFFFFF` | `bg-white` | `#1E293B` |
| Border, default | `#E2E8F0` | `border-slate-200` | `#334155` |
| Border, strong | `#CBD5E1` | `border-slate-300` | not defined |
| Text, primary | `#0F172A` | `text-slate-900` | `#F1F5F9` |
| Text, body | `#334155` | `text-slate-700` | `#CBD5E1` |
| Text, secondary | `#64748B` | `text-slate-500` | `#94A3B8` |
| Text, placeholder / disabled | `#94A3B8` | `text-slate-400` | not defined |

The light column shows what components use in practice (Tailwind classes). The dark column shows the `html[data-theme='dark']` variables. The legacy light variables in `globals.css` (`--text-primary: #212529` and similar) still exist, but most components bypass them.

**Rule:** Use slate, not `gray-*`. Gray still shows up in about 900 class uses and should give way to slate when files are touched for other reasons. Don't sweep-replace.
**Rule:** Don't add new Bootstrap-style greys (`#212529`, `#495057`, `#DEE2E6`). They exist only in the legacy `--text-*` / `--bg-*` variables in `globals.css`.

## Status and semantic colors

Status colors come from the CSS variables in `globals.css`, and the Tailwind classes below match them.

| Meaning | Text (light) | Fill (light) | Classes | Dark text |
|---|---|---|---|---|
| Success / approved | `#059669` | `#DCFCE7` | `text-emerald-600 bg-green-100` | `#10B981` |
| Warning / pending review | `#D97706` | `#FEF3C7` | `text-amber-600 bg-amber-100` | `#F59E0B` |
| Error / rejected | `#DC2626` | `#FEE2E2` | `text-red-600 bg-red-100` | `#EF4444` |
| Pending / in process | `#7C3AED` | `#EDE9FE` | `text-violet-600 bg-violet-100` | `#6366F1` |
| Info | `#0891B2` | `#CFFAFE` | `text-cyan-600 bg-cyan-100` | `#0EA5E9` |

CSS vars: `--status-{success,warning,error,pending,info}` and `--status-*-light`. Tailwind badges in the code often use one step darker text on a lighter fill (`text-emerald-700 bg-emerald-50`, `text-amber-700 bg-amber-50`). That is the same hue family and is fine for small badge text, where the extra contrast helps.

**Rule:** A status badge is tinted fill + darker text + optional `-200` border of the same hue. Never pair a saturated fill with white text for status.
**Rule:** Keep blue for brand and action. Info uses cyan, so an info badge never reads as a button.

## Score ratings

Evaluation scores (IPCR, applicant ratings) use a fixed five-step scale, defined as `--score-*-text` / `--score-*-bg`.

| Rating | Text | Background |
|---|---|---|
| Excellent | `#15803D` | `#DCFCE7` |
| Very good | `#1D4ED8` | `#DBEAFE` |
| Good | `#7C3AED` | `#EDE9FE` |
| Average | `#B45309` | `#FEF9C3` |
| Below average | `#DC2626` | `#FEE2E2` |

**Rule:** Use these variables for any score display so ratings look the same across modules.

## Theming

`src/lib/theme.ts` sets both `.theme-dark`/`.theme-light` and `data-theme` on `<html>`. The user's theme choice applies only inside the RSP module and settings; every other route is forced to light. The user can also pick an accent through `data-accent` (blue, green, purple, orange).

`globals.css` defines dark mode twice. `.theme-dark` uses neutral blacks (`#121417`), and `html[data-theme='dark']` uses slate navy (`#0B1220`). Because both are applied and the attribute selector is more specific, **the slate values win**, and the tables above list those.

**Rule:** Treat `html[data-theme='dark']` as the canonical dark palette. When adding a dark-mode value, add it there.
**Rule:** Components that must respect the accent setting use `var(--accent-primary)`, not a hardcoded `#363EE8`.

## Typography

The font is **Poppins** (300–800), loaded from Google Fonts in `globals.css` and set as Tailwind's `sans`.

| Role | Weight | Color |
|---|---|---|
| Page title | 700 | `slate-900` or `abyan-dark` |
| Section heading | 600 | `slate-900` |
| Body | 400 | `slate-700` |
| Label / meta | 500 | `slate-500` |

## Shape and elevation

Corner radius follows usage: `rounded-lg` (8px) for inputs, buttons, and small cards; `rounded-xl` (12px) for cards and panels; `rounded-2xl` (16px) for modals and hero panels; and `rounded-full` for pills, badges, and avatars.

Shadows come from `--shadow-sm` through `--shadow-xl` in `globals.css`. Cards default to `shadow-sm` plus a `slate-200` border.

## Focus

Focused inputs get an Abyan border. The current focus ring in `globals.css` is `rgba(0, 123, 255, 0.1)`, a leftover Bootstrap blue that doesn't match the brand.

**Rule:** Focus ring is `0 0 0 3px rgba(54, 62, 232, 0.15)` (Abyan at 15%), or `ring-2 ring-abyan/30` in Tailwind.

## Out of scope

This file does not cover spacing scale, motion, iconography, or per-module layouts. Add those sections when a decision is made.
