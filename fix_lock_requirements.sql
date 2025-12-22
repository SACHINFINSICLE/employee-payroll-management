-- Fix payroll_lock_requirements to only include fields that exist in employees table
-- Remove calculated/payroll fields that don't belong in employee validation

-- =============================================
-- 1. CLEAR EXISTING REQUIREMENTS
-- =============================================

DELETE FROM payroll_lock_requirements;

-- =============================================
-- 2. INSERT CORRECT REQUIREMENTS
-- =============================================

-- Only include fields that actually exist in the employees table
INSERT INTO payroll_lock_requirements (field_name, display_name, required_for_hr_lock, required_for_finance_lock) VALUES
  -- Basic employee info (HR responsibility)
  ('employee_id', 'Employee ID', true, true),
  ('employee_name', 'Employee Name', true, true),
  ('department', 'Department', true, false),
  ('designation', 'Designation', true, false),
  ('employment_status', 'Employment Status', true, false),
  ('joining_date', 'Joining Date', true, false),
  
  -- Salary info (HR sets, Finance uses)
  ('current_salary', 'Current Salary', true, true),
  
  -- Statutory info (HR responsibility)
  ('pf_applicable', 'PF Applicable', true, true),
  ('esi_applicable', 'ESI Applicable', true, true),
  
  -- Bank details (Finance responsibility)
  ('bank_name', 'Bank Name', false, true),
  ('bank_account_number', 'Bank Account Number', false, true),
  ('bank_ifsc_code', 'Bank IFSC Code', false, true);

-- =============================================
-- 3. VERIFY REQUIREMENTS
-- =============================================

-- Show what we just inserted
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
ORDER BY 
  required_for_hr_lock DESC,
  required_for_finance_lock DESC,
  field_name;
