-- Fix November 2025 payroll that was incorrectly marked as finalized
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Diagnose - See current state
-- ============================================
SELECT 
  id, 
  month, 
  year, 
  status, 
  hr_signoff_at, 
  finance_signoff_at, 
  created_at
FROM monthly_payrolls
ORDER BY year, month;

-- ============================================
-- STEP 2: Fix November 2025 payroll
-- Reset to pending status with all signoff fields cleared
-- ============================================
UPDATE monthly_payrolls
SET 
  status = 'pending',
  hr_signoff_by = NULL,
  hr_signoff_at = NULL,
  finance_signoff_by = NULL,
  finance_signoff_at = NULL,
  reverted_by = NULL,
  reverted_at = NULL,
  reversion_reason = NULL
WHERE month = 11 AND year = 2025;

-- ============================================
-- STEP 3: Clear employee locks for November 2025
-- These should not exist for a non-finalized month
-- ============================================
DELETE FROM employee_payroll_locks
WHERE payroll_id IN (
  SELECT id FROM monthly_payrolls WHERE month = 11 AND year = 2025
);

-- ============================================
-- STEP 4: Delete any incorrectly created snapshot for November 2025
-- ============================================
DELETE FROM payroll_reports
WHERE month = 11 AND year = 2025 AND report_type = 'snapshot';

-- ============================================
-- STEP 5: Verify the fix
-- October should be finalized, November should be pending
-- ============================================
SELECT 
  id, 
  month, 
  year, 
  status, 
  hr_signoff_at IS NOT NULL as has_hr_signoff,
  finance_signoff_at IS NOT NULL as has_finance_signoff
FROM monthly_payrolls
ORDER BY year, month;

-- ============================================
-- STEP 6: Verify no orphaned locks exist
-- ============================================
SELECT 
  epl.id,
  mp.month,
  mp.year,
  mp.status,
  epl.hr_locked,
  epl.finance_locked
FROM employee_payroll_locks epl
JOIN monthly_payrolls mp ON mp.id = epl.payroll_id
ORDER BY mp.year, mp.month;
