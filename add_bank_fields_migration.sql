-- Migration: Add Bank Name and Bank IFSC Code fields
-- This migration adds bank_name and bank_ifsc_code columns to employees table
-- and adds corresponding field access settings

-- =============================================
-- 1. ADD COLUMNS TO EMPLOYEES TABLE
-- =============================================

-- Add bank_name column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Add bank_ifsc_code column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT;

-- Add comments for documentation
COMMENT ON COLUMN employees.bank_name IS 'Name of the bank where employee has account';
COMMENT ON COLUMN employees.bank_ifsc_code IS 'IFSC code of the employee bank branch';

-- =============================================
-- 2. ADD FIELD ACCESS SETTINGS
-- =============================================

-- Insert field access settings for bank_name
INSERT INTO field_access_settings (field_name, display_name, hr_can_edit, finance_can_edit, is_visible, field_order) 
VALUES 
  ('bank_name', 'Bank Name', true, false, true, 9)
ON CONFLICT (field_name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  hr_can_edit = EXCLUDED.hr_can_edit,
  finance_can_edit = EXCLUDED.finance_can_edit,
  is_visible = EXCLUDED.is_visible,
  field_order = EXCLUDED.field_order,
  updated_at = now();

-- Insert field access settings for bank_ifsc_code
INSERT INTO field_access_settings (field_name, display_name, hr_can_edit, finance_can_edit, is_visible, field_order) 
VALUES 
  ('bank_ifsc_code', 'Bank IFSC Code', true, false, true, 10)
ON CONFLICT (field_name) 
DO UPDATE SET
  display_name = EXCLUDED.display_name,
  hr_can_edit = EXCLUDED.hr_can_edit,
  finance_can_edit = EXCLUDED.finance_can_edit,
  is_visible = EXCLUDED.is_visible,
  field_order = EXCLUDED.field_order,
  updated_at = now();

-- Update field_order for existing fields to make room for new fields
-- Bank Account Number was at order 8, now we insert Bank Name at 9 and Bank IFSC at 10
-- Current Salary and below need to shift down by 2
UPDATE field_access_settings 
SET field_order = field_order + 2, updated_at = now()
WHERE field_order >= 10 AND field_name NOT IN ('bank_name', 'bank_ifsc_code');
