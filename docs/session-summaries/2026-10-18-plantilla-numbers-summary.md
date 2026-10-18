# Plantilla numbers entered as numbers: summary

Plan: [2026-10-18-plantilla-numbers.md](../plans/2026-10-18-plantilla-numbers.md). Mockup: [2026-10-18-plantilla-numbers.html](../mockups/2026-10-18-plantilla-numbers.html) (option A).

## Shipped vs. planned

All plan decisions (D1–D5) shipped in `7902339`:

- Each plantilla row in the Create/Edit Position form has a fixed "Plantilla No." prefix and a digits-only input; typing 21 stores "Plantilla 21". Non-digits and leading zeros are dropped (021 → 21, 1x3 → 13).
- New rows, including the first row of a new posting, start empty; `suggestPlantillaLabel` is removed.
- Rows with an older free-text name keep it until a number is typed, with a "Currently named …" hint.
- Saving with an empty row fails with "Enter a plantilla number for row N."; uniqueness and the Reference No. guard still come from `validatePlantillaLabels`.
- New helpers `plantillaNumberOf` and `plantillaLabelForNumber` in `src/lib/plantillaRules.ts`.

## Deviations

- None.

## Checks

- `npx tsc --noEmit`: clean.
- `npm test`: 33 files, 323 tests pass, including 2 new tests in `plantillaRules.test.ts`.
- `npm run build`: passes.
- Local check in Create New Job Position (not submitted): rows start empty with the "Plantilla No." prefix and "e.g., 21" placeholder; typing 021 showed 21 and 1x3 showed 13; the second row added empty. The empty-row save message was not triggered on screen, to avoid writing to the live database.
- Deploy: pushed `main` (`7902339`). About 195s later cic-trix.vercel.app (`index-BNYOOo1C.js`) and cictrix-hr-demo.vercel.app (`index-B8AxNxu0.js`) both served the new form.
