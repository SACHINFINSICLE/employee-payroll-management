-- Add validation to prevent locking employees with incomplete data
-- This ensures employees must have all required fields filled before they can be locked

-- =============================================
-- 1. VALIDATION FUNCTION FOR HR LOCK
-- =============================================

CREATE OR REPLACE FUNCTION can_hr_lock_employee(p_employee_id UUID)
RETURNS TABLE(
  can_lock BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
  v_employee RECORD;
  v_requirement RECORD;
BEGIN
  -- Get employee data
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['Employee not found']::TEXT[];
    RETURN;
  END IF;
  
  -- Check each HR requirement
  FOR v_requirement IN 
    SELECT field_name, display_name 
    FROM payroll_lock_requirements 
    WHERE required_for_hr_lock = true
  LOOP
    -- Check if field is empty/null
    CASE v_requirement.field_name
      WHEN 'employee_id' THEN
        IF v_employee.employee_id IS NULL OR v_employee.employee_id = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'full_name' THEN
        IF v_employee.employee_name IS NULL OR v_employee.employee_name = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'email' THEN
        IF v_employee.email IS NULL OR v_employee.email = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'department' THEN
        IF v_employee.department IS NULL OR v_employee.department = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'designation' THEN
        IF v_employee.designation IS NULL OR v_employee.designation = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'basic_salary' THEN
        IF v_employee.current_salary IS NULL OR v_employee.current_salary <= 0 THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'pf_applicable' THEN
        IF v_employee.pf_applicable IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'esi_applicable' THEN
        IF v_employee.esi_applicable IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      ELSE
        -- Unknown field, skip it
        NULL;
    END CASE;
  END LOOP;
  
  -- Return result
  RETURN QUERY SELECT 
    (array_length(v_missing_fields, 1) IS NULL OR array_length(v_missing_fields, 1) = 0),
    v_missing_fields;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. VALIDATION FUNCTION FOR FINANCE LOCK
-- =============================================

CREATE OR REPLACE FUNCTION can_finance_lock_employee(p_employee_id UUID)
RETURNS TABLE(
  can_lock BOOLEAN,
  missing_fields TEXT[]
) AS $$
DECLARE
  v_missing_fields TEXT[] := ARRAY[]::TEXT[];
  v_employee RECORD;
  v_requirement RECORD;
BEGIN
  -- Get employee data
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ARRAY['Employee not found']::TEXT[];
    RETURN;
  END IF;
  
  -- Check each Finance requirement
  FOR v_requirement IN 
    SELECT field_name, display_name 
    FROM payroll_lock_requirements 
    WHERE required_for_finance_lock = true
  LOOP
    -- Check if field is empty/null
    CASE v_requirement.field_name
      WHEN 'employee_id' THEN
        IF v_employee.employee_id IS NULL OR v_employee.employee_id = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'full_name' THEN
        IF v_employee.employee_name IS NULL OR v_employee.employee_name = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'basic_salary' THEN
        IF v_employee.current_salary IS NULL OR v_employee.current_salary <= 0 THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'bank_name' THEN
        IF v_employee.bank_name IS NULL OR v_employee.bank_name = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'account_number' THEN
        IF v_employee.bank_account_number IS NULL OR v_employee.bank_account_number = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'ifsc_code' THEN
        IF v_employee.bank_ifsc_code IS NULL OR v_employee.bank_ifsc_code = '' THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'pf_applicable' THEN
        IF v_employee.pf_applicable IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      WHEN 'esi_applicable' THEN
        IF v_employee.esi_applicable IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, v_requirement.display_name);
        END IF;
      ELSE
        -- Unknown field, skip it
        NULL;
    END CASE;
  END LOOP;
  
  -- Return result
  RETURN QUERY SELECT 
    (array_length(v_missing_fields, 1) IS NULL OR array_length(v_missing_fields, 1) = 0),
    v_missing_fields;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_hr_lock_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_finance_lock_employee(UUID) TO authenticated;
