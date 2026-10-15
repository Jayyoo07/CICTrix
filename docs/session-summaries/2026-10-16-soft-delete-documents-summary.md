# Hide documents of soft-deleted records: summary

Plan: [2026-10-16-soft-delete-documents](../plans/2026-10-16-soft-delete-documents.md)

## Shipped

- Migration `20261016_soft_delete_documents.sql`: restrictive SELECT policy on `applicant_attachments`; RLS on `employee_documents` with an allow-all policy plus a restrictive SELECT policy; `security definer` function `applicant_file_is_soft_deleted(text)`.
- Storage: the existing "Allow public read attachments" policy on `storage.objects` was edited in the dashboard to `bucket_id = 'applicant-attachments' and not public.applicant_file_is_soft_deleted(name)`.
- Nothing removed: 1,093 attachment rows, 26 employee documents and 699 files remain.

## Deviations

- `storage.objects` is owned by `supabase_storage_admin`; `postgres` can't create policies on it, which rolled back the first two runs of the migration. The storage rule moved to a dashboard edit of the existing policy instead of a new restrictive policy.
- The migration was applied in two blocks in the SQL editor, since the MCP auto-declines writes.
- Expected 2 `employee_documents` rows to stay visible; they are hidden because their `employee_id` points to no employee.

## Checks run

- As anon: `applicant_attachments` 0 (was 1,093), `employee_documents` 0 (was 26), `applicant-attachments` files 182 (was 694; the 182 have no attachment row), `positions` 22 unchanged.
- As postgres: all rows and files still present.

## Not verified / known gaps

- Restore path not exercised (the MCP can't run the write).
- `employee-documents` is a public bucket: its 5 files still open from a copied URL. The app no longer shows the links.
- In-app check not done (the local `.env` anon key is disabled).
