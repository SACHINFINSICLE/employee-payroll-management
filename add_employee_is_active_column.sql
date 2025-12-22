-- Add is_active column to employees table
-- This allows soft deletion of employees instead of hard deletion

-- Add the column with default value true
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Add comment
COMMENT ON COLUMN employees.is_active IS 'Indicates if the employee is active in the system. Deactivated employees are preserved but marked as inactive.';

-- Update any existing employees to be active
UPDATE employees SET is_active = true WHERE is_active IS NULL;
