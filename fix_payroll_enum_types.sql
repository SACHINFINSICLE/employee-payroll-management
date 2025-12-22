-- Fix: Convert ENUM columns to TEXT to support dynamic lookup values
-- This migration changes deduction_type, addition_type, and incentive_type
-- from restrictive ENUMs to TEXT columns so they can use values from lookup tables

-- Step 1: Convert deduction_type from ENUM to TEXT
ALTER TABLE monthly_payroll 
  ALTER COLUMN deduction_type TYPE TEXT;

-- Step 2: Convert addition_type from ENUM to TEXT
ALTER TABLE monthly_payroll 
  ALTER COLUMN addition_type TYPE TEXT;

-- Step 3: Convert incentive_type from ENUM to TEXT
ALTER TABLE monthly_payroll 
  ALTER COLUMN incentive_type TYPE TEXT;

-- Step 4: Drop the old ENUM types (if they exist)
DROP TYPE IF EXISTS deduction_type CASCADE;
DROP TYPE IF EXISTS addition_type CASCADE;
DROP TYPE IF EXISTS incentive_type CASCADE;

-- Add comments for documentation
COMMENT ON COLUMN monthly_payroll.deduction_type IS 
  'Deduction type - values come from deductions lookup table';

COMMENT ON COLUMN monthly_payroll.addition_type IS 
  'Addition type - values come from additions lookup table';

COMMENT ON COLUMN monthly_payroll.incentive_type IS 
  'Incentive type - values come from incentives lookup table';
