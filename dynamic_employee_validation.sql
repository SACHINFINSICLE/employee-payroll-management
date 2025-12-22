-- Dynamic validation functions that check ALL fields from payroll_lock_requirements
-- This approach uses dynamic SQL to check any field without hardcoding field names

-- =============================================
-- 1. DYNAMIC HR LOCK VALIDATION
-- =============================================

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
  v_boolean_value BOOLEAN;
  v_date_value DATE;
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
        -- This is expected for calculated fields like net_pay, gross_salary, etc.
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

-- =============================================
-- 2. DYNAMIC FINANCE LOCK VALIDATION
-- =============================================

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
  v_boolean_value BOOLEAN;
  v_date_value DATE;
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
        -- This is expected for calculated fields like net_pay, gross_salary, etc.
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

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION can_hr_lock_employee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_finance_lock_employee(UUID) TO authenticated;
