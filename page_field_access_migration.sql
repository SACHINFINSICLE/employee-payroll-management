-- Migration: Page and Field Access Control
-- This migration creates tables for page access control and initializes field access settings

-- =============================================
-- 1. PAGE ACCESS SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS page_access_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  page_route TEXT NOT NULL,
  hr_can_access BOOLEAN DEFAULT false,
  finance_can_access BOOLEAN DEFAULT false,
  page_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_page_access_page_name ON page_access_settings(page_name);

-- Insert default page access settings (all pages accessible by default)
INSERT INTO page_access_settings (page_name, display_name, page_route, hr_can_access, finance_can_access, page_order) VALUES
  ('dashboard', 'Dashboard', '/', true, true, 1),
  ('employees', 'Employees', '/employees', true, true, 2),
  ('reports', 'Reports', '/reports', true, true, 3),
  ('settings', 'Settings', '/settings', false, false, 4)
ON CONFLICT (page_name) 
DO UPDATE SET
  hr_can_access = EXCLUDED.hr_can_access,
  finance_can_access = EXCLUDED.finance_can_access,
  updated_at = now();

-- =============================================
-- 2. FIELD ACCESS SETTINGS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS field_access_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  hr_can_edit BOOLEAN DEFAULT false,
  finance_can_edit BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  field_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_field_access_field_name ON field_access_settings(field_name);

-- Insert/Update all field access settings with proper mappings
INSERT INTO field_access_settings (field_name, display_name, hr_can_edit, finance_can_edit, is_visible, field_order) VALUES
  -- Employee Basic Info (HR manages)
  ('employee_id', 'Employee ID', true, false, true, 1),
  ('employee_name', 'Employee Name', true, false, true, 2),
  ('employment_status', 'Employment Status', true, false, true, 3),
  ('designation', 'Designation', true, false, true, 4),
  ('department', 'Department', true, false, true, 5),
  ('joining_date', 'Joining Date', true, false, true, 6),
  ('end_date', 'End Date', true, false, true, 7),
  ('bank_account_number', 'Bank Account Number', true, false, true, 8),
  
  -- Salary & Statutory (HR manages)
  ('current_salary', 'Current Salary', true, false, true, 10),
  ('pf_applicable', 'PF Applicable', true, false, true, 11),
  ('esi_applicable', 'ESI Applicable', true, false, true, 12),
  
  -- Payroll - Deductions (HR manages type, Finance manages amount)
  ('deduction_type', 'Deduction Type', true, false, true, 20),
  ('deduction_amount', 'Deduction Amount', true, true, true, 21),
  
  -- Payroll - Additions (HR manages type, Finance manages amount)
  ('addition_type', 'Addition Type', true, false, true, 22),
  ('addition_amount', 'Addition Amount', true, true, true, 23),
  
  -- Payroll - Incentives (HR manages type, Finance manages amount)
  ('incentive_type', 'Incentive Type', true, false, true, 24),
  ('incentive_amount', 'Incentive Amount', true, true, true, 25),
  
  -- Payroll - Statutory Amounts (Finance manages)
  ('pf_amount', 'PF Amount', false, true, true, 30),
  ('esi_amount', 'ESI Amount', false, true, true, 31),
  
  -- Payroll - HR Remarks (HR manages)
  ('hr_remark', 'HR Remark', true, false, true, 40),
  
  -- Payroll - Payment Status (Finance manages)
  ('payment_status', 'Payment Status', false, true, true, 50),
  
  -- Read-only fields (visible but not editable)
  ('net_pay', 'Net Pay', false, false, true, 60)
ON CONFLICT (field_name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  hr_can_edit = EXCLUDED.hr_can_edit,
  finance_can_edit = EXCLUDED.finance_can_edit,
  is_visible = EXCLUDED.is_visible,
  field_order = EXCLUDED.field_order,
  updated_at = now();

-- =============================================
-- 3. TRIGGERS FOR UPDATED_AT
-- =============================================

-- Trigger for page_access_settings
CREATE OR REPLACE FUNCTION update_page_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_page_access_updated_at ON page_access_settings;
CREATE TRIGGER trigger_update_page_access_updated_at
  BEFORE UPDATE ON page_access_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_page_access_updated_at();

-- Trigger for field_access_settings (if not exists)
CREATE OR REPLACE FUNCTION update_field_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_field_access_updated_at ON field_access_settings;
CREATE TRIGGER trigger_update_field_access_updated_at
  BEFORE UPDATE ON field_access_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_field_access_updated_at();

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on page_access_settings
ALTER TABLE page_access_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read page access settings
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON page_access_settings;
CREATE POLICY "Allow read access to all authenticated users"
  ON page_access_settings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can modify page access settings
DROP POLICY IF EXISTS "Allow admins to modify page access" ON page_access_settings;
CREATE POLICY "Allow admins to modify page access"
  ON page_access_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Enable RLS on field_access_settings (if not already enabled)
ALTER TABLE field_access_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read field access settings
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON field_access_settings;
CREATE POLICY "Allow read access to all authenticated users"
  ON field_access_settings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can modify field access settings
DROP POLICY IF EXISTS "Allow admins to modify field access" ON field_access_settings;
CREATE POLICY "Allow admins to modify field access"
  ON field_access_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- =============================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE page_access_settings IS 'Controls which pages each role can access';
COMMENT ON COLUMN page_access_settings.page_name IS 'Internal page identifier (unique)';
COMMENT ON COLUMN page_access_settings.display_name IS 'User-friendly page name';
COMMENT ON COLUMN page_access_settings.page_route IS 'URL route for the page';
COMMENT ON COLUMN page_access_settings.hr_can_access IS 'Whether HR role can access this page';
COMMENT ON COLUMN page_access_settings.finance_can_access IS 'Whether Finance role can access this page';

COMMENT ON TABLE field_access_settings IS 'Controls which fields each role can edit in the Employees page';
COMMENT ON COLUMN field_access_settings.field_name IS 'Database field name (unique)';
COMMENT ON COLUMN field_access_settings.display_name IS 'User-friendly field name';
COMMENT ON COLUMN field_access_settings.hr_can_edit IS 'Whether HR role can edit this field';
COMMENT ON COLUMN field_access_settings.finance_can_edit IS 'Whether Finance role can edit this field';
COMMENT ON COLUMN field_access_settings.is_visible IS 'Whether the field is visible to non-admin users';
