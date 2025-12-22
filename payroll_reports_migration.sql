-- Create payroll_reports table to store generated reports
-- Reports are auto-generated when payroll is finalized (Finance approved)

-- Drop existing table if it exists (to ensure clean migration)
DROP TABLE IF EXISTS payroll_reports CASCADE;

CREATE TABLE payroll_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'snapshot', -- 'snapshot' for finalized reports
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  
  -- Report metadata
  total_employees INTEGER,
  total_gross_salary DECIMAL(15, 2),
  total_deductions DECIMAL(15, 2),
  total_net_salary DECIMAL(15, 2),
  
  -- Snapshot data stored as JSONB for immutability
  report_data JSONB NOT NULL,
  
  -- Status tracking
  is_finalized BOOLEAN DEFAULT true,
  finalized_at TIMESTAMPTZ,
  finance_approved_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one report per month/year combination
  CONSTRAINT unique_month_year_type UNIQUE(month, year, report_type)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payroll_reports_month_year ON payroll_reports(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_reports_generated_at ON payroll_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_reports_type ON payroll_reports(report_type);

-- Add comments
COMMENT ON TABLE payroll_reports IS 'Stores immutable snapshots of finalized payroll reports';
COMMENT ON COLUMN payroll_reports.report_data IS 'Complete payroll data snapshot in JSON format - immutable once finalized';
COMMENT ON COLUMN payroll_reports.report_type IS 'Type of report: snapshot (finalized), draft, etc.';

-- Enable RLS
ALTER TABLE payroll_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- HR and Finance can view all reports
CREATE POLICY "HR and Finance can view reports" ON payroll_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('hr', 'finance', 'admin')
    )
  );

-- Only system/admin can insert reports (via function)
CREATE POLICY "System can insert reports" ON payroll_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'finance')
    )
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_payroll_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_reports_updated_at
  BEFORE UPDATE ON payroll_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_payroll_reports_updated_at();
