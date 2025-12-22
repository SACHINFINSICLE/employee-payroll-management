-- Migration: Fix Net Pay Generated Column
-- This migration updates the net_pay generated column to use the correct formula
-- Formula: net_pay = salary - deduction_amount + addition_amount - pf_amount - esi_amount
-- NOTE: incentive_amount is NOT part of net pay calculation (tracked separately)

-- Step 1: Add employee_salary column to store employee salary reference (if not exists)
-- This is needed because generated columns can't reference other tables
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monthly_payroll' AND column_name = 'employee_salary'
  ) THEN
    ALTER TABLE monthly_payroll 
    ADD COLUMN employee_salary NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Step 2: Update employee_salary for all existing records
UPDATE monthly_payroll mp
SET employee_salary = e.current_salary
FROM employees e
WHERE mp.employee_id = e.id;

-- Step 3: Drop and recreate the net_pay column with correct formula
-- Formula: Salary - Deduction + Addition - PF - ESI (Incentive is NOT included)
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

-- Step 5: Create a trigger to update employee_salary when employee's current_salary changes
CREATE OR REPLACE FUNCTION sync_employee_salary_to_payroll()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all payroll records for this employee with the new salary
  UPDATE monthly_payroll
  SET employee_salary = NEW.current_salary
  WHERE employee_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_employee_salary ON employees;

-- Create trigger on employees table to sync salary changes
CREATE TRIGGER trigger_sync_employee_salary
  AFTER UPDATE OF current_salary ON employees
  FOR EACH ROW
  WHEN (OLD.current_salary IS DISTINCT FROM NEW.current_salary)
  EXECUTE FUNCTION sync_employee_salary_to_payroll();

-- Step 6: Create a trigger to set employee_salary when inserting new payroll records
CREATE OR REPLACE FUNCTION set_employee_salary_on_payroll_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the employee's current salary and set it
  SELECT current_salary INTO NEW.employee_salary
  FROM employees
  WHERE id = NEW.employee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_employee_salary ON monthly_payroll;

-- Create trigger on monthly_payroll for new records
CREATE TRIGGER trigger_set_employee_salary
  BEFORE INSERT ON monthly_payroll
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_salary_on_payroll_insert();

-- Add comments for documentation
COMMENT ON COLUMN monthly_payroll.net_pay IS 
  'Automatically calculated net pay. Formula: salary - deduction + addition - pf - esi. Note: Incentive is NOT included in net pay calculation.';

COMMENT ON COLUMN monthly_payroll.employee_salary IS 
  'Cached employee salary for net_pay calculation. Synced automatically from employees table.';

COMMENT ON FUNCTION sync_employee_salary_to_payroll() IS 
  'Syncs employee salary changes to all their payroll records';

COMMENT ON FUNCTION set_employee_salary_on_payroll_insert() IS 
  'Sets employee_salary when creating new payroll records';
