---
title: Remove Seeded Department Heads and Reset Office Leadership
date: 2026-10-20
status: Done
summary: Permanently delete the 5 seeded Department Head records, credentials, and access from the database while preserving all Department Head features and setting offices to Unassigned.
---

## Goal

Completely remove the 5 seeded Department Head accounts, records, credentials, and access from the database while preserving all Department Head features, office structures, and assignment capabilities.

## Approach

| # | Decision |
|---|---|
| D1 | Identify the 5 seeded department heads: Ricardo Villanueva (IT), Teresita Almazan (City Accountant), Ramon Macapagal (City Health Officer), Amelia Katigbak (Legal), and Vicente Lazaro (City Engineer). |
| D2 | Nullify `departments.head_employee_id` for the 5 active offices so they remain active with headcount intact, rendering the official "Unassigned" status badge. |
| D3 | Delete their `office_role_assignments` rows and `employee_portal_accounts` rows, removing their system login credentials and leadership access. |
| D4 | Clean up child links in `ipcr_designated_approvers`, `employee_password_resets`, and delete the 5 rows from `employees`. |
| D5 | Preserve all Department Head role definitions, assignment modals, and office portal features so new heads can be appointed anytime. |

## Steps

1. Create database migration `supabase/migrations/20261020_remove_seeded_department_heads.sql`.
2. Apply the migration against the database in a clean transaction.
3. Validate database rows are deleted and office heads are nullified.
4. Verify the Office Directory displays "Unassigned" and Super Admin can assign replacements.
