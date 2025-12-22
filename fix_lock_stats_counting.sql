-- Fix get_payroll_lock_stats function to count all employees
-- This ensures lock counts show total employees (e.g., 0/20, 20/20) 
-- instead of only counting lock records (0/0, 1/1)

CREATE OR REPLACE FUNCTION get_payroll_lock_stats(p_payroll_id UUID)
RETURNS TABLE(
  total_employees INTEGER,
  hr_locked_count INTEGER,
  finance_locked_count INTEGER,
  can_hr_signoff BOOLEAN,
  can_finance_signoff BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT e.id)::INTEGER as total_employees,
    COUNT(DISTINCT e.id) FILTER (WHERE epl.hr_locked = TRUE)::INTEGER as hr_locked_count,
    COUNT(DISTINCT e.id) FILTER (WHERE epl.finance_locked = TRUE)::INTEGER as finance_locked_count,
    can_hr_signoff(p_payroll_id) as can_hr_signoff,
    can_finance_signoff(p_payroll_id) as can_finance_signoff
  FROM employees e
  LEFT JOIN employee_payroll_locks epl ON e.id = epl.employee_id AND epl.payroll_id = p_payroll_id;
END;
$$ LANGUAGE plpgsql;
