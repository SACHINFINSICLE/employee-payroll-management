-- Migration: Update Net Pay Formula
-- This migration updates the net_pay generated column to exclude incentive_amount
-- New Formula: net_pay = salary - deduction_amount + addition_amount - pf_amount - esi_amount
-- Note: Incentive amount is NOT part of net pay calculation (tracked separately)

-- Step 1: Drop and recreate the net_pay column with updated formula
ALTER TABLE monthly_payroll 
DROP COLUMN IF EXISTS net_pay;

ALTER TABLE monthly_payroll 
ADD COLUMN net_pay NUMERIC GENERATED ALWAYS AS (
  COALESCE(employee_salary, 0) 
  - COALESCE(deduction_amount, 0) 
  + COALESCE(addition_amount, 0) 
  - COALESCE(pf_amount, 0) 
  - COALESCE(esi_amount, 0)
) STORED;

-- Update comment for documentation
COMMENT ON COLUMN monthly_payroll.net_pay IS 
  'Automatically calculated net pay. Formula: salary - deduction + addition - pf - esi. Note: Incentive is NOT included in net pay calculation.';
