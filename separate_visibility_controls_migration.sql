-- Migration: Separate Visibility Controls for HR and Finance
-- This migration adds separate visibility columns for HR and Finance roles
-- and migrates existing is_visible data

-- =============================================
-- 1. ADD NEW VISIBILITY COLUMNS
-- =============================================

-- Add hr_can_view column
ALTER TABLE field_access_settings 
ADD COLUMN IF NOT EXISTS hr_can_view BOOLEAN DEFAULT true;

-- Add finance_can_view column
ALTER TABLE field_access_settings 
ADD COLUMN IF NOT EXISTS finance_can_view BOOLEAN DEFAULT true;

-- =============================================
-- 2. MIGRATE EXISTING DATA
-- =============================================

-- Copy is_visible value to both new columns for existing records
UPDATE field_access_settings 
SET 
  hr_can_view = is_visible,
  finance_can_view = is_visible
WHERE hr_can_view IS NULL OR finance_can_view IS NULL;

-- =============================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN field_access_settings.hr_can_view IS 'Whether HR role can view this field';
COMMENT ON COLUMN field_access_settings.finance_can_view IS 'Whether Finance role can view this field';
COMMENT ON COLUMN field_access_settings.is_visible IS 'Legacy visibility flag - kept for backward compatibility';

-- =============================================
-- 4. UPDATE FIELD ACCESS SETTINGS FOR NEW FIELDS
-- =============================================

-- Ensure bank_name and bank_ifsc_code have proper visibility settings
UPDATE field_access_settings 
SET 
  hr_can_view = true,
  finance_can_view = true
WHERE field_name IN ('bank_name', 'bank_ifsc_code');
