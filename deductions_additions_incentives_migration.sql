-- Create deductions table
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create additions table
CREATE TABLE IF NOT EXISTS additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create incentives table
CREATE TABLE IF NOT EXISTS incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incentives ENABLE ROW LEVEL SECURITY;

-- Create policies for deductions
CREATE POLICY "Allow all authenticated users to read deductions"
  ON deductions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin to insert deductions"
  ON deductions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to update deductions"
  ON deductions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to delete deductions"
  ON deductions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for additions
CREATE POLICY "Allow all authenticated users to read additions"
  ON additions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin to insert additions"
  ON additions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to update additions"
  ON additions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to delete additions"
  ON additions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for incentives
CREATE POLICY "Allow all authenticated users to read incentives"
  ON incentives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin to insert incentives"
  ON incentives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to update incentives"
  ON incentives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin to delete incentives"
  ON incentives FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_deductions_name ON deductions(name);
CREATE INDEX idx_additions_name ON additions(name);
CREATE INDEX idx_incentives_name ON incentives(name);

-- Create triggers for updated_at
CREATE TRIGGER update_deductions_updated_at
  BEFORE UPDATE ON deductions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_additions_updated_at
  BEFORE UPDATE ON additions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incentives_updated_at
  BEFORE UPDATE ON incentives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default values
INSERT INTO deductions (name, is_active, display_order) VALUES
  ('Nil', true, 0),
  ('LOP', true, 1),
  ('Late Coming', true, 2),
  ('Advance Salary', true, 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO additions (name, is_active, display_order) VALUES
  ('Nil', true, 0),
  ('Recognition Bonus', true, 1),
  ('Overtime', true, 2),
  ('Arrears', true, 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO incentives (name, is_active, display_order) VALUES
  ('Nil', true, 0),
  ('Performance Incentive', true, 1),
  ('Sales Incentive', true, 2),
  ('Project Bonus', true, 3)
ON CONFLICT (name) DO NOTHING;
