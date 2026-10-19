---
title: Repair Supabase migration history so the Supabase Preview check passes
date: 2026-10-20
status: In Progress
summary: The remote migration log has 6 versions that match no local file, and none of the repo's 97 files is logged (42 shared a version with another file). Rename the duplicates, then rewrite the log to say all 97 are applied, so the GitHub integration finds nothing to run on prod. 10 files never fully ran on prod; they get fixed in a separate, reviewed PR.
---

# Repair Supabase migration history

## Goal

The "Supabase Preview" check on `dehandenver/CICTrix` passes on the next merge to `main`, without the GitHub integration running any migration against production (`fyzdfgxaaowjzbjpwrii`).

## Findings (read-only, 2026-10-20)

**The check runs against production.** `list_branches` shows one branch, `main`, with `parent_project_ref = fyzdfgxaaowjzbjpwrii` (production itself), status `MIGRATIONS_FAILED` since 2026-05-11. The check on upstream `main` fails with "Remote migration versions not found in local migrations directory." The fork `Jayyoo07/CICTrix` has no check runs, so only upstream is connected. The app's `.env` points at the same project.

**Remote-only versions (6).** None has a local file with the same version. The log names show they were applied by MCP or the dashboard, which stamps its own timestamp as the version.

| Remote version | Remote name | Closest local file |
|---|---|---|
| 20260506153115 | create_pm_lnd_reports_table | (none; 20260509 alters it) |
| 20260517165706 | 20260518_lnd_training_tables | 20260518_lnd_training_tables.sql |
| 20260518124653 | 20260518210000_create_employees_with_department_view | 20260518210000_create_employees_with_department_view.sql |
| 20260518145849 | add_personal_details_finalized_to_employees | (none) |
| 20260519160129 | 008_enable_rls_employees | (none) |
| 20260520020945 | 20260520_allow_employee_ipcr_writes | 20260520_allow_employee_ipcr_writes.sql |

**Local-only versions: all 97 files on upstream `main`.** Nothing after 2026-05-20 is logged; it was applied as raw SQL in the dashboard, which writes no log row.

**Duplicate local versions.** The CLI takes the digits before the first `_` as the version, and `version` is the log's primary key. 42 files shared 18 versions.

**10 files never fully ran on prod.** A read-only check of every table, view, index, function and added column the files create (404 objects; policies and triggers not checked) found these missing:

| File | Missing on prod |
|---|---|
| 20260510_create_employees_table | 2 indexes |
| 20260703_promotional_applications | `promotional_application_docs`, `promotional_decisions` |
| 20260707_create_employee_password_resets | everything |
| 20260726000001_ipcr_demo_cycle_state | everything (`cold_storage_vault`, 2 `demo_settings` columns) |
| 20260808000001_training_plan_publication | everything (table + 3 functions) |
| 20260816_training_competencies | 3 indexes |
| 20260923000002_pds_cs_form_212_pages_2to4 | everything (3 tables, columns, indexes) |
| 20260928_plantilla_labels_one_application_per_plantilla | everything; `supabase/rollbacks/` has a rollback for it, so it may have been undone on purpose |
| 20261001_ipcr_remarks_column | `success_indicator_ratings.remarks` |
| 20261018000000_applicant_document_events | everything |

## Decision

Mark all 97 applied (user approved, 2026-10-20). Leaving the 10 pending would make the next merge run them on prod unreviewed. `20260510` starts with `DROP TABLE IF EXISTS employees CASCADE`, and `20260928` may fail on existing data or reverse a deliberate rollback. The gaps are no worse after the repair than before it; they are fixed in a separate PR.

## Steps

### Step 1. Rename duplicate-version files (done, `8addcc7`)

Branch `chore/migration-unique-versions`, off upstream `main`. 42 files renamed to `YYYYMMDD0000NN_`, keeping their alphabetical order within each day:

```
20260518_lnd_training_tables.sql -> 20260518000000_lnd_training_tables.sql
20260518_pm_performance_evaluations_and_competencies.sql -> 20260518000001_pm_performance_evaluations_and_competencies.sql
20260630_backfill_doc_validated.sql -> 20260630000000_backfill_doc_validated.sql
20260630_enable_realtime_applicant_attachments.sql -> 20260630000001_enable_realtime_applicant_attachments.sql
20260630_enable_realtime_applicants.sql -> 20260630000002_enable_realtime_applicants.sql
20260630_replica_identity_full.sql -> 20260630000003_replica_identity_full.sql
20260708_disqualification_sync.sql -> 20260708000000_disqualification_sync.sql
20260708_pm_competency_positions.sql -> 20260708000001_pm_competency_positions.sql
20260719_competency_display_access.sql -> 20260719000000_competency_display_access.sql
20260719_ipcr_phase2_close.sql -> 20260719000001_ipcr_phase2_close.sql
20260726_competency_map_source_column.sql -> 20260726000000_competency_map_source_column.sql
20260726_ipcr_demo_cycle_state.sql -> 20260726000001_ipcr_demo_cycle_state.sql
20260729_enable_realtime_ipcr.sql -> 20260729000000_enable_realtime_ipcr.sql
20260729_training_lifecycle.sql -> 20260729000001_training_lifecycle.sql
20260730_phased_ipcr_workflow.sql -> 20260730000000_phased_ipcr_workflow.sql
20260730_training_office_view.sql -> 20260730000001_training_office_view.sql
20260731_disable_rls_ipcr_notifications.sql -> 20260731000000_disable_rls_ipcr_notifications.sql
20260731_training_attendance_days.sql -> 20260731000001_training_attendance_days.sql
20260806_ipcr_competency_matches_anon_open.sql -> 20260806000000_ipcr_competency_matches_anon_open.sql
20260806_reassign_jean_pierre.sql -> 20260806000001_reassign_jean_pierre.sql
20260807_competency_assessment.sql -> 20260807000000_competency_assessment.sql
20260807_competency_assessment_consolidated.sql -> 20260807000001_competency_assessment_consolidated.sql
20260807_training_attendance_am_pm.sql -> 20260807000002_training_attendance_am_pm.sql
20260808_disable_rls_employees.sql -> 20260808000000_disable_rls_employees.sql
20260808_training_plan_publication.sql -> 20260808000001_training_plan_publication.sql
20260810_clear_critical_position_junk_quals.sql -> 20260810000000_clear_critical_position_junk_quals.sql
20260810_office_level_training_requests.sql -> 20260810000001_office_level_training_requests.sql
20260811_phase2_rating_approval.sql -> 20260811000000_phase2_rating_approval.sql
20260811_seminar_enrollment_pipeline.sql -> 20260811000001_seminar_enrollment_pipeline.sql
20260812_applicant_education_degree.sql -> 20260812000000_applicant_education_degree.sql
20260812_roster_publish_state.sql -> 20260812000001_roster_publish_state.sql
20260813_five_active_offices_enforcement.sql -> 20260813000000_five_active_offices_enforcement.sql
20260813_training_recommendations_anon_open.sql -> 20260813000001_training_recommendations_anon_open.sql
20260922_idp_form_config.sql -> 20260922000000_idp_form_config.sql
20260922_pds_cs_form_212_page1.sql -> 20260922000001_pds_cs_form_212_page1.sql
20260922_plantilla_slots.sql -> 20260922000002_plantilla_slots.sql
20260923_application_reference_no.sql -> 20260923000000_application_reference_no.sql
20260923_idp_submissions.sql -> 20260923000001_idp_submissions.sql
20260923_pds_cs_form_212_pages_2to4.sql -> 20260923000002_pds_cs_form_212_pages_2to4.sql
20260923_user_roles_table.sql -> 20260923000003_user_roles_table.sql
20261018_applicant_document_events.sql -> 20261018000000_applicant_document_events.sql
20261018_fix_is_super_admin.sql -> 20261018000001_fix_is_super_admin.sql
```

### Step 2. Rewrite the remote log (user runs in the dashboard)

Run in the Supabase dashboard SQL editor for `fyzdfgxaaowjzbjpwrii`. It touches only `supabase_migrations.schema_migrations`. The final `select` should return 97.

```sql
begin;

-- 1. Remote-only versions with no local file (same as 'migration repair --status reverted').
delete from supabase_migrations.schema_migrations
where version in ('20260506153115','20260517165706','20260518124653','20260518145849','20260519160129','20260520020945');

-- 2. Every local file (same as 'migration repair --status applied').
insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('20260509', 'pm_lnd_reports_jsonb_and_status', '{}'),
  ('20260510', 'create_employees_table', '{}'),
  ('20260518000000', 'lnd_training_tables', '{}'),
  ('20260518000001', 'pm_performance_evaluations_and_competencies', '{}'),
  ('20260518210000', 'create_employees_with_department_view', '{}'),
  ('20260520', 'allow_employee_ipcr_writes', '{}'),
  ('20260630000000', 'backfill_doc_validated', '{}'),
  ('20260630000001', 'enable_realtime_applicant_attachments', '{}'),
  ('20260630000002', 'enable_realtime_applicants', '{}'),
  ('20260630000003', 'replica_identity_full', '{}'),
  ('20260703', 'promotional_applications', '{}'),
  ('20260705', 'lnd_seed_schema_extensions', '{}'),
  ('20260707', 'create_employee_password_resets', '{}'),
  ('20260708000000', 'disqualification_sync', '{}'),
  ('20260708000001', 'pm_competency_positions', '{}'),
  ('20260709', 'lnd_training_calendar', '{}'),
  ('20260710', 'lnd_training_pipeline', '{}'),
  ('20260711', 'draft_target_department_fk', '{}'),
  ('20260712', 'lnd_training_plan', '{}'),
  ('20260713', 'office_role_assignments_rls', '{}'),
  ('20260714', 'ipcr_target_setting', '{}'),
  ('20260715', 'ipcr_phase1_workflow_phase2', '{}'),
  ('20260716', 'ipcr_designated_approvers', '{}'),
  ('20260717', 'performance_cycles_anon_read', '{}'),
  ('20260718', 'ipcr_phase2_gating', '{}'),
  ('20260719000000', 'competency_display_access', '{}'),
  ('20260719000001', 'ipcr_phase2_close', '{}'),
  ('20260720', 'succession_planning', '{}'),
  ('20260721', 'ipcr_competency_matches', '{}'),
  ('20260722', 'training_calendar_anon_open', '{}'),
  ('20260723', 'training_requests_anon_open', '{}'),
  ('20260724', 'ipcr_training_recommendations', '{}'),
  ('20260725', 'ipcr_demo_workflow', '{}'),
  ('20260726000000', 'competency_map_source_column', '{}'),
  ('20260726000001', 'ipcr_demo_cycle_state', '{}'),
  ('20260727', 'training_plan_entries_anon_open', '{}'),
  ('20260728', 'training_evaluations', '{}'),
  ('20260729000000', 'enable_realtime_ipcr', '{}'),
  ('20260729000001', 'training_lifecycle', '{}'),
  ('20260730000000', 'phased_ipcr_workflow', '{}'),
  ('20260730000001', 'training_office_view', '{}'),
  ('20260731000000', 'disable_rls_ipcr_notifications', '{}'),
  ('20260731000001', 'training_attendance_days', '{}'),
  ('20260732', 'realtime_mfos_success_indicators', '{}'),
  ('20260801', 'training_recommendation_pipeline', '{}'),
  ('20260802', 'backfill_july_rosters', '{}'),
  ('20260803', 'five_office_org_restructure', '{}'),
  ('20260804', 'dept_head_credentials', '{}'),
  ('20260805', 'dept_head_portal_logins', '{}'),
  ('20260806000000', 'ipcr_competency_matches_anon_open', '{}'),
  ('20260806000001', 'reassign_jean_pierre', '{}'),
  ('20260807000000', 'competency_assessment', '{}'),
  ('20260807000001', 'competency_assessment_consolidated', '{}'),
  ('20260807000002', 'training_attendance_am_pm', '{}'),
  ('20260808000000', 'disable_rls_employees', '{}'),
  ('20260808000001', 'training_plan_publication', '{}'),
  ('20260809', 'critical_position_requirements', '{}'),
  ('20260810000000', 'clear_critical_position_junk_quals', '{}'),
  ('20260810000001', 'office_level_training_requests', '{}'),
  ('20260811000000', 'phase2_rating_approval', '{}'),
  ('20260811000001', 'seminar_enrollment_pipeline', '{}'),
  ('20260812000000', 'applicant_education_degree', '{}'),
  ('20260812000001', 'roster_publish_state', '{}'),
  ('20260813000000', 'five_active_offices_enforcement', '{}'),
  ('20260813000001', 'training_recommendations_anon_open', '{}'),
  ('20260814', 'fix_employees_with_department_view', '{}'),
  ('20260815', 'fix_lnd_manual_source_and_mock_employees', '{}'),
  ('20260816', 'training_competencies', '{}'),
  ('20260817', 'regularize_all_probationary_employees', '{}'),
  ('20260818', 'succession_training_gate', '{}'),
  ('20260828', 'succession_competency_tags_and_position_fields', '{}'),
  ('20260829', 'semester_transition_state', '{}'),
  ('20260830', 'archive_attendance_and_link', '{}'),
  ('20260921', 'user_roles_grant_authenticated_select', '{}'),
  ('20260922000000', 'idp_form_config', '{}'),
  ('20260922000001', 'pds_cs_form_212_page1', '{}'),
  ('20260922000002', 'plantilla_slots', '{}'),
  ('20260923000000', 'application_reference_no', '{}'),
  ('20260923000001', 'idp_submissions', '{}'),
  ('20260923000002', 'pds_cs_form_212_pages_2to4', '{}'),
  ('20260923000003', 'user_roles_table', '{}'),
  ('20260924', 'srp_position_ranking', '{}'),
  ('20260925', 'phase_schedules_realtime', '{}'),
  ('20260926', 'split_recommended_for_hiring', '{}'),
  ('20260927', 'disqualification_failure_to_attend', '{}'),
  ('20260928', 'plantilla_labels_one_application_per_plantilla', '{}'),
  ('20260929', 'eligibility_types', '{}'),
  ('20260930', 'ipcr_rating_scale', '{}'),
  ('20261001', 'ipcr_remarks_column', '{}'),
  ('20261003', 'evaluations_overall_impression_numeric', '{}'),
  ('20261013', 'salary_grades', '{}'),
  ('20261014', 'backfill_salaries_from_schedule', '{}'),
  ('20261015', 'soft_delete_core_records', '{}'),
  ('20261016', 'soft_delete_documents', '{}'),
  ('20261018000000', 'applicant_document_events', '{}'),
  ('20261018000001', 'fix_is_super_admin', '{}'),
  ('20261020', 'remove_seeded_department_heads', '{}')
on conflict (version) do nothing;

commit;

-- 3. Check: expect 97.
select count(*) from supabase_migrations.schema_migrations;
```

`statements` is left empty: the CLI doesn't compare it.

Rollback: re-insert the 6 deleted rows listed in Findings, and delete the 97.

### Step 3. Push, PR, merge, confirm

Push the branch to `Jayyoo07/CICTrix`, open a PR to `dehandenver/CICTrix` `main`, and merge. Confirm the "Supabase Preview" check on the merge commit is green and `list_branches` no longer shows `MIGRATIONS_FAILED`.

### Step 4 (separate PR). Close the 10 gaps

For each file above, write a new migration (`npx supabase migration new <name>`) with only the missing pieces, written with `if not exists`. Check with the team first whether `20260928` was rolled back deliberately. Review and merge; the integration applies it.

## Going forward

Every database change is a file made with `npx supabase migration new`, merged by PR, and applied by the integration on merge. No SQL in the dashboard and no MCP `apply_migration` for repo files. If a dashboard run is ever unavoidable, insert the matching log row in the same script.

## Risks

- **The log claims 10 files ran that didn't.** Recorded here and in the session summary; Step 4 closes them.
- **Policies and triggers weren't checked.** Some may be missing too; Step 4 should check them per file.
- **Rename conflicts.** Open branches that edit a renamed file will conflict.
- **A merge to `main` between Steps 2 and 3** fails the check harmlessly, before applying anything, because the log then holds versions the old filenames don't match.

## Checks to run

- Before Step 2: `select count(*) from supabase_migrations.schema_migrations` returns 6.
- After Step 2: it returns 97.
- `ls supabase/migrations | sed -E 's/^([0-9]+)_.*/\1/' | sort | uniq -d` prints nothing (verified on the branch).
- After Step 3: the "Supabase Preview" check on the merge commit is `success`.
