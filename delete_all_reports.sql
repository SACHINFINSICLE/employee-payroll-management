-- Run this in Supabase SQL Editor to delete all payroll reports
-- This bypasses RLS policies

-- First, check what reports exist
SELECT id, report_name, month, year, is_finalized FROM payroll_reports;

-- Delete all payroll reports
DELETE FROM payroll_reports;

-- Verify deletion
SELECT COUNT(*) as remaining_reports FROM payroll_reports;
