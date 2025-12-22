-- Create payroll_signoffs table for global payroll sign-off tracking
CREATE TABLE IF NOT EXISTS payroll_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  hr_signoff_at TIMESTAMPTZ,
  hr_signoff_by UUID REFERENCES auth.users(id),
  finance_signoff_at TIMESTAMPTZ,
  finance_signoff_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payroll_signoffs_month_year ON payroll_signoffs(month, year);

-- Enable RLS
ALTER TABLE payroll_signoffs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view payroll signoffs" ON payroll_signoffs
  FOR SELECT
  USING (true);

CREATE POLICY "HR and Finance can insert payroll signoffs" ON payroll_signoffs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'finance', 'admin')
    )
  );

CREATE POLICY "HR and Finance can update payroll signoffs" ON payroll_signoffs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'finance', 'admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payroll_signoffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_signoffs_updated_at
  BEFORE UPDATE ON payroll_signoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_signoffs_updated_at();

-- Add to Database type definition
COMMENT ON TABLE payroll_signoffs IS 'Global payroll sign-off tracking per month/year';
