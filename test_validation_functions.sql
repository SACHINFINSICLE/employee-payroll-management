-- Test if validation functions exist and work correctly
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name IN ('can_hr_lock_employee', 'can_finance_lock_employee')
  AND routine_schema = 'public';

-- Expected: Should return 2 rows if functions exist
-- If no rows returned, you need to run add_employee_validation_for_locks.sql

-- 2. Check payroll_lock_requirements table
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
ORDER BY field_name;

-- Expected: Should show all required fields with their settings

-- 3. Test validation on a specific employee (replace with your employee ID)
-- SELECT * FROM can_hr_lock_employee('YOUR-EMPLOYEE-UUID-HERE');
-- SELECT * FROM can_finance_lock_employee('YOUR-EMPLOYEE-UUID-HERE');

-- 4. Check employee table structure to verify column names
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND table_schema = 'public'
ORDER BY ordinal_position;
