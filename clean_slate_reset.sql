-- ============================================================
-- CLEAN SLATE RESET SCRIPT
-- Deletes all employee data and related records for new company
-- PRESERVES: All settings, configurations, functions, and structure
-- ============================================================

-- Run this in a transaction for safety
BEGIN;

-- ============================================================
-- STEP 1: Delete employee-related transactional data
-- (Order matters due to foreign key constraints)
-- ============================================================

-- 1.1 Delete payroll audit logs (references employees and payrolls)
DELETE FROM payroll_audit_log;

-- 1.2 Delete employee payroll locks (references employees and monthly_payrolls)
DELETE FROM employee_payroll_locks;

-- 1.3 Delete monthly payroll records (individual employee payroll entries)
DELETE FROM monthly_payroll;

-- 1.4 Delete monthly payroll cycles (the payroll period records)
DELETE FROM monthly_payrolls;

-- 1.5 Delete payroll signoffs (monthly HR/Finance signoffs)
DELETE FROM payroll_signoffs;

-- 1.6 Delete payroll reports (generated reports)
DELETE FROM payroll_reports;

-- 1.7 Delete general audit logs (if they reference employees)
DELETE FROM audit_logs;

-- 1.8 Finally, delete all employees
DELETE FROM employees;

-- ============================================================
-- STEP 2: Verify deletions
-- ============================================================

-- Check counts after deletion
SELECT 'employees' as table_name, COUNT(*) as remaining_count FROM employees
UNION ALL
SELECT 'monthly_payroll', COUNT(*) FROM monthly_payroll
UNION ALL
SELECT 'monthly_payrolls', COUNT(*) FROM monthly_payrolls
UNION ALL
SELECT 'employee_payroll_locks', COUNT(*) FROM employee_payroll_locks
UNION ALL
SELECT 'payroll_signoffs', COUNT(*) FROM payroll_signoffs
UNION ALL
SELECT 'payroll_reports', COUNT(*) FROM payroll_reports
UNION ALL
SELECT 'payroll_audit_log', COUNT(*) FROM payroll_audit_log
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- ============================================================
-- STEP 3: Verify preserved settings (should have data)
-- ============================================================

SELECT 'PRESERVED SETTINGS:' as info;

SELECT 'field_access_settings' as table_name, COUNT(*) as count FROM field_access_settings
UNION ALL
SELECT 'page_access_settings', COUNT(*) FROM page_access_settings
UNION ALL
SELECT 'dropdown_options', COUNT(*) FROM dropdown_options
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'designations', COUNT(*) FROM designations
UNION ALL
SELECT 'deductions', COUNT(*) FROM deductions
UNION ALL
SELECT 'additions', COUNT(*) FROM additions
UNION ALL
SELECT 'incentives', COUNT(*) FROM incentives
UNION ALL
SELECT 'payroll_lock_requirements', COUNT(*) FROM payroll_lock_requirements
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles;

-- ============================================================
-- COMMIT the transaction (uncomment when ready to execute)
-- ============================================================
COMMIT;

-- ============================================================
-- WHAT IS PRESERVED (NOT DELETED):
-- ============================================================
-- ✓ user_profiles - Admin/HR/Finance user accounts
-- ✓ field_access_settings - Field visibility and edit permissions
-- ✓ page_access_settings - Page access permissions
-- ✓ dropdown_options - Custom dropdown values
-- ✓ departments - Department master data
-- ✓ designations - Designation master data
-- ✓ deductions - Deduction types
-- ✓ additions - Addition types
-- ✓ incentives - Incentive types
-- ✓ payroll_lock_requirements - Lock validation rules
-- ✓ All database functions (initialize_monthly_payroll, etc.)
-- ✓ All triggers and constraints
-- ✓ All RLS policies
-- ============================================================

-- ============================================================
-- WHAT IS DELETED:
-- ============================================================
-- ✗ employees - All employee records
-- ✗ monthly_payroll - All individual payroll entries
-- ✗ monthly_payrolls - All payroll cycle records
-- ✗ employee_payroll_locks - All lock records
-- ✗ payroll_signoffs - All signoff records
-- ✗ payroll_reports - All generated reports
-- ✗ payroll_audit_log - All payroll audit entries
-- ✗ audit_logs - All general audit entries
-- ============================================================
