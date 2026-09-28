# ABYAN HRIS — UI Design Identity Guide

> **Human Resource Information System**
> *A Decision Support Information System for Competency Assessment, Training Recommendations, and Data-Driven Succession Planning.*

This document is the single source of truth for how ABYAN looks and feels. Every view, portal, and component (Public/Applicant, Employee, HR/Admin) must follow it so the system reads as **one product**. If something in the UI conflicts with this guide, the guide wins — fix the UI, or update the guide through a PR.

---

## Table of Contents

1. [Brand Purpose & Vibe](#1-brand-purpose--vibe)
2. [Logo](#2-logo)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing, Radius, Elevation](#5-spacing-radius-elevation)
6. [Iconography](#6-iconography)
7. [Brand Pattern & Graphics](#7-brand-pattern--graphics)
8. [Layout & Page Anatomy](#8-layout--page-anatomy)
9. [Components](#9-components)
   - [Buttons](#91-buttons) · [Navigation](#92-navigation-header--tabs) · [Forms](#93-form-controls) · [Table toolbar](#94-table-toolbar-search--sort--entries) · [Tables](#95-tables) · [Pagination](#96-pagination) · [KPI cards](#97-dashboard-kpi-cards) · [Status badges](#98-status--category-badges) · [Alerts & toasts](#99-alerts-toasts) · [Modals](#910-modals--dialogs) · [Charts](#911-charts--data-visualization)
10. [Status & Category Color Map (HR Domain)](#10-status--category-color-map-hr-domain)
11. [Portal-Specific Notes](#11-portal-specific-notes)
12. [Voice & Content](#12-voice--content)
13. [Accessibility](#13-accessibility)
14. [Design Tokens (CSS / Tailwind)](#14-design-tokens-css--tailwind)
15. [Do & Don't](#15-do--dont)
16. [PR Consistency Checklist](#16-pr-consistency-checklist)
17. [Open Items / Known Inconsistencies](#17-open-items--known-inconsistencies)

---

## 1. Brand Purpose & Vibe

**Purpose.** ABYAN bridges the operational gaps in the Human Resource Management Office by assessing employee competency gaps, recommending training, and supporting long-term, evidence-based succession planning. It also serves as the public gateway for job seekers to find vacancies, apply, and track applications.

**The name.** *Abyan* (from "*Abyan mo sa pag-asenso*", "we support your progress") signals guidance and forward movement. The tagline used on the landing hero is **"Your gateway to public service."**

**Personality — how the UI should feel**

| Trait | What it means in the UI |
|---|---|
| **Trustworthy** | Deep blues, clear hierarchy, no visual noise. This is government/HR data. |
| **Modern & clean** | Generous white space, rounded shapes, one typeface (Poppins). |
| **Empowering** | Growth-oriented language, clear next actions, visible progress. |
| **Evidence-driven** | Data is front and center: KPIs, gaps, charts, statuses are always legible. |
| **Approachable** | Friendly rounded pill buttons, occasional Filipino warmth in public-facing copy. |

**Design principles**

1. **One system, many portals.** A button is a button everywhere.
2. **Data first, decoration second.** Brand patterns live in heroes and empty states, never behind dense tables.
3. **Color means something.** Blue = brand/action. Green / Orange / Red = status only. Never decorative.
4. **Clarity over cleverness.** Every screen has one primary action.

---

## 2. Logo

- **File:** `USWAG (3)` (use the exported SVG/PNG from the brand assets folder; do not redraw or re-trace).
- **Mark:** A white ribbon "A" with an arch and three people beneath it, symbolizing an organization sheltering and supporting its workforce.
- **Lockup (header):** `[Mark]  ABYAN` (Poppins Bold, white) + `Human Resource Information System` (Poppins Regular, white, smaller, same baseline, ~12px gap after the wordmark).

**Usage rules**

| Rule | Spec |
|---|---|
| Primary background | Brand blue `#363EE8` or the hero gradient. Logo is **white**. |
| On white backgrounds | Use a blue (`#363EE8` or `#040e6b`) single-color version of the mark. |
| Header height for logo | Mark 32–40px tall. |
| Clear space | At least the width of one "person" icon in the mark on every side. |
| Minimum size | Mark: 24px. Full lockup: 160px wide. |
| Never | Stretch, rotate, add shadows/outlines, recolor to non-brand colors, or place on busy imagery without a blue overlay. |

**App icon / favicon:** the white mark centered on solid `#363EE8` (square, ~20% padding).

---

## 3. Color System

### 3.1 Brand palette

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Primary** | `--color-primary` | `#363EE8` | Primary buttons, links, active states, focus rings, header bar |
| **Primary — Deep** | `--color-primary-900` | `#040E6B` | Headings and primary text on light backgrounds, hero gradient end |
| **Primary — Dark** | `--color-primary-700` | `#191FA8` | Hover/pressed for primary, dark accents |
| **Primary — Vivid** | `--color-primary-accent` | `#000CFF` | Sparingly: brand pattern highlights, focus glow, charts |
| **Primary — Tint** | `--color-primary-200` | `#C8D1FF` | Soft backgrounds, selected rows, disabled primary, gradient start |
| **White** | `--color-white` | `#FFFFFF` | Cards, surfaces, text on blue |

### 3.2 Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--bg-page` | `#F1F5F9` | Default app/page background, table header row, input hover |
| `--bg-surface` | `#FFFFFF` | Cards, modals, dropdowns, tables, inputs |
| `--bg-brand` | `#363EE8` | Header bar, brand sections |
| `--bg-tint` | `#C8D1FF` at 30–40% (or `#EEF0FF`) | Selected items, info panels, icon chips |

### 3.3 Neutrals (text & borders)

| Token | Hex | Usage |
|---|---|---|
| `--neutral-900` | `#101E29` | Strongest neutral text (rare; dense data emphasis) |
| `--neutral-800` | `#28343D` | Body text, secondary headings |
| `--neutral-600` | `#515F69` | Secondary text, captions, helper text, placeholders (darker variant) |
| `--neutral-400` *(proposed)* | `#94A3B8` | Placeholder, disabled text, inactive icons |
| `--neutral-200` *(proposed)* | `#E2E8F0` | Borders, dividers |
| `--neutral-100` *(proposed)* | `#F1F5F9` | Same as page background |

### 3.4 Text colors

| Situation | Color |
|---|---|
| Headings & primary text on light bg | `#040E6B` |
| Body / secondary text on light bg | `#28343D` |
| Captions, helper text, subtitles | `#515F69` |
| Text on blue backgrounds, on gradient, or inside filled buttons | `#FFFFFF` |
| Links | `#363EE8` (hover `#191FA8`, underline on hover) |
| Disabled text | `#94A3B8` |

### 3.5 Gradients

| Name | Definition | Usage |
|---|---|---|
| **Hero** | `linear-gradient(180deg, #363EE8 0%, #040E6B 100%)` | Landing/public hero, login side panel |
| **Brand Soft** | `linear-gradient(135deg, #C8D1FF 0%, #363EE8 100%)` | Feature panels, illustration backdrops, progress accents |
| **Primary Button** | `linear-gradient(180deg, #363EE8 0%, #191FA8 100%)` | Primary buttons (subtle; see Buttons) |

Hero backgrounds are straight-edged and decorated only with **angular polygons** (diagonal slices, parallelograms, triangles) in tonal indigo at 6–14% opacity; see §7.1. **No circles, rings, arcs or curved hero corners.**

### 3.6 Semantic status colors

Each status color has three steps. **100** = soft background, **300** = borders/illustrations, **500** = solid fill/icons. A **700** step (proposed) is for text on 100 backgrounds to keep contrast accessible.

| | 100 | 300 | 500 | 700 *(text on 100)* |
|---|---|---|---|---|
| **Success / Green** | `#DCFCE7` | `#7ECBA1` | `#16A85A` | `#0F7A40` |
| **Warning / Orange** | `#FCE8C8` | `#F0B478` | `#E8821A` | `#A8590A` |
| **Error / Red** | `#FDE2E2` | `#EF9A9A` | `#E05252` | `#B42323` |
| **Info / Blue** | `#E0E5FF` | `#C8D1FF` | `#363EE8` | `#191FA8` |
| **Neutral / Gray** | `#F1F5F9` | `#CBD5E1` | `#64748B` | `#28343D` |

> Green/Orange/Red hexes are sampled from the palette reference image and rounded; confirm against the design file and update here if they differ.

**Rules**
- Green/Orange/Red are **status only** (success, caution, error/critical). Do not use them for decoration or for generic categories.
- Never rely on color alone. Always pair with an icon or label text.
- Solid `500` fills use white text (except Orange, use `#FFFFFF` bold ≥14px or switch to the 100/700 badge style).

---

## 4. Typography

**Typeface:** **Poppins** (Google Fonts). Load weights **400, 500, 600, 700**. Fallback stack: `'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.

### 4.1 Type scale

| Style | Weight | Size | Line height | Letter spacing | Typical use |
|---|---|---|---|---|---|
| **Title L** | Bold (700) | 36px | 40px | 0% | Page titles, dashboard greeting |
| **Title M** | SemiBold (600) | 24px | 32px | 0% | Section titles ("Currently Vacant Jobs"), modal titles |
| **Title S** | SemiBold (600) | 18px | 24px | 0% | Card titles, panel headings |
| **Headline L** | Bold (700) | 16px | 20px | 0% | Emphasized labels, table header text |
| **Headline M** | SemiBold (600) | 16px | 20px | 0% | Form section labels, list item titles |
| **Headline S** | Medium (500) | 16px | 20px | 0% | Nav items, subtle headings |
| **Caption** | Medium (500) | 14px | 16px | 0% | Field captions, KPI titles, meta info |
| **Body L** | Regular (400) | 16px | 24px | 0% | Paragraphs, descriptions |
| **Body M** | Medium (500) | 14px | 18px | 0% | Table cell text, inputs, secondary paragraphs |
| **Body S** | Medium (500) | 12px | 16px | 0.1px | Helper text, footnotes, badge text |
| **HEADLINE CAPS** | SemiBold (600) | 12px | 16px | 0.4px | Overlines, table group labels (UPPERCASE) |

> The source table labels the fourth column "Line weight"; it is **line height**.

### 4.2 Landing hero scale (marketing only)

| Element | Spec |
|---|---|
| Hero headline | Poppins Bold, 56–64px desktop (40px mobile), tight tracking (-1%), white, centered |
| Hero subtext | Poppins Regular, 20px / 28px, white at 90%, max-width ~720px, centered |

### 4.3 CSS classes to use

```css
.text-title-l   { font: 700 36px/40px 'Poppins', sans-serif; }
.text-title-m   { font: 600 24px/32px 'Poppins', sans-serif; }
.text-title-s   { font: 600 18px/24px 'Poppins', sans-serif; }
.text-headline-l{ font: 700 16px/20px 'Poppins', sans-serif; }
.text-headline-m{ font: 600 16px/20px 'Poppins', sans-serif; }
.text-headline-s{ font: 500 16px/20px 'Poppins', sans-serif; }
.text-caption   { font: 500 14px/16px 'Poppins', sans-serif; }
.text-body-l    { font: 400 16px/24px 'Poppins', sans-serif; }
.text-body-m    { font: 500 14px/18px 'Poppins', sans-serif; }
.text-body-s    { font: 500 12px/16px 'Poppins', sans-serif; letter-spacing: .1px; }
.text-caps      { font: 600 12px/16px 'Poppins', sans-serif; letter-spacing: .4px; text-transform: uppercase; }
```

**Rules:** Never mix in a second typeface. Never go below 12px. Headings use `#040E6B`; body uses `#28343D`. Max line length for paragraphs: ~70 characters.

---

## 5. Spacing, Radius, Elevation

### 5.1 Spacing (4px base grid)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80`

| Context | Value |
|---|---|
| Inside cards | 20–24px padding |
| Between form fields | 16–20px |
| Between sections | 32–48px |
| Page horizontal gutter | 16px mobile / 24px tablet / centered container on desktop |
| Container max-width | **1280px** (landing/public), **fluid with sidebar** (portals) |

### 5.2 Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges (non-pill), small chips |
| `--radius-md` | 8px | Inputs, selects, pagination buttons, table container inner elements |
| `--radius-lg` | 12px | Cards, tables container, Login nav button, modals |
| `--radius-xl` | 16px | Large panels, hero cards |
| `--radius-pill` | 999px | **All buttons**, status badges, filters chips |

### 5.3 Elevation

| Level | Shadow | Use |
|---|---|---|
| 0 | none, `1px solid #E2E8F0` | Cards, tables (default; prefer borders) |
| 1 | `0 1px 2px rgba(16,30,41,.06), 0 1px 3px rgba(16,30,41,.08)` | Hover on cards |
| 2 | `0 4px 12px rgba(16,30,41,.10)` | Dropdowns, popovers |
| 3 | `0 12px 32px rgba(16,30,41,.16)` | Modals |
| Focus glow | `0 4px 14px rgba(54,62,232,.40)` | Focused primary button |

---

## 6. Iconography

- **Style:** Outline (line) icons, **1.75px stroke**, rounded caps and joins. Use **Lucide** (or an equivalent matching set) exclusively. The current UI already uses Lucide-style icons (`briefcase`, `search`, `users`).
- **Sizes:** 16px (inline with text / small buttons), 20px (buttons, inputs, nav), 24px (KPI icons, empty states).
- **Color:** Inherit text color; on blue backgrounds `#FFFFFF`; inactive `#94A3B8`.
- **Icon + label:** 8px gap, icon before label.
- **Icon-only buttons** must have an `aria-label` and tooltip.

**Standard icon assignments (keep consistent across portals)**

| Concept | Icon |
|---|---|
| Apply for a job / Vacancies | `briefcase` |
| Track / Search | `search` |
| Login / Users / Employees | `users` / `user` |
| Competency assessment | `clipboard-check` |
| Training | `graduation-cap` |
| Succession planning | `git-branch` / `trending-up` |
| Departments | `building-2` |
| Reports | `bar-chart-3` |
| Settings | `settings` |
| Documents | `file-text` |
| Calendar / Dates | `calendar` |
| Add / Create | `plus` |
| Edit | `pencil` |
| Delete | `trash-2` |
| View details | `eye` |

---

## 7. Brand Pattern & Graphics

The brand pattern is a set of **geometric blue tiles**: quarter-circles, half-discs, solid squares, a diamond/checker grid, and vertical stripes, all built from the blue family (`#000CFF`, `#191FA8`, `#363EE8`, a lighter sky tone, and `#C8D1FF`). **Hero backgrounds use only the straight-edged subset** (slices, parallelograms, triangles; see §7.1). Rounded tiles stay in login panels, empty states and marketing material.

**Use it for:** login/registration side panels, hero backdrops (low opacity), empty states, cover/section headers, error pages, and slide/marketing material.

**Don't use it for:** behind tables, forms, or dense data; as button backgrounds.

**Rules**
- Compose from the existing tiles; keep shapes flat (no shadows/bevels).
- Keep a single accent direction per composition.
- Keep text over patterns at ≥4.5:1 contrast, or place text on a solid blue panel beside the pattern.

### 7.1 Hero backdrop shapes (angular only)

Portal and landing heroes are **straight-edged**. Their depth comes from a few large **angular polygons** (diagonal slices, parallelograms, triangles) layered in tonal indigo/navy.

**Hero container**
- `border-radius: 0` on **all four corners**, including bottom-left and bottom-right. The bottom edge is a straight horizontal line.
- The same zero radius applies to any wrapper, overlay or pseudo-element on the hero.
- `overflow: hidden`, so shapes that bleed off the top, right or bottom are clipped to that straight edge.

**Shapes**

| Rule | Spec |
|---|---|
| Geometry | Straight-edged polygons only (`clip-path: polygon()` or inline SVG `<polygon>`). **No** circles, ellipses, arcs, blobs, swooshes, `border-radius: 50%`, radial "orb" gradients or rounded SVG paths. |
| Count | 3–4 shapes on desktop; 2–3 on tablet; 1–2 on mobile, at lower opacity. |
| Angles | One or two slant angles across the whole composition (the interviewer hero uses ≈26°: 49px sideways per 100px down, as both `/` and `\`). Draw the shapes at a fixed pixel size (e.g. an SVG anchored to the right edge) so the angle doesn't stretch with the viewport. |
| Tones | Slightly lighter and slightly darker than the gradient, at **6–14% opacity**: white 6–10%, `#040E6B` ~14%, `#000CFF` ~12%. |
| Placement | Mainly the **right half and top-right**. The left side, where the logo, title and subtitle sit, stays clean and quiet. |
| Finish | Flat fills: no strokes, outlines, drop shadows or blur. |

**Optional faint table cards.** Decorative "To Evaluate"-style table cards may sit on top of the shapes on desktop (≥1024px) only:
- 8–15% opacity, with square corners.
- `aria-hidden="true"` and `pointer-events: none`.

**Content card**
- The white content wrapper overlaps the hero's straight bottom edge by 40–56px.
- Its top edge is straight. It uses the **small radius** only (`--radius-md`, 8px): no large or pill-shaped corners.

**Contrast**
- White title and subtitle text must pass WCAG AA against both the darkest and the lightest area behind them.
- A shape behind the title may never be lighter or more opaque than the base gradient allows.

---

## 8. Layout & Page Anatomy

### 8.1 Public / Landing portal

```
┌──────────────────────────────────────────────────────────┐
│ HEADER (blue #363EE8)  Logo lockup      Home About [Login]│
├──────────────────────────────────────────────────────────┤
│ HERO (gradient #363EE8 → #040E6B)                          │
│   Headline · Subtext · [Apply for a Job] [Track Application]│
├──────────────────────────────────────────────────────────┤
│ CONTENT (white)                                            │
│   Section title + subtitle            Toolbar (search/sort)│
│   Data table                                     Pagination │
└──────────────────────────────────────────────────────────┘
```

- **Header:** height ~84px desktop, solid `#363EE8`, content within the 1280px container. Nav items are Poppins Medium 16px, white.
  - Active nav item: pill/rounded-lg (`12px`) with `rgba(255,255,255,0.18)` background, white text.
  - Inactive: white text at ~85%; hover raises to 100% with the same soft background at 10%.
  - **Login** is a white button (`#FFFFFF`), rounded 12–16px, `#040E6B` bold label with a `users` icon at left. It is the header's one primary call to action.
- **Hero:** vertical padding 96–120px, centered content, two CTAs side by side (stacked on mobile).
- **Content:** white background, section top padding 64px.

### 8.2 Authenticated portals (HR/Admin, Employee)

```
┌────────┬─────────────────────────────────────────────┐
│ SIDEBAR│ TOPBAR (page title · search · notifications · profile)
│  (blue │─────────────────────────────────────────────│
│  or    │ PAGE (bg #F1F5F9)                            │
│  white)│   Title L / breadcrumb                       │
│        │   KPI row → Charts/Cards → Tables            │
└────────┴─────────────────────────────────────────────┘
```

- Page background `#F1F5F9`; all content sits on white cards (`--radius-lg`, 1px `#E2E8F0` border).
- Sidebar: 256px expanded / 72px collapsed. Use the same blue (`#363EE8`) or the deep gradient with white text; active item uses the `rgba(255,255,255,.18)` pill, matching the public header.
- Page order: **Title → KPIs → primary content → secondary content.**

#### Top navigation bar (all authenticated portals: RSP, L&D, PM, Interviewer, Office console)

Every portal keeps the same top bar, so users always recognise where they are:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Mark] ABYAN  Human Resource Information System      (👤) Name     │ [⎋ Logout] │
│                                                            Role / portal    │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Bar | Solid `#363EE8`, full width, height 64px (56px mobile), side padding 24px (16px mobile), sticky at the top |
| Logo lockup | White mark, 40px tall (32px mobile), then **ABYAN** (Poppins Bold, 20–22px, white), then **Human Resource Information System** (Poppins Regular, 16px, white). All three sit **on one line**, 12px apart. The system name is hidden below 1024px. Clicking the lockup goes to the portal home. |
| Avatar | 36px circle, `rgba(255,255,255,.18)` fill, white `user-circle` icon |
| Name / role | Name: SemiBold 14px white (truncate with a tooltip). Role or portal: Regular 12px, white at 75–85%. Hidden on mobile. |
| Divider | 1px × 28px, `rgba(255,255,255,.25)`. Hidden on mobile. |
| Logout | The **Header Logout** button (§9.1) |

Page titles do **not** go in this bar; they go in the hero or at the top of the page content.

### 8.3 Responsive breakpoints

| Name | Width |
|---|---|
| Mobile | < 640px |
| Tablet | 640–1023px |
| Desktop | 1024–1279px |
| Wide | ≥ 1280px |

Tables scroll horizontally inside their container on small screens. Toolbars wrap; primary CTA remains visible.

---

## 9. Components

### 9.1 Buttons

**Shape:** Fully rounded **pill** (`border-radius: 999px`). Poppins **SemiBold**. Label + optional 16–20px leading icon (8px gap).

**Sizes**

| Size | Height | Font size | Horizontal padding | Use |
|---|---|---|---|---|
| **Large** | 50px | 16px | 28px | Hero CTAs, login/submit on auth pages |
| **Medium** | 45px | 15px | 24px | Default for forms, dialogs, page actions |
| **Small** | 36px | 13px | 16px | Table rows, cards, inline actions |

**Primary (filled)**

| State | Spec |
|---|---|
| Default | Background `#363EE8` (optionally the subtle gradient `#363EE8 → #191FA8`), text `#FFFFFF` |
| Hover | Background `#191FA8` |
| Focused / Pressed | Same fill + **glow shadow** `0 4px 14px rgba(54,62,232,.40)` and a 2px outer ring `#C8D1FF` |
| Disabled | Background `#C8D1FF` (or 40% primary), text white at ~80%, `cursor: not-allowed`, no shadow |

**Secondary (outline)**

| State | Spec |
|---|---|
| Default | Transparent/white bg, **1.5px border `#363EE8`**, text `#363EE8` (or `#191FA8`) |
| Hover | Background `#EEF0FF` |
| Focused / Pressed | Filled with primary (`#363EE8 → #191FA8`), text white, glow shadow |
| Disabled | Border and text `#C8D1FF`, no fill |

**On-blue variants (hero and header only)**

| Variant | Spec |
|---|---|
| **Solid white** | Bg `#FFFFFF`, text/icon `#363EE8` or `#040E6B`, soft shadow. E.g. **Apply for a Job**, **Login** |
| **Ghost / outline white** | Transparent bg, 1px border `rgba(255,255,255,.5)`, text `#FFFFFF`. E.g. **Track Application** |
| **Header Logout** | Glass rectangle: bg `rgba(255,255,255,.12)`, 1px border `rgba(255,255,255,.35)`, radius 12px, min 44×44px, padding `0 16px`, Poppins SemiBold 14px. Leading `log-out` icon 16px. **The "Logout" label and the icon are always `#FFFFFF`**, in every portal and state. Hover bg `rgba(255,255,255,.20)`; focus ring `0 0 0 3px rgba(255,255,255,.5)`. Below 640px the label hides and the button becomes icon-only, still 44×44px with `aria-label="Logout"`. |

> **Logout label must be white.** The legacy `globals.css` sets a dark `color` directly on every `span`, `p`, `label`, `a` and `button`. A `<span>Logout</span>` inside a white button therefore renders **dark** unless the span gets its own white color. Always set `color: #FFFFFF` on the label element itself (or render it inside an `.abyan-ds` scope, which resets text to inherit).

**Destructive:** Use only for irreversible actions. Bg `#E05252`, hover `#B42323`, white text; outline variant uses the red border/text. Always confirm in a modal.

**Rules**
- One primary button per view/section. Everything else is secondary.
- Button order in dialogs: **Secondary (Cancel) on the left, Primary on the right.**
- Loading state: replace label with a 16px spinner, keep width, disable clicks.
- Don't use square or slightly rounded buttons. Rounded-rectangles (12px) are reserved for the header **Login** and **Logout** buttons, nav pills, and pagination.

> **Note:** The button kit lists the Small **Secondary** height as 45px, which appears to be a typo. Use **36px** for all Small buttons.

### 9.2 Navigation (Header & Tabs)

- **Nav item:** Poppins Medium 16px, padding `8px 16px`, radius 12px, white text on blue.
- **Active:** `rgba(255,255,255,.18)` bg. **Hover:** `rgba(255,255,255,.10)`.
- **Tabs (on white pages):** Text `#515F69`; active `#363EE8` with a 2px bottom border `#363EE8`; hover `#040E6B`.
- **Breadcrumbs:** Caption size, `#515F69` with current page in `#040E6B` Medium; separator `/` or chevron.

### 9.3 Form Controls

| Property | Spec |
|---|---|
| Height | 44px (default), 36px (compact/toolbars) |
| Background | `#FFFFFF` |
| Border | 1px `#E2E8F0` |
| Radius | 8px (`--radius-md`) |
| Text | Body M, `#28343D` |
| Placeholder | `#94A3B8` / `#515F69` at 70% |
| Leading icon | 20px, `#94A3B8` (e.g. search) |
| Hover | Border `#C8D1FF` |
| **Focus** | **Border `#363EE8` (1.5–2px) + ring `0 0 0 3px rgba(54,62,232,.15)`** |
| Error | Border `#E05252`, message below in Body S `#B42323` with an icon |
| Success | Border `#16A85A` |
| Disabled | Background `#F1F5F9`, text `#94A3B8` |

- **Label:** Caption (14px Medium) `#28343D`, above the input, 6px gap. Required fields get a red `*`.
- **Helper text:** Body S `#515F69`, 4px below the input.
- **Select/dropdown:** Same as input, with a chevron-down icon at right; menu is white, elevation 2, radius 8px; selected option has `#EEF0FF` bg and `#363EE8` text.
- **Checkbox/Radio:** 18px, checked = `#363EE8` fill with white mark; focus ring same as inputs.
- **Toggle:** 40×22px, on = `#363EE8`, off = `#CBD5E1`.

### 9.4 Table Toolbar (Search · Sort · Entries)

Reference pattern (as in "Currently Vacant Jobs"):

```
Section Title (Title M, #040E6B)                [🔍 Search title, dept, type…] [Newest to Oldest ⌄]  Show [5 ⌄] entries
Subtitle (Body L, #515F69)
```

- Search input: 44px height, radius 8px, leading search icon, width ~260px.
- Sort select: same height, text `#040E6B` Medium.
- "Show [n] entries": label in Body M `#040E6B`; the **entries select uses the focus/active style** (`#363EE8` 1.5px border) when open/selected.
- Toolbar is right-aligned on desktop, stacks under the title on mobile, with 12–16px gaps.
- Use this same toolbar for **all** list/table views (employees, applicants, trainings, assessments) so filter placement never changes between portals.

### 9.5 Tables

| Part | Spec |
|---|---|
| Container | White, 1px `#E2E8F0` border, radius 12px, `overflow: hidden` |
| Header row | Background `#F1F5F9`, text **Headline M/L** (Poppins SemiBold/Bold 14–16px) `#040E6B`, height ~52px, padding `0 20px` |
| Body row | Height ~64px, Body M `#28343D`, bottom border 1px `#E2E8F0` |
| Primary column | Position/Name in **Headline S/M** `#040E6B`, secondary info under it in Body S `#515F69` |
| Row hover | `#F8FAFF` (very light tint) |
| Row selected | `#EEF0FF` |
| Actions column | Right-aligned; **Details** = Small secondary button; **Apply / primary action** = Small primary button |
| Empty state | Centered icon (24–32px), Title S, Body M message, and a primary CTA if applicable |
| Dates | Format `MMM DD, YYYY` (e.g. `Sep 28, 2026`) everywhere |

Column alignment: text left, numbers right, actions right. Never truncate primary identifiers without a tooltip.

### 9.6 Pagination

Reference: `‹ Previous | 1 2 3 4 5 6 | Next ›`

| Element | Spec |
|---|---|
| Page button | 40×40px, radius 8px, 1px border `#C8D1FF`/`#E2E8F0`, text `#28343D` Medium 14px |
| **Active page** | Filled `#363EE8`, text `#FFFFFF`, no border |
| Hover | Bg `#EEF0FF`, border `#C8D1FF` |
| Previous / Next | Auto width (padding `0 16px`), chevron icon + label; **disabled** state: text `#94A3B8`, bg `#F8FAFC`, border `#E2E8F0` |
| Gap | 8px between buttons |
| Ellipsis | Use `…` when > 7 pages (first, last, current ±1) |

Place pagination bottom-right under the table, with "Showing X–Y of Z entries" on the left in Body S `#515F69`.

### 9.7 Dashboard KPI Cards

Each KPI card = **small icon + KPI title + value (+ optional trend)**.

```
┌──────────────────────────────┐
│ [ icon chip ]  KPI Title     │   ← icon 20px in a 36–40px rounded chip; title = Caption, #515F69
│                              │
│ 1,248                        │   ← value = Title L, #040E6B
│ ▲ 4.2% vs last month         │   ← optional trend = Body S (green ▲ / red ▼)
└──────────────────────────────┘
```

| Property | Spec |
|---|---|
| Card | White, 1px `#E2E8F0`, radius 12px, padding 20px, min-width 220px |
| Icon chip | 36–40px square, radius 10px, background `#EEF0FF` (or the 100 shade of its status), icon `#363EE8` (or the 500 shade of its status) |
| Title | Caption (14px Medium), `#515F69`; **sentence case**; max 2 lines |
| Value | Title L (36/40 Bold) `#040E6B`; use compact numbers (1.2K) only when > 9,999 |
| Trend (optional) | Body S; up = `#0F7A40` with ▲, down = `#B42323` with ▼, neutral = `#515F69`. Label the comparison period. |
| Hover (if clickable) | Elevation 1 and border `#C8D1FF`; whole card is the link |
| Layout | CSS grid, `repeat(auto-fit, minmax(220px, 1fr))`, 16–24px gap; 4 cards per row on desktop |

Use status colors for the icon chip only when the KPI itself is a status metric (e.g. *Critical competency gaps* = red chip, *Trainings completed* = green chip). Otherwise all chips are brand blue, so a dashboard doesn't become a rainbow.

**Suggested KPI set & icons**

| KPI title | Icon | Chip |
|---|---|---|
| Total employees | `users` | Blue |
| Open vacancies | `briefcase` | Blue |
| Applications received | `file-text` | Blue |
| Competency gaps identified | `alert-triangle` | Orange |
| Critical gaps | `alert-octagon` | Red |
| Trainings recommended | `graduation-cap` | Blue |
| Trainings completed | `check-circle-2` | Green |
| Succession-ready employees | `trending-up` | Green |

### 9.8 Status & Category Badges

- **Shape:** pill, height 24–28px, padding `0 12px`, Body S (12px Medium), optional 6px dot or 14px icon at left.
- **Style (default, "soft"):** Background = **100** shade, text = **700** shade, optional dot = **500** shade.
- **Style ("solid", for high emphasis only):** Background = **500** shade, text `#FFFFFF`.
- Always show a text label; never a colored dot alone.

| Variant | Bg | Text | Dot |
|---|---|---|---|
| Success | `#DCFCE7` | `#0F7A40` | `#16A85A` |
| Warning | `#FCE8C8` | `#A8590A` | `#E8821A` |
| Error | `#FDE2E2` | `#B42323` | `#E05252` |
| Info | `#E0E5FF` | `#191FA8` | `#363EE8` |
| Neutral | `#F1F5F9` | `#28343D` | `#64748B` |

### 9.9 Alerts, Toasts

| Type | Left border/Icon | Background | Icon |
|---|---|---|---|
| Success | `#16A85A` | `#DCFCE7` | `check-circle-2` |
| Warning | `#E8821A` | `#FCE8C8` | `alert-triangle` |
| Error | `#E05252` | `#FDE2E2` | `x-circle` |
| Info | `#363EE8` | `#E0E5FF` | `info` |

- Inline alert: radius 12px, padding 16px, Title = Headline M, message = Body M `#28343D`.
- Toast: white card, elevation 3, 4px left accent in status color, top-right, auto-dismiss 5s (errors persist until closed).

### 9.10 Modals & Dialogs

- Overlay `rgba(4,14,107,.45)` (tinted deep blue, not black).
- Panel: white, radius 12–16px, elevation 3, padding 24px, max-width 480px (confirm) / 640px (forms) / 880px (large).
- Title: Title S or Title M `#040E6B`; close (×) icon top-right.
- Footer actions right-aligned: **Cancel (secondary) → Confirm (primary)**. Destructive confirmations use the destructive button.

### 9.11 Charts & Data Visualization

**Categorical series order:** `#363EE8` → `#040E6B` → `#000CFF` → `#8A96FF` → `#C8D1FF` → `#94A3B8`.
- Use green/orange/red **only** when the data itself represents good/caution/bad (e.g. competency gap severity).
- Gridlines `#E2E8F0`, axis labels Body S `#515F69`, no chart borders, rounded bar tops (4px).
- Titles: Title S in the card header; legends below or top-right, Body S.
- Tooltips: `#101E29` bg, white text, radius 8px.

---

## 10. Status & Category Color Map (HR Domain)

Use these mappings **everywhere** (tables, dashboards, detail pages, emails, exports) so the same status is always the same color.

### Application status
| Status | Variant |
|---|---|
| Submitted / Received | Info (blue) |
| Under Review | Warning (orange) |
| Shortlisted | Info (blue) |
| For Interview | Warning (orange) |
| Qualified / Hired / Approved | Success (green) |
| Disqualified / Rejected | Error (red) |
| Withdrawn / Closed / Draft | Neutral (gray) |

### Vacancy status
| Status | Variant |
|---|---|
| Open | Success |
| Closing soon (≤ 3 days) | Warning |
| Closed / Expired | Neutral |
| Cancelled | Error |

### Competency gap level
| Level | Variant |
|---|---|
| No gap / Meets or exceeds required level | Success |
| Minor gap | Info |
| Moderate gap | Warning |
| Critical gap | Error |

### Training status
| Status | Variant |
|---|---|
| Recommended | Info |
| Scheduled / Ongoing | Warning |
| Completed | Success |
| Not completed / Overdue | Error |
| Cancelled | Neutral |

### Succession readiness
| Readiness | Variant |
|---|---|
| Ready now | Success |
| Ready in 1–2 years | Info |
| Ready in 3+ years / Developing | Warning |
| No identified successor | Error |

### Employee / record status
| Status | Variant |
|---|---|
| Active | Success |
| On leave | Warning |
| Retired / Resigned / Inactive | Neutral |
| Suspended / Flagged | Error |

### Category tags (non-status)
Categories such as **Department**, **Employment type** (Permanent, Casual, Contractual), **Competency type** (Core, Leadership, Technical) are not statuses, so they use **neutral or brand-tint chips only** (`#EEF0FF` bg / `#191FA8` text, or gray). Do not assign red/orange/green to categories.

---

## 11. Portal-Specific Notes

| Portal | Chrome | Notes |
|---|---|---|
| **Public / Applicant** | Blue header, hero, white content | Uses white-on-blue CTAs in the hero; tone is inviting; bilingual touches allowed |
| **Login / Auth** | Split layout: brand pattern or gradient panel + white form card | Large primary button; logo above the form; error messages inline |
| **Employee portal** | Sidebar + topbar, `#F1F5F9` page | Personal KPIs (competency score, trainings, career path), progress bars in brand blue |
| **HR / Admin portal** | Sidebar + topbar, `#F1F5F9` page | Dense tables, filters, bulk actions, charts; follow the table toolbar pattern strictly |
| **Reports / Print** | White background, no gradients | Use Poppins, blue table headers `#040E6B` with white text, logo top-left |
| **Interviewer portal** | Top navigation bar (§8.2) + straight-edged gradient hero with angular shapes (§7.1); white content card (8px radius) overlaps its straight bottom edge | KPI cards open a compact quick view; table paginates (no long scroll) |
| **Emails / PDFs** | Blue header band with white logo | Buttons follow primary pill style; status badges as in §9.8 |

---

## 12. Voice & Content

- **Tone:** Professional, warm, plain language. Address the user directly ("Track your application").
- **Buttons/labels:** Verb-first, Title Case for buttons (`Apply for a Job`, `Track Application`); Sentence case for descriptions, KPI titles, helper text.
- **Filipino accents:** Allowed in public-facing marketing copy (e.g. *"Abyan mo sa pag-asenso."*). Keep functional UI copy (forms, errors, table headers) in clear English for consistency.
- **Errors:** Say what happened + what to do. *"We couldn't save your changes. Check your connection and try again."* Never blame the user; avoid codes without explanation.
- **Empty states:** Explain why it's empty and give the next action.
- **Terminology:** Use consistent terms — *Position Title, Department, Plantilla Item No., Posting Date, Closing Date, Competency, Training, Succession Plan.*

---

## 13. Accessibility

- **Contrast:** Body text ≥ 4.5:1, large text/icons ≥ 3:1. Verified pairs: `#363EE8` on white (≈ 7:1), `#040E6B` on white (≈ 17:1), white on `#363EE8` (≈ 7:1), `#515F69` on white (≈ 6:1).
- **Focus:** Every interactive element shows a visible focus indicator (2px `#363EE8` ring or the glow style). Never `outline: none` without a replacement.
- **Targets:** Minimum 36×36px (44px preferred on touch).
- **Color independence:** Statuses always have a text label or icon.
- **Forms:** Labels always visible (no placeholder-only labels); errors linked via `aria-describedby`.
- **Tables:** Proper `<th scope>`, sortable headers announce sort state.
- **Motion:** 150–200ms ease-out transitions; respect `prefers-reduced-motion`.
- **Language:** Set `lang="en"`; mark Filipino phrases with `lang="fil"` where feasible.

---

## 14. Design Tokens (CSS / Tailwind)

### 14.1 CSS variables

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

:root {
  /* Brand */
  --color-primary: #363EE8;
  --color-primary-700: #191FA8;
  --color-primary-900: #040E6B;
  --color-primary-accent: #000CFF;
  --color-primary-200: #C8D1FF;
  --color-primary-50: #EEF0FF;
  --color-white: #FFFFFF;

  /* Backgrounds */
  --bg-page: #F1F5F9;
  --bg-surface: #FFFFFF;

  /* Neutrals */
  --neutral-900: #101E29;
  --neutral-800: #28343D;
  --neutral-600: #515F69;
  --neutral-400: #94A3B8;
  --neutral-200: #E2E8F0;

  /* Status */
  --success-100: #DCFCE7; --success-300: #7ECBA1; --success-500: #16A85A; --success-700: #0F7A40;
  --warning-100: #FCE8C8; --warning-300: #F0B478; --warning-500: #E8821A; --warning-700: #A8590A;
  --error-100:   #FDE2E2; --error-300:   #EF9A9A; --error-500:   #E05252; --error-700:   #B42323;

  /* Gradients */
  --gradient-hero: linear-gradient(180deg, #363EE8 0%, #040E6B 100%);
  --gradient-soft: linear-gradient(135deg, #C8D1FF 0%, #363EE8 100%);
  --gradient-button: linear-gradient(180deg, #363EE8 0%, #191FA8 100%);

  /* Radius */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px; --radius-pill: 999px;

  /* Elevation */
  --shadow-1: 0 1px 2px rgba(16,30,41,.06), 0 1px 3px rgba(16,30,41,.08);
  --shadow-2: 0 4px 12px rgba(16,30,41,.10);
  --shadow-3: 0 12px 32px rgba(16,30,41,.16);
  --shadow-focus: 0 4px 14px rgba(54,62,232,.40);

  /* Type */
  --font-sans: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

body {
  font-family: var(--font-sans);
  color: var(--neutral-800);
  background: var(--bg-page);
}
h1, h2, h3, h4 { color: var(--color-primary-900); }
```

### 14.2 Button reference CSS

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--font-sans); font-weight: 600;
  border-radius: var(--radius-pill); border: 1.5px solid transparent;
  cursor: pointer; transition: background .15s, box-shadow .15s, color .15s;
}
.btn-lg { height: 50px; padding: 0 28px; font-size: 16px; }
.btn-md { height: 45px; padding: 0 24px; font-size: 15px; }
.btn-sm { height: 36px; padding: 0 16px; font-size: 13px; }

.btn-primary { background: var(--gradient-button); color: #fff; }
.btn-primary:hover { background: var(--color-primary-700); }
.btn-primary:focus-visible,
.btn-primary:active { box-shadow: var(--shadow-focus), 0 0 0 3px var(--color-primary-200); }
.btn-primary:disabled { background: var(--color-primary-200); color: rgba(255,255,255,.85); box-shadow: none; cursor: not-allowed; }

.btn-secondary { background: transparent; color: var(--color-primary); border-color: var(--color-primary); }
.btn-secondary:hover { background: var(--color-primary-50); }
.btn-secondary:focus-visible,
.btn-secondary:active { background: var(--gradient-button); color: #fff; box-shadow: var(--shadow-focus); }
.btn-secondary:disabled { color: var(--color-primary-200); border-color: var(--color-primary-200); background: transparent; cursor: not-allowed; }

/* On-blue (hero/header) */
.btn-white { background: #fff; color: var(--color-primary); box-shadow: var(--shadow-2); }
.btn-ghost-white { background: transparent; color: #fff; border-color: rgba(255,255,255,.5); }
```

### 14.3 Tailwind config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#363EE8', 50: '#EEF0FF', 200: '#C8D1FF', 700: '#191FA8', 900: '#040E6B', accent: '#000CFF' },
        neutral: { 900: '#101E29', 800: '#28343D', 600: '#515F69', 400: '#94A3B8', 200: '#E2E8F0' },
        page: '#F1F5F9',
        success: { 100: '#DCFCE7', 300: '#7ECBA1', 500: '#16A85A', 700: '#0F7A40' },
        warning: { 100: '#FCE8C8', 300: '#F0B478', 500: '#E8821A', 700: '#A8590A' },
        error:   { 100: '#FDE2E2', 300: '#EF9A9A', 500: '#E05252', 700: '#B42323' },
      },
      borderRadius: { sm: '6px', md: '8px', lg: '12px', xl: '16px' },
      boxShadow: {
        focus: '0 4px 14px rgba(54,62,232,.40)',
        card: '0 1px 2px rgba(16,30,41,.06), 0 1px 3px rgba(16,30,41,.08)',
      },
      backgroundImage: {
        hero: 'linear-gradient(180deg, #363EE8 0%, #040E6B 100%)',
        soft: 'linear-gradient(135deg, #C8D1FF 0%, #363EE8 100%)',
      },
    },
  },
};
```

---

## 15. Do & Don't

| ✅ Do | ❌ Don't |
|---|---|
| Use Poppins for **all** text | Introduce Inter, Roboto, Arial, etc. |
| Use pill buttons in the three defined sizes | Create custom button heights/radii per page |
| Use `#040E6B` for headings, `#28343D` for body | Use pure black `#000000` for text |
| Use `#F1F5F9` page bg with white cards | Use random grays or colored page backgrounds |
| Use the status map in §10 | Invent new status colors or reuse red/green decoratively |
| Keep one primary button per section | Put two filled primary buttons side by side |
| Use Lucide outline icons at 1.75px stroke | Mix filled and outline icons or multiple icon libraries |
| Reuse the table toolbar and pagination patterns | Re-style search/sort/pagination per module |
| Show KPI: icon chip + title + value | Add gradients, shadows, or clashing colors to KPI cards |
| Keep brand patterns in heroes/auth/empty states | Put patterns behind dense data |
| Use straight-edged angular polygons in hero backgrounds (§7.1) | Use circles, arcs, blobs or rounded hero corners |
| Keep the same top navigation bar and lockup in every portal (§8.2) | Restyle the header, logo lockup or Logout per portal |
| Keep the Logout label and icon white | Let a global text color turn the Logout label dark |

---

## 16. PR Consistency Checklist

Before merging any UI change, confirm:

- [ ] Only Poppins is used; type styles come from the scale in §4.
- [ ] Colors come from tokens (no hard-coded hex outside the token file).
- [ ] Buttons use `.btn` + size + variant; states (default/hover/focus/disabled) all work.
- [ ] Inputs, selects, and toolbars match §9.3–9.4; focus ring is visible.
- [ ] Tables follow §9.5; pagination follows §9.6.
- [ ] Status/category badges follow the map in §10.
- [ ] KPI cards follow §9.7 (icon chip + title + value).
- [ ] Icons are from the approved set, correct size and stroke.
- [ ] Spacing uses the 4px scale; radii use the tokens.
- [ ] Contrast and keyboard navigation are checked.
- [ ] The top bar follows §8.2, and the Logout label and icon render **white** (check the rendered color, not just the code).
- [ ] Verified at mobile, tablet, and desktop widths.
- [ ] Works identically across Public, Employee, and HR/Admin portals.

---

## 17. Open Items / Known Inconsistencies

These were found while compiling this guide and should be resolved by the design owner:

1. **White hex typo** in the original brief (`#FFFFF`). This guide uses `#FFFFFF`.
2. **Duplicate neutral** (`#28343D` listed twice). This guide defines the neutral scale as `#101E29 / #28343D / #515F69` plus proposed `#94A3B8` and `#E2E8F0`.
3. **Small Secondary button height** shown as 45px in the kit; treated as a typo for **36px**.
4. **Status color hexes** (green/orange/red 100/300/500) were sampled visually from the reference image and the `700` text shades are proposed for accessibility. Confirm against the source design file.
5. **Primary button color** in the kit appears slightly more violet than `#363EE8`. This guide standardizes on `#363EE8` → `#191FA8` for the gradient. Update tokens if the design file uses a different value.
6. **KPI card reference** was described but no image was attached; §9.7 follows the description (small icon + KPI title). Adjust if the source mock differs.
7. **Logo file** is referenced as `USWAG (3)`. Add the final SVG to the repo (e.g. `/assets/brand/abyan-logo.svg`) and reference that path here.
8. **Legacy global text color.** `src/styles/globals.css` sets `color: var(--text-primary)` directly on `span, p, label, button, a` and headings, so they ignore their parent's color. This is why Logout labels rendered dark on the blue header. It is patched per component for now: explicit white on header labels, and a text-inherit reset inside `.abyan-ds`. Remove the global rule once every portal uses the token file.
9. **Admin header lockup.** `AdminHeader` still stacks "ABYAN" above the system name. Move it to the single-line lockup in §8.2.

---

*Maintained by the ABYAN development team. Propose changes through a pull request that updates this guide and the token file together.*
