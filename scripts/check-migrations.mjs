/**
 * Fail when supabase/migrations has version drift the Supabase CLI can't handle.
 *
 * Why this exists: the Supabase Preview check (which applies migrations to prod
 * on merge to main) failed for months because files shared 8-digit versions and
 * a 14-digit version started with an existing 8-digit one, so the CLI paired
 * local files with remote versions in the wrong order. PRs #14–#17 repaired it.
 *
 * The version is the digits before the first `_`. Rules:
 *   1. No two files share a version.
 *   2. No version is a prefix of another (e.g. 20261020 and 20261020120000).
 *   3. Every version is 14 digits (YYYYMMDDHHMMSS), except the 8-digit
 *      versions already on main, listed below. Never add to that list.
 *
 * Usage: node scripts/check-migrations.mjs   (or npm run check:migrations)
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');
const VERSION_LENGTH = 14;

// 8-digit versions that predate the 14-digit rule. Removing one is fine; adding one is not.
export const GRANDFATHERED_VERSIONS = new Set([
  '20260509', '20260510', '20260520', '20260703', '20260705', '20260707', '20260709', '20260710',
  '20260711', '20260712', '20260713', '20260714', '20260715', '20260716', '20260717', '20260718',
  '20260720', '20260721', '20260722', '20260723', '20260724', '20260725', '20260727', '20260728',
  '20260732', '20260801', '20260802', '20260803', '20260804', '20260805', '20260809', '20260814',
  '20260815', '20260816', '20260817', '20260818', '20260828', '20260829', '20260830', '20260921',
  '20260924', '20260925', '20260926', '20260927', '20260928', '20260929', '20260930', '20261001',
  '20261003', '20261013', '20261014', '20261015', '20261016', '20261020',
]);

/** Returns one message per problem; an empty array means the set is clean. */
export function checkMigrations(filenames, grandfathered = GRANDFATHERED_VERSIONS) {
  const errors = [];
  const byVersion = new Map();

  for (const file of filenames) {
    const match = /^(\d+)_/.exec(file);
    if (!match) {
      errors.push(`${file}: name must start with a ${VERSION_LENGTH}-digit version and "_" (use npx supabase migration new <name>)`);
      continue;
    }
    const version = match[1];
    if (version.length !== VERSION_LENGTH && !grandfathered.has(version)) {
      errors.push(`${file}: version ${version} must be ${VERSION_LENGTH} digits (use npx supabase migration new <name>)`);
    }
    byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
  }

  for (const [version, files] of byVersion) {
    if (files.length > 1) errors.push(`duplicate version ${version}: ${files.join(', ')}`);
  }

  const versions = [...byVersion.keys()];
  for (const short of versions) {
    for (const long of versions) {
      if (long.length > short.length && long.startsWith(short)) {
        errors.push(`version ${short} (${byVersion.get(short).join(', ')}) is a prefix of ${long} (${byVersion.get(long).join(', ')}); the Supabase CLI orders them wrongly`);
      }
    }
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const errors = checkMigrations(files);
  if (errors.length) {
    console.error(`supabase/migrations has ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`supabase/migrations OK (${files.length} files)`);
}
