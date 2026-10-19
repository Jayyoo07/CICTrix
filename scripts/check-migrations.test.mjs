import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkMigrations } from './check-migrations.mjs';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');

describe('checkMigrations', () => {
  it('passes on the repo migrations', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(checkMigrations(files)).toEqual([]);
  });

  it('passes on unique 14-digit versions', () => {
    expect(checkMigrations(['20261101000000_a.sql', '20261101000001_b.sql'])).toEqual([]);
  });

  it('fails on a duplicate version', () => {
    const errors = checkMigrations(['20261101000000_a.sql', '20261101000000_b.sql']);
    expect(errors).toEqual([expect.stringContaining('duplicate version 20261101000000')]);
  });

  it('fails when an 8-digit version prefixes a longer one', () => {
    const errors = checkMigrations(['20261020_a.sql', '20261020120000_b.sql'], new Set(['20261020']));
    expect(errors).toEqual([expect.stringContaining('version 20261020 (20261020_a.sql) is a prefix of 20261020120000')]);
  });

  it('fails on a new version that is not 14 digits', () => {
    const errors = checkMigrations(['20261101_a.sql'], new Set());
    expect(errors).toEqual([expect.stringContaining('version 20261101 must be 14 digits')]);
  });

  it('allows a grandfathered 8-digit version', () => {
    expect(checkMigrations(['20261013_salary_grades.sql'])).toEqual([]);
  });

  it('fails on a name without a version', () => {
    expect(checkMigrations(['salary_grades.sql'])).toEqual([expect.stringContaining('must start with')]);
  });
});
