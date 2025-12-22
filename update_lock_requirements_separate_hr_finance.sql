-- Migration: Separate HR and Finance Lock Requirements
-- This migration updates the payroll_lock_requirements table to have separate
-- columns for HR and Finance lock requirements instead of a single column

-- =============================================
-- 1. ADD NEW COLUMNS
-- =============================================

-- Add separate columns for HR and Finance
ALTER TABLE payroll_lock_requirements 
ADD COLUMN IF NOT EXISTS required_for_hr_lock BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS required_for_finance_lock BOOLEAN DEFAULT false;

-- =============================================
-- 2. MIGRATE EXISTING DATA
-- =============================================

-- Copy existing required_for_lock values to both new columns
-- (You can adjust this logic based on your needs)
UPDATE payroll_lock_requirements
SET 
  required_for_hr_lock = COALESCE(required_for_lock, false),
  required_for_finance_lock = COALESCE(required_for_lock, false)
WHERE required_for_hr_lock IS NULL OR required_for_finance_lock IS NULL;

-- =============================================
-- 3. DROP OLD COLUMN (Optional - uncomment if you want to remove it)
-- =============================================

-- ALTER TABLE payroll_lock_requirements DROP COLUMN IF EXISTS required_for_lock;

-- =============================================
-- 4. UPDATE DEFAULT VALUES FOR BETTER SEPARATION
-- =============================================

-- Set sensible defaults: HR focuses on employee details, Finance on payment details
UPDATE payroll_lock_requirements
SET 
  required_for_hr_lock = true,
  required_for_finance_lock = false
WHERE field_name IN ('email', 'department', 'designation');

UPDATE payroll_lock_requirements
SET 
  required_for_hr_lock = false,
  required_for_finance_lock = true
WHERE field_name IN ('bank_name', 'account_number', 'ifsc_code');

UPDATE payroll_lock_requirements
SET 
  required_for_hr_lock = true,
  required_for_finance_lock = true
WHERE field_name IN ('employee_id', 'full_name', 'basic_salary', 'pf_applicable', 'esi_applicable');

-- =============================================
-- 5. ADD COMMENTS
-- =============================================

COMMENT ON COLUMN payroll_lock_requirements.required_for_hr_lock IS 'Whether this field must be filled before HR can lock an employee';
COMMENT ON COLUMN payroll_lock_requirements.required_for_finance_lock IS 'Whether this field must be filled before Finance can lock an employee';
