-- Allow Independent Finance Signoff
-- This migration updates the can_finance_signoff function to remove the dependency on HR signoff.
-- Finance should be able to sign off as long as they have locked all employees.

CREATE OR REPLACE FUNCTION can_finance_signoff(p_payroll_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_employees INTEGER;
  v_locked_employees INTEGER;
BEGIN
  -- REMOVED: Check if HR has signed off
  -- We now allow Finance to sign off independently
  
  -- Count total employees in this payroll
  SELECT COUNT(*) INTO v_total_employees
  FROM employee_payroll_locks
  WHERE payroll_id = p_payroll_id;
  
  -- Count Finance-locked employees
  SELECT COUNT(*) INTO v_locked_employees
  FROM employee_payroll_locks
  WHERE payroll_id = p_payroll_id AND finance_locked = TRUE;
  
  -- Can sign off if all employees are locked and at least one employee exists
  RETURN (v_total_employees > 0 AND v_total_employees = v_locked_employees);
END;
$$ LANGUAGE plpgsql;
