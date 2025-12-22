-- Test 1: Check if payroll_reports table exists and is accessible
SELECT COUNT(*) as report_count FROM payroll_reports;

-- Test 2: Check existing reports
SELECT 
  id,
  month,
  year,
  report_name,
  report_type,
  total_employees,
  is_finalized,
  finalized_at,
  generated_at
FROM payroll_reports
ORDER BY year DESC, month DESC;

-- Test 3: Check December 2024 payroll signoff status
SELECT 
  id,
  month,
  year,
  hr_signoff_at,
  hr_signoff_by,
  finance_signoff_at,
  finance_signoff_by,
  remarks
FROM payroll_signoffs
WHERE month = 12 AND year = 2024;

-- Test 4: Check January 2025 payroll signoff status
SELECT 
  id,
  month,
  year,
  hr_signoff_at,
  hr_signoff_by,
  finance_signoff_at,
  finance_signoff_by,
  remarks
FROM payroll_signoffs
WHERE month = 1 AND year = 2025;

-- Test 5: Check your user role
SELECT 
  id,
  email,
  full_name,
  role
FROM user_profiles
WHERE id = auth.uid();

-- Test 6: Manually insert a test report to verify RLS policies work
INSERT INTO payroll_reports (
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
  report_data
) VALUES (
  12,
  2024,
  'TEST - Payroll Report - December 2024',
  'snapshot',
  1,
  10000.00,
  1000.00,
  9000.00,
  true,
  NOW(),
  '[]'::jsonb
)
ON CONFLICT (month, year, report_type) DO UPDATE
SET report_name = EXCLUDED.report_name;

-- Test 7: Verify the test report was inserted
SELECT * FROM payroll_reports WHERE month = 12 AND year = 2024;
