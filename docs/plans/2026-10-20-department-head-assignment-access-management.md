---
title: Department Head Assignment & Access Management
date: 2026-10-20
status: Done
summary: Provide Super Admin with Department Head assignment capabilities in System Administration with full supervisory synchronization, central employee alignment, downstream competency protection, duplicate prevention, and in-page subtabs.
---

## Goal

Provide the Super Admin in `/admin/system-admin` with the ability to assign an existing employee as the Department Head of a department, ensuring full supervisory synchronization, central database alignment, downstream module protection, duplicate prevention, clean succession, and single identity access.

## Settled Decisions

| # | Topic | Decision | Details |
|---|---|---|---|
| D1 | UI Navigation | Top In-Page Subtabs (Option A) | Horizontal pill subtabs in `SystemAdministrationPage.tsx`: `[ Office Directory ]` and `[ Access & Role Management ]`. |
| D2 | Incumbent Handling | Duplicate Block & Succession Reroute | `AddPersonnelModal` validates if selected office already has an active head. Blocks duplicate and directs to `RemoveTransferModal`. |
| D3 | Department Sync | Central Employee Update | Synchronize employee's `department`, `current_department`, `position`, `current_position`, and `position_history` in `employees`. |
| D4 | Credentials & Auth | Single Identity via Switcher | No duplicate auth rows. Employee uses existing login; `office_role_assignments` grant unlocks profile switcher to `/office/dashboard`. |
| D5 | Vacancy State | Explicit Nullification (`NULL`) | Setting `departments.head_employee_id = NULL` marks office "Unassigned" in directory. |
| D6 | Job Title Mapping | Official Office Head Titles (Option A2) | Map office head titles via `OFFICE_HEAD_POSITIONS` to preserve competency framework lookups. |

## Approach & Delegation Plan

Per user request ("use 3 gemini 3.8 agents on high for this task"), work is divided into 3 specialized subagents:

1. **Subagent 1 (API & Data Synchronization)**:
   - File: `src/lib/api/officeRoles.ts`
   - Implement `OFFICE_HEAD_POSITIONS` dictionary.
   - Update `createAssignment()` with duplicate check, department head link, employee central fields synchronization, and audit logging.
   - Update `revokeOrTransfer()` with successor update, vacancy nullification, IPCR rerouting, and audit logging.

2. **Subagent 2 (UI Navigation & Modals)**:
   - File: `src/modules/admin/SystemAdministrationPage.tsx`
   - Implement horizontal pill subtab switcher (`Office Directory` / `Access & Role Management`).
   - Enhance `AddPersonnelModal` with incumbent detection, warning callout, and 1-click transition to `RemoveTransferModal`.
   - Update user messaging to clarify single-identity profile switcher access.

3. **Subagent 3 (Verification & Test Suite)**:
   - Add automated test cases covering V1–V7.
   - Execute TypeScript check (`npx tsc --noEmit`) and Vitest (`npm test`).
   - Validate clean compilation and zero regressions.
