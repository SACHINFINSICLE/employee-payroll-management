-- Create function to initialize monthly payroll for all employees
-- This function creates payroll records with default values for all employees
-- who don't already have a record for the specified month/year

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS initialize_monthly_payroll(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION initialize_monthly_payroll(p_month INTEGER, p_year INTEGER)
RETURNS void AS $$
BEGIN
  -- Insert payroll records for employees who don't have one for this month/year
  INSERT INTO monthly_payroll (
    employee_id,
    month,
    year,
    deduction_type,
    deduction_amount,
    addition_type,
    addition_amount,
    incentive_type,
    incentive_amount,
    pf_amount,
    esi_amount,
    hr_remark,
    salary_processing_required,
    payment_status,
    is_locked
  )
  SELECT 
    e.id,
    p_month,
    p_year,
    'Nil',
    0,
    'Nil',
    0,
    'Nil',
    0,
    0,
    0,
    'Process Payroll',
    'Yes',
    'Not Paid',
    false
  FROM employees e
  WHERE NOT EXISTS (
    SELECT 1 
    FROM monthly_payroll mp 
    WHERE mp.employee_id = e.id 
      AND mp.month = p_month 
      AND mp.year = p_year
  );
  
  -- Note: employee_salary will be automatically set by the trigger
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION initialize_monthly_payroll(INTEGER, INTEGER) IS 
  'Initializes monthly payroll records for all employees who do not have a record for the specified month and year. Sets default values for all payroll fields.';
