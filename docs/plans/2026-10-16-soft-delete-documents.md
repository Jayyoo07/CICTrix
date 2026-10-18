---
title: Hide documents of soft-deleted applicants and employees
date: 2026-10-16
status: Done
summary: Extend the 2026-10-15 soft delete so attachment rows and private storage files belonging to soft-deleted applicants and employees are hidden from the app, with no rows or files removed.
---

## Goal

After the 2026-10-15 soft delete, documents of hidden applicants and employees are still readable by the app's anon/authenticated roles:

| What | Total | Belongs to a hidden parent |
|---|---|---|
| `applicant_attachments` rows | 1,093 | 1,093 |
| `applicant-attachments` files (private bucket) | 694 | 512 (via `file_path`); 182 have no row |
| `employee_documents` rows | 26 | 24 |
| `employee-documents` files (public bucket) | 5 | 3 |

Hide them the same way: nothing removed, restoring the parent restores the documents.

## Approach

Restrictive RLS policies keyed on the parent's `deleted_at`, so restore stays a single `update … set deleted_at = null` on the parent.

1. **`applicant_attachments`** (RLS already on): restrictive `for select` policy, `exists (select 1 from applicants a where a.id = applicant_id and a.deleted_at is null)`. Inserts are untouched, so the wizard's upload flow keeps working.
2. **`employee_documents`** (RLS off): enable RLS with an allow-all `employee_documents_open_access` policy (same pattern as yesterday), plus a restrictive `for select` policy: `employee_id is null or exists (live employee)`. The 2 rows not tied to a hidden employee stay visible.
3. **`applicant-attachments` storage** (private; the app uses signed URLs, which need SELECT on `storage.objects`): restrictive `for select` policy on `storage.objects`, scoped to that bucket: hide an object when an attachment row points to it and that row's applicant is soft-deleted. Other buckets and new uploads are unaffected. *Changed during build:* `storage.objects` is owned by `supabase_storage_admin`, so `postgres` can't create policies on it from SQL. The migration ships only the `security definer` lookup function; the existing "Allow public read attachments" policy is edited in the dashboard (Storage > Policies) to add `and not public.applicant_file_is_soft_deleted(name)`.
4. **`employee-documents` storage** (public bucket): no storage change. Public URLs bypass RLS, so hiding here comes from step 2. The app has no link to show once the row is hidden. Anyone who already copied one of the 3 URLs could still open the file.

Not in scope: the 182 unlinked applicant files (unreachable from the app; hiding them risks blocking new uploads, which upload before their row exists) and `application_documents` (12 rows whose parent `promotional_applications` is empty).

## Steps

1. Migration `supabase/migrations/20261016_soft_delete_documents.sql` with the four policy changes above.
2. You run it in the Supabase SQL editor (the MCP auto-declines writes) and confirm the warning dialog.
3. Verify as anon, then commit on a new branch `chore/soft-delete-documents`.

## Risks

- `storage.objects` policies affect every bucket; the restrictive policy is written `bucket_id <> 'applicant-attachments' or …` so other buckets are untouched.
- Restrictive SELECT on `employee_documents` also limits `update … returning`/`.select()` after writes to rows of live employees, which is the intended scope.
- Public employee-document URLs stay reachable to anyone who already has them (see step 4 of Approach).

## Checks to run

- As anon: `applicant_attachments` 0 visible, `employee_documents` 2 visible, `storage.objects` in `applicant-attachments` shows 182 (unlinked only), 0 of the 512 linked files.
- As postgres: all 1,093 + 26 rows and 699 files still present.
- Restoring one applicant (in a rolled-back transaction) makes its attachments visible again.
