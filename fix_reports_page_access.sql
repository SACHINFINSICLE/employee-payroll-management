-- Fix Reports page access for HR users
-- Run this in Supabase SQL Editor

-- Check current page access settings
SELECT * FROM page_access_settings ORDER BY page_order;

-- Update reports page to allow HR access
UPDATE page_access_settings
SET hr_can_access = true
WHERE page_name = 'reports';

-- If the reports page doesn't exist, insert it
INSERT INTO page_access_settings (page_name, display_name, page_route, hr_can_access, finance_can_access, page_order)
VALUES ('reports', 'Reports', '/reports', true, true, 3)
ON CONFLICT (page_name) DO UPDATE SET
  hr_can_access = true,
  finance_can_access = true;

-- Verify the fix
SELECT * FROM page_access_settings ORDER BY page_order;
