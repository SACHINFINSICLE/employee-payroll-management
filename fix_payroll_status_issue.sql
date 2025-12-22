-- Fix payroll status issue where future months show as "Finalized"
-- This script:
-- 1. Updates get_payroll_lock_stats to filter by active employees
-- 2. Resets any incorrectly finalized payrolls that have no actual sign-offs

-- First, let's check the current state of monthly_payrolls
-- Run this to see what's in the database:
-- SELECT * FROM monthly_payrolls ORDER BY year, month;

-- Fix 1: Update get_payroll_lock_stats to only count active employees
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
  WHERE e.is_active = TRUE;  -- Only count active employees
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Reset any payrolls that are marked as finalized but have no actual sign-off timestamps
UPDATE monthly_payrolls
SET status = 'pending'
WHERE status = 'finalized' 
  AND (hr_signoff_at IS NULL OR finance_signoff_at IS NULL);

-- Fix 3: Reset any payrolls that are marked as hr_signed but have no HR sign-off timestamp
UPDATE monthly_payrolls
SET status = 'pending'
WHERE status = 'hr_signed' 
  AND hr_signoff_at IS NULL;

-- Fix 4: Ensure the default status for new payrolls is 'pending'
-- Check if there's a default constraint issue
ALTER TABLE monthly_payrolls 
ALTER COLUMN status SET DEFAULT 'pending';

-- Verify the fixes
SELECT id, month, year, status, hr_signoff_at, finance_signoff_at 
FROM monthly_payrolls 
ORDER BY year DESC, month DESC;
