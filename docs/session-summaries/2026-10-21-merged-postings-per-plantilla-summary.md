# One posting per title per office — summary

Plan: `docs/plans/2026-10-21-merged-postings-per-plantilla.md`

## Shipped vs planned

- Migration `20261021100000_merge_postings_per_plantilla.sql` as planned (D1–D5), with two changes below.
- `PlantillaSlot` reads `division`, `summary`, `responsibilities`.
- Details page: when any plantilla has its own text, the existing Position summary and Responsibilities blocks list each plantilla under "Plantilla N · Division"; otherwise they render the posting's text as before.
- Vacancies cards and table: the existing title cell gets "N plantillas · M open", or the single plantilla's label.

## Deviations

- Merged-away postings are soft-deleted (`deleted_at`, 20261015) instead of deleted, so a merge can be undone.
- Two merged postings that both still had the default label "Plantilla 1" would collide on the per-posting label index; the later one is renamed "Plantilla 1 (duplicate 2)" and the report flags it (`needs_rename`) for RSP to fix in Edit Posting.
- Added: GSO postings carried their text in `description`; the migration copies it to `summary`, which the portal shows.

## Checks

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 41 files, 378 tests pass, including a new case for per-plantilla summary and duties.
- `npm run build`: succeeds.
- Migration run twice on PGlite (Postgres 16) against a schema copy with sample data: three Nurse II postings merged into one Open posting with plantillas 48/49/51 and their own text, an applicant repointed to the survivor, same title in different offices left alone, default-label clash suffixed, second run a no-op.
- Not run against the live Supabase database; not pushed.
