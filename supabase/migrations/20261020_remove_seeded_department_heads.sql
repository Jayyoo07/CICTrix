-- ============================================================================
-- Remove seeded Department Heads and reset office leadership to Unassigned.
-- Safe, defensive migration: dynamically checks for optional tables so it
-- succeeds regardless of which previous migrations have been applied.
-- ============================================================================

DO $$
DECLARE
  v_head_ids uuid[];
  v_head_nums text[] := ARRAY['EMP-2026-9001', 'EMP-2026-9012', 'EMP-2026-9023', 'EMP-2026-9034', 'EMP-2026-9045'];
  v_head_emails text[] := ARRAY[
    'ricardo.villanueva@cityhall.gov.ph',
    'teresita.almazan@cityhall.gov.ph',
    'ramon.macapagal@cityhall.gov.ph',
    'amelia.katigbak@cityhall.gov.ph',
    'vicente.lazaro@cityhall.gov.ph'
  ];
  v_head_usernames text[] := ARRAY[
    'ricardo.villanueva',
    'teresita.almazan',
    'ramon.macapagal',
    'amelia.katigbak',
    'vicente.lazaro'
  ];
BEGIN
  -- 1. Collect the employee UUIDs of the 5 department heads
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_head_ids
  FROM employees
  WHERE employee_number = ANY(v_head_nums)
     OR email = ANY(v_head_emails);

  -- 2. Clear head_employee_id in departments (resets to Unassigned)
  IF to_regclass('public.departments') IS NOT NULL THEN
    UPDATE departments
    SET head_employee_id = NULL
    WHERE head_employee_id = ANY(v_head_ids);
  END IF;

  -- 3. Delete office role assignments
  IF to_regclass('public.office_role_assignments') IS NOT NULL THEN
    DELETE FROM office_role_assignments
    WHERE employee_id = ANY(v_head_ids)
       OR account_username = ANY(v_head_usernames);
  END IF;

  -- 4. Delete password reset audit rows (checked dynamically in case table does not exist)
  IF to_regclass('public.employee_password_resets') IS NOT NULL THEN
    EXECUTE 'DELETE FROM employee_password_resets WHERE employee_number = ANY($1)'
    USING v_head_nums;
  END IF;

  -- 5. Delete employee portal accounts
  IF to_regclass('public.employee_portal_accounts') IS NOT NULL THEN
    DELETE FROM employee_portal_accounts
    WHERE username = ANY(v_head_usernames)
       OR employee_id = ANY(v_head_nums)
       OR email = ANY(v_head_emails);
  END IF;

  -- 6. Clean IPCR designated approvers (checked dynamically in case table does not exist)
  IF to_regclass('public.ipcr_designated_approvers') IS NOT NULL THEN
    EXECUTE 'DELETE FROM ipcr_designated_approvers WHERE employee_id = ANY($1)'
    USING v_head_ids;

    EXECUTE 'UPDATE ipcr_designated_approvers SET approver_employee_id = NULL WHERE approver_employee_id = ANY($1)'
    USING v_head_ids;
  END IF;

  -- 7. Delete the 5 employee records from employees
  IF v_head_ids IS NOT NULL AND array_length(v_head_ids, 1) > 0 THEN
    DELETE FROM employees
    WHERE id = ANY(v_head_ids);
  END IF;

  -- 8. Log revocation in audit trail (if table exists)
  IF to_regclass('public.access_change_audit') IS NOT NULL THEN
    INSERT INTO access_change_audit (action, role, details)
    VALUES (
      'revoke',
      'DeptHead',
      'Removed 5 seeded department head accounts (Villanueva, Almazan, Macapagal, Katigbak, Lazaro) and unassigned office leadership.'
    );
  END IF;

  RAISE NOTICE 'Successfully removed the 5 department heads and unassigned leadership.';
END $$;

NOTIFY pgrst, 'reload schema';
