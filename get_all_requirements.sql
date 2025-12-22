-- Get all requirements to see what needs to be validated
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
WHERE required_for_hr_lock = true OR required_for_finance_lock = true
ORDER BY 
  required_for_hr_lock DESC,
  required_for_finance_lock DESC,
  field_name;
