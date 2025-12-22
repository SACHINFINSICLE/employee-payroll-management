-- Test the validation functions now that requirements are fixed

-- =============================================
-- TEST 1: Check an incomplete employee
-- =============================================

-- First, let's see what employees exist and their data
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
LIMIT 5;

-- =============================================
-- TEST 2: Test HR validation on a specific employee
-- =============================================

-- Replace 'c5af2125-5e3e-4286-a1a7-9523bbff4371' with an actual employee UUID from above
SELECT * FROM can_hr_lock_employee('c5af2125-5e3e-4286-a1a7-9523bbff4371');

-- Expected result for incomplete employee:
-- can_lock: false
-- missing_fields: ["Department", "Designation", etc.]

-- =============================================
-- TEST 3: Test Finance validation
-- =============================================

SELECT * FROM can_finance_lock_employee('c5af2125-5e3e-4286-a1a7-9523bbff4371');

-- Expected result:
-- can_lock: false
-- missing_fields: ["Bank Name", "Bank Account Number", "Bank IFSC Code"]

-- =============================================
-- TEST 4: Check what fields are actually NULL for this employee
-- =============================================

SELECT 
  CASE WHEN employee_id IS NULL OR employee_id = '' THEN 'Missing Employee ID' END,
  CASE WHEN employee_name IS NULL OR employee_name = '' THEN 'Missing Employee Name' END,
  CASE WHEN department IS NULL OR department = '' THEN 'Missing Department' END,
  CASE WHEN designation IS NULL OR designation = '' THEN 'Missing Designation' END,
  CASE WHEN employment_status IS NULL THEN 'Missing Employment Status' END,
  CASE WHEN joining_date IS NULL THEN 'Missing Joining Date' END,
  CASE WHEN current_salary IS NULL OR current_salary <= 0 THEN 'Missing Current Salary' END,
  CASE WHEN pf_applicable IS NULL THEN 'Missing PF Applicable' END,
  CASE WHEN esi_applicable IS NULL THEN 'Missing ESI Applicable' END,
  CASE WHEN bank_name IS NULL OR bank_name = '' THEN 'Missing Bank Name' END,
  CASE WHEN bank_account_number IS NULL OR bank_account_number = '' THEN 'Missing Bank Account Number' END,
  CASE WHEN bank_ifsc_code IS NULL OR bank_ifsc_code = '' THEN 'Missing Bank IFSC Code' END
FROM employees
WHERE id = 'c5af2125-5e3e-4286-a1a7-9523bbff4371';
