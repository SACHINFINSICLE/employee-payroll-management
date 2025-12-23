-- Exclude Inactive Employees from Lock Requirements
-- This migration updates validation functions to ignore inactive employees.

-- 1. Update get_payroll_lock_stats to only count active employees
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
  LEFT JOIN employee_payroll_locks epl ON e.id = epl.employee_id AND epl.payroll_id = p_payroll_id
  WHERE e.is_active = true; -- ONLY ACTIVE EMPLOYEES
END;
$$ LANGUAGE plpgsql;

-- 2. Update can_hr_signoff to only check active employees
CREATE OR REPLACE FUNCTION can_hr_signoff(p_payroll_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_active_employees INTEGER;
  v_hr_locked_employees INTEGER;
BEGIN
  -- Count total ACTIVE employees
  SELECT COUNT(*) INTO v_total_active_employees
  FROM employees
  WHERE is_active = true;
  
  -- Count HR-locked ACTIVE employees
  SELECT COUNT(DISTINCT e.id) INTO v_hr_locked_employees
  FROM employees e
  JOIN employee_payroll_locks epl ON e.id = epl.employee_id
  WHERE epl.payroll_id = p_payroll_id 
  AND epl.hr_locked = TRUE
  AND e.is_active = true;
  
  -- Can sign off if all active employees are locked and at least one exists
  RETURN (v_total_active_employees > 0 AND v_total_active_employees = v_hr_locked_employees);
END;
$$ LANGUAGE plpgsql;

-- 3. Update can_finance_signoff to only check active employees
-- AND maintain the independence from HR signoff (as requested previously)
CREATE OR REPLACE FUNCTION can_finance_signoff(p_payroll_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_active_employees INTEGER;
  v_finance_locked_employees INTEGER;
BEGIN
  -- Count total ACTIVE employees
  SELECT COUNT(*) INTO v_total_active_employees
  FROM employees
  WHERE is_active = true;
  
  -- Count Finance-locked ACTIVE employees
  SELECT COUNT(DISTINCT e.id) INTO v_finance_locked_employees
  FROM employees e
  JOIN employee_payroll_locks epl ON e.id = epl.employee_id
  WHERE epl.payroll_id = p_payroll_id 
  AND epl.finance_locked = TRUE
  AND e.is_active = true;
  
  -- Can sign off if all active employees are locked and at least one exists
  RETURN (v_total_active_employees > 0 AND v_total_active_employees = v_finance_locked_employees);
END;
$$ LANGUAGE plpgsql;
