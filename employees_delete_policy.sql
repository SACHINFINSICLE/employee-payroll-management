-- Add DELETE policy for employees table
-- This allows HR, Finance, and Admin roles to delete employees

-- Drop existing policy if it exists (in case we're re-running)
DROP POLICY IF EXISTS "HR, Finance and Admin can delete employees" ON employees;

-- Create DELETE policy
CREATE POLICY "HR, Finance and Admin can delete employees" ON employees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'finance', 'admin')
    )
  );

-- Verify the policy was created
COMMENT ON POLICY "HR, Finance and Admin can delete employees" ON employees IS 
  'Allows HR, Finance, and Admin users to delete employee records. This will cascade delete all related payroll data.';
