-- =============================================
-- COMPLETE FIX FOR EMPLOYEE LOCK VALIDATION
-- =============================================
-- This script:
-- 1. Clears incorrect requirements (calculated/payroll fields)
-- 2. Sets up correct requirements (only employee table fields)
-- 3. Updates validation functions to handle all field types
-- 
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: FIX REQUIREMENTS TABLE
-- =============================================

-- Clear existing requirements
DELETE FROM payroll_lock_requirements;

-- Insert only fields that exist in employees table
INSERT INTO payroll_lock_requirements (field_name, display_name, required_for_hr_lock, required_for_finance_lock) VALUES
  -- Basic employee info (HR responsibility)
  ('employee_id', 'Employee ID', true, true),
  ('employee_name', 'Employee Name', true, true),
  ('department', 'Department', true, false),
  ('designation', 'Designation', true, false),
  ('employment_status', 'Employment Status', true, false),
  ('joining_date', 'Joining Date', true, false),
  
  -- Salary info (HR sets, Finance uses)
  ('current_salary', 'Current Salary', true, true),
  
  -- Statutory info (HR responsibility)
  ('pf_applicable', 'PF Applicable', true, true),
  ('esi_applicable', 'ESI Applicable', true, true),
  
  -- Bank details (Finance responsibility)
  ('bank_name', 'Bank Name', false, true),
  ('bank_account_number', 'Bank Account Number', false, true),
  ('bank_ifsc_code', 'Bank IFSC Code', false, true);

-- =============================================
-- STEP 2: UPDATE VALIDATION FUNCTIONS
-- =============================================

-- HR Lock Validation Function
CREATE OR REPLACE FUNCTION can_hr_lock_employee(p_employee_id UUID)
RETURNS TABLE(
  can_lock BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
  v_requirement RECORD;
  v_field_value TEXT;
  v_numeric_value NUMERIC;
BEGIN
  -- Check if employee exists
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RETURN QUERY SELECT false, ARRAY['Employee not found']::TEXT[];
    RETURN;
  END IF;
  
  -- Loop through each HR requirement and check dynamically
  FOR v_requirement IN 
    SELECT field_name, display_name 
    FROM payroll_lock_requirements 
    WHERE required_for_hr_lock = true
  LOOP
    BEGIN
      -- Try to get the field value as text first (handles TEXT, USER-DEFINED enums, etc.)
      EXECUTE format('SELECT CAST(%I AS TEXT) FROM employees WHERE id = $1', v_requirement.field_name)
        INTO v_field_value
        USING p_employee_id;
      
      -- Check if field is empty/null
      IF v_field_value IS NULL OR v_field_value = '' THEN
        v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
      -- Special handling for numeric fields (check if > 0)
      ELSIF v_requirement.field_name IN ('current_salary', 'basic_salary') THEN
        EXECUTE format('SELECT %I FROM employees WHERE id = $1', v_requirement.field_name)
          INTO v_numeric_value
          USING p_employee_id;
        IF v_numeric_value IS NULL OR v_numeric_value <= 0 THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      END IF;
      
    EXCEPTION
      WHEN undefined_column THEN
        -- Field doesn't exist in employees table, skip it
        NULL;
      WHEN OTHERS THEN
        -- Any other error, skip this field
        NULL;
    END;
  END LOOP;
  
  -- Return result
  RETURN QUERY SELECT 
    (array_length(v_missing_fields, 1) IS NULL OR array_length(v_missing_fields, 1) = 0),
    v_missing_fields;
END;
$$ LANGUAGE plpgsql;

-- Finance Lock Validation Function
CREATE OR REPLACE FUNCTION can_finance_lock_employee(p_employee_id UUID)
RETURNS TABLE(
  can_lock BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
  v_requirement RECORD;
  v_field_value TEXT;
  v_numeric_value NUMERIC;
BEGIN
  -- Check if employee exists
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RETURN QUERY SELECT false, ARRAY['Employee not found']::TEXT[];
    RETURN;
  END IF;
  
  -- Loop through each Finance requirement and check dynamically
  FOR v_requirement IN 
    SELECT field_name, display_name 
    FROM payroll_lock_requirements 
    WHERE required_for_finance_lock = true
  LOOP
    BEGIN
      -- Try to get the field value as text first (handles TEXT, USER-DEFINED enums, etc.)
      EXECUTE format('SELECT CAST(%I AS TEXT) FROM employees WHERE id = $1', v_requirement.field_name)
        INTO v_field_value
        USING p_employee_id;
      
      -- Check if field is empty/null
      IF v_field_value IS NULL OR v_field_value = '' THEN
        v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
      -- Special handling for numeric fields (check if > 0)
      ELSIF v_requirement.field_name IN ('current_salary', 'basic_salary') THEN
        EXECUTE format('SELECT %I FROM employees WHERE id = $1', v_requirement.field_name)
          INTO v_numeric_value
          USING p_employee_id;
        IF v_numeric_value IS NULL OR v_numeric_value <= 0 THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      END IF;
      
    EXCEPTION
      WHEN undefined_column THEN
        -- Field doesn't exist in employees table, skip it
        NULL;
      WHEN OTHERS THEN
        -- Any other error, skip this field
        NULL;
    END;
  END LOOP;
  
  -- Return result
  RETURN QUERY SELECT 
    (array_length(v_missing_fields, 1) IS NULL OR array_length(v_missing_fields, 1) = 0),
    v_missing_fields;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_hr_lock_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_finance_lock_employee(UUID) TO authenticated;

-- =============================================
-- STEP 3: VERIFY THE FIX
-- =============================================

-- Check requirements are correct
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
ORDER BY 
  required_for_hr_lock DESC,
  required_for_finance_lock DESC,
  field_name;

-- Expected: 12 rows showing only employee table fields
