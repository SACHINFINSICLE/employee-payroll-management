-- Debug: Check what fields are required for HR and Finance locks
-- This will show you what the validation is actually checking

-- 1. Check HR lock requirements
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
WHERE required_for_hr_lock = true
ORDER BY field_name;

-- Expected fields for HR:
-- employee_id, full_name, email, department, designation, basic_salary, pf_applicable, esi_applicable

-- 2. Check Finance lock requirements
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
WHERE required_for_finance_lock = true
ORDER BY field_name;

-- Expected fields for Finance:
-- employee_id, full_name, basic_salary, bank_name, account_number, ifsc_code, pf_applicable, esi_applicable

-- 3. Check ALL requirements (to see what exists)
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
ORDER BY field_name;

-- 4. Test validation on a specific employee (replace UUID)
-- Copy an employee UUID from the employees table and test:
-- SELECT * FROM can_hr_lock_employee('PASTE-UUID-HERE');

-- 5. Check actual employee data to see what's missing
-- Replace with your employee UUID
-- SELECT 
--   employee_id,
--   employee_name,
--   email,
--   department,
--   designation,
--   current_salary,
--   pf_applicable,
--   esi_applicable,
--   bank_name,
--   bank_account_number,
--   bank_ifsc_code
-- FROM employees
-- WHERE id = 'PASTE-UUID-HERE';
