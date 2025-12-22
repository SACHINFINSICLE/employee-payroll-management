-- Payroll Finalization System Migration
-- This migration creates tables for monthly payroll finalization with HR and Finance sign-offs

-- 1. Monthly Payrolls Table
-- Tracks payroll cycles by month/year with sign-off status
CREATE TABLE IF NOT EXISTS monthly_payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'hr_signed', 'finalized')),
  
  -- HR Sign-off
  hr_signoff_by UUID REFERENCES auth.users(id),
  hr_signoff_at TIMESTAMPTZ,
  
  -- Finance Sign-off
  finance_signoff_by UUID REFERENCES auth.users(id),
  finance_signoff_at TIMESTAMPTZ,
  
  -- Reversion tracking
  reverted_by UUID REFERENCES auth.users(id),
  reverted_at TIMESTAMPTZ,
  reversion_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one payroll per month/year combination
  UNIQUE(month, year)
);

-- 2. Employee Payroll Locks Table
-- Tracks individual employee lock status for HR and Finance
CREATE TABLE IF NOT EXISTS employee_payroll_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_id UUID NOT NULL REFERENCES monthly_payrolls(id) ON DELETE CASCADE,
  
  -- HR Lock
  hr_locked BOOLEAN DEFAULT FALSE,
  hr_locked_by UUID REFERENCES auth.users(id),
  hr_locked_at TIMESTAMPTZ,
  
  -- Finance Lock
  finance_locked BOOLEAN DEFAULT FALSE,
  finance_locked_by UUID REFERENCES auth.users(id),
  finance_locked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one lock record per employee per payroll
  UNIQUE(employee_id, payroll_id)
);

-- 3. Payroll Lock Requirements Table
-- Defines which fields must be filled before an employee can be locked
CREATE TABLE payroll_lock_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL UNIQUE,
  required_for_hr_lock BOOLEAN DEFAULT false,
  required_for_finance_lock BOOLEAN DEFAULT false,
  display_name TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Payroll Audit Log Table
-- Comprehensive audit trail for all payroll actions
CREATE TABLE IF NOT EXISTS payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID REFERENCES monthly_payrolls(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'payroll_created',
    'hr_signoff',
    'finance_signoff',
    'hr_lock',
    'hr_unlock',
    'finance_lock',
    'finance_unlock',
    'payroll_reverted',
    'payroll_finalized'
  )),
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Insert default lock requirements (common payroll fields)
-- HR requirements are typically more comprehensive, Finance focuses on payment details
INSERT INTO payroll_lock_requirements (field_name, display_name, required_for_hr_lock, required_for_finance_lock) VALUES
  ('employee_id', 'Employee ID', true, true),
  ('full_name', 'Full Name', true, true),
  ('email', 'Email', true, false),
  ('department', 'Department', true, false),
  ('designation', 'Designation', true, false),
  ('basic_salary', 'Basic Salary', true, true),
  ('bank_name', 'Bank Name', false, true),
  ('account_number', 'Account Number', false, true),
  ('ifsc_code', 'IFSC Code', false, true),
  ('pf_applicable', 'PF Applicable', true, true),
  ('esi_applicable', 'ESI Applicable', true, true)
ON CONFLICT (field_name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_payrolls_month_year ON monthly_payrolls(year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_payrolls_status ON monthly_payrolls(status);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_locks_employee ON employee_payroll_locks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payroll_locks_payroll ON employee_payroll_locks(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_payroll ON payroll_audit_log(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_log_performed_at ON payroll_audit_log(performed_at DESC);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_monthly_payrolls_updated_at ON monthly_payrolls;
CREATE TRIGGER update_monthly_payrolls_updated_at
  BEFORE UPDATE ON monthly_payrolls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_payroll_locks_updated_at ON employee_payroll_locks;
CREATE TRIGGER update_employee_payroll_locks_updated_at
  BEFORE UPDATE ON employee_payroll_locks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_lock_requirements_updated_at ON payroll_lock_requirements;
CREATE TRIGGER update_payroll_lock_requirements_updated_at
  BEFORE UPDATE ON payroll_lock_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function: Get current payroll for a month/year
CREATE OR REPLACE FUNCTION get_payroll_for_month(p_month INTEGER, p_year INTEGER)
RETURNS UUID AS $$
DECLARE
  v_payroll_id UUID;
BEGIN
  SELECT id INTO v_payroll_id
  FROM monthly_payrolls
  WHERE month = p_month AND year = p_year;
  
  RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if all employees are locked for HR sign-off
CREATE OR REPLACE FUNCTION can_hr_signoff(p_payroll_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_employees INTEGER;
  v_locked_employees INTEGER;
BEGIN
  -- Count total employees in this payroll
  SELECT COUNT(*) INTO v_total_employees
  FROM employee_payroll_locks
  WHERE payroll_id = p_payroll_id;
  
  -- Count HR-locked employees
  SELECT COUNT(*) INTO v_locked_employees
  FROM employee_payroll_locks
  WHERE payroll_id = p_payroll_id AND hr_locked = TRUE;
  
  -- Can sign off if all employees are locked and at least one employee exists
  RETURN (v_total_employees > 0 AND v_total_employees = v_locked_employees);
END;
$$ LANGUAGE plpgsql;

-- Helper function: Check if all employees are locked for Finance sign-off
CREATE OR REPLACE FUNCTION can_finance_signoff(p_payroll_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_employees INTEGER;
  v_locked_employees INTEGER;
  v_hr_signed BOOLEAN;
BEGIN
  -- Check if HR has signed off
  SELECT (hr_signoff_at IS NOT NULL) INTO v_hr_signed
  FROM monthly_payrolls
  WHERE id = p_payroll_id;
  
  IF NOT v_hr_signed THEN
    RETURN FALSE;
  END IF;
  
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

-- Helper function: Get lock statistics for a payroll
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
  LEFT JOIN employee_payroll_locks epl ON e.id = epl.employee_id AND epl.payroll_id = p_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE monthly_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lock_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_audit_log ENABLE ROW LEVEL SECURITY;

-- Monthly Payrolls Policies
CREATE POLICY "Users can view monthly payrolls" ON monthly_payrolls
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and HR can create payrolls" ON monthly_payrolls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admin and HR can update payrolls" ON monthly_payrolls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- Employee Payroll Locks Policies
CREATE POLICY "Users can view employee locks" ON employee_payroll_locks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin, HR, Finance can manage locks" ON employee_payroll_locks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

-- Payroll Lock Requirements Policies
CREATE POLICY "Users can view lock requirements" ON payroll_lock_requirements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage lock requirements" ON payroll_lock_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Payroll Audit Log Policies
CREATE POLICY "Users can view audit logs" ON payroll_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "System can insert audit logs" ON payroll_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON monthly_payrolls TO authenticated;
GRANT ALL ON employee_payroll_locks TO authenticated;
GRANT ALL ON payroll_lock_requirements TO authenticated;
GRANT ALL ON payroll_audit_log TO authenticated;

-- Comments for documentation
COMMENT ON TABLE monthly_payrolls IS 'Tracks monthly payroll cycles with HR and Finance sign-offs';
COMMENT ON TABLE employee_payroll_locks IS 'Individual employee lock status for each payroll cycle';
COMMENT ON TABLE payroll_lock_requirements IS 'Admin-configurable required fields for locking employees';
COMMENT ON TABLE payroll_audit_log IS 'Comprehensive audit trail for all payroll-related actions';
