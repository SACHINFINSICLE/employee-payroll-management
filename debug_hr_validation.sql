-- Debug HR validation to see why it might not be working

-- =============================================
-- 1. Check if validation function exists and works
-- =============================================

-- Test with a known employee UUID (replace with yours)
SELECT * FROM can_hr_lock_employee('c5af2125-5e3e-4286-a1a7-9523bbff4371');

-- =============================================
-- 2. Check what HR requirements are configured
-- =============================================

SELECT 
  field_name,
  display_name
FROM payroll_lock_requirements
WHERE required_for_hr_lock = true
ORDER BY field_name;

-- Should return 9 fields:
-- current_salary, department, designation, employee_id, employee_name, 
-- employment_status, esi_applicable, joining_date, pf_applicable

-- =============================================
-- 3. Check actual employee data
-- =============================================

SELECT 
  id,
  employee_id,
  employee_name,
  department,
  designation,
  employment_status,
  joining_date,
  current_salary,
  pf_applicable,
  esi_applicable
FROM employees
WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371';

-- =============================================
-- 4. Manual validation check
-- =============================================

-- This will show exactly which fields are NULL/empty
SELECT 
  'employee_id' as field,
  CASE 
    WHEN employee_id IS NULL OR employee_id = '' THEN 'MISSING' 
    ELSE 'OK: ' || employee_id 
  END as status
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'employee_name',
  CASE 
    WHEN employee_name IS NULL OR employee_name = '' THEN 'MISSING' 
    ELSE 'OK: ' || employee_name 
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'department',
  CASE 
    WHEN department IS NULL OR department = '' THEN 'MISSING' 
    ELSE 'OK: ' || department 
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'designation',
  CASE 
    WHEN designation IS NULL OR designation = '' THEN 'MISSING' 
    ELSE 'OK: ' || designation 
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'employment_status',
  CASE 
    WHEN employment_status IS NULL THEN 'MISSING' 
    ELSE 'OK: ' || CAST(employment_status AS TEXT)
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'joining_date',
  CASE 
    WHEN joining_date IS NULL THEN 'MISSING' 
    ELSE 'OK: ' || CAST(joining_date AS TEXT)
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'current_salary',
  CASE 
    WHEN current_salary IS NULL OR current_salary <= 0 THEN 'MISSING' 
    ELSE 'OK: ' || CAST(current_salary AS TEXT)
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'pf_applicable',
  CASE 
    WHEN pf_applicable IS NULL THEN 'MISSING' 
    ELSE 'OK: ' || CAST(pf_applicable AS TEXT)
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371'
UNION ALL
SELECT 
  'esi_applicable',
  CASE 
    WHEN esi_applicable IS NULL THEN 'MISSING' 
    ELSE 'OK: ' || CAST(esi_applicable AS TEXT)
  END
FROM employees WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371';
