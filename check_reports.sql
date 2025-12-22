-- Check if any reports exist in the payroll_reports table
SELECT 
  id,
  month,
  year,
  report_name,
  report_type,
  total_employees,
  total_gross_salary,
  total_deductions,
  total_net_salary,
  is_finalized,
  finalized_at,
  generated_at
FROM payroll_reports
ORDER BY year DESC, month DESC;

-- Also check payroll_signoffs to see if Finance approved
SELECT 
  id,
  month,
  year,
  hr_signoff_at,
  hr_signoff_by,
  finance_signoff_at,
  finance_signoff_by
FROM payroll_signoffs
WHERE month = 12 AND year = 2024
ORDER BY created_at DESC;
