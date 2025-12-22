# Debug Reports Not Generating

## Step 1: Run Database Tests

Execute `test_report_generation.sql` in Supabase SQL Editor to:
1. Check if table exists
2. See existing reports
3. Check payroll signoff status
4. Verify your user role
5. Insert a test report
6. Verify RLS policies work

## Step 2: Test Manual Report Generation

1. **Refresh your browser** (Cmd + Shift + R)
2. **Go to Employees page**
3. **Select December 2024**
4. **Look for purple button** "🔄 Generate Report" (appears only if Finance has approved)
5. **Click the button**
6. **Watch browser console** for these messages:
   ```
   🔄 Starting report generation for December 2024
   📊 Employees with payroll: X
   💰 Totals - Gross: X Deductions: X Net: X
   ✅ Finalized report generated successfully!
   ```
7. **Check for alert** "Report generated successfully for December 2024!"

## Step 3: Check Console for Errors

Open browser console (F12) and look for:
- ❌ Any red error messages
- Database errors
- RLS policy violations
- Network errors

## Step 4: Verify Database State

Run this in Supabase SQL Editor:

```sql
-- Check if Finance approved December 2024
SELECT * FROM payroll_signoffs 
WHERE month = 12 AND year = 2024 
AND finance_signoff_at IS NOT NULL;

-- Check if report exists
SELECT * FROM payroll_reports 
WHERE month = 12 AND year = 2024;
```

## Step 5: Common Issues & Fixes

### Issue 1: Button Not Appearing
**Cause**: Finance hasn't approved OR you're not logged in as Finance
**Fix**: 
- Ensure Finance has clicked "Approve" on payroll
- Check `payroll_signoffs` table for `finance_signoff_at`
- Verify you're logged in as Finance role

### Issue 2: No Console Logs
**Cause**: Function not being called
**Fix**:
- Check if `handleGlobalFinanceAction` is calling `generateFinalizedReport()`
- Add `console.log('Finance approved!')` before the function call
- Verify the approval dialog is working

### Issue 3: Database Error in Console
**Cause**: RLS policy blocking insert OR missing columns
**Fix**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'payroll_reports';

-- Verify table structure
\d payroll_reports
```

### Issue 4: Report Data is Empty
**Cause**: No employees or payroll data for that month
**Fix**:
- Check `employees` table has data
- Check `monthly_payroll` table has data for that month
- Run: `SELECT COUNT(*) FROM monthly_payroll WHERE month = 12 AND year = 2024`

### Issue 5: RLS Policy Violation
**Error**: "new row violates row-level security policy"
**Fix**:
```sql
-- Check your role
SELECT role FROM user_profiles WHERE id = auth.uid();

-- Temporarily disable RLS for testing
ALTER TABLE payroll_reports DISABLE ROW LEVEL SECURITY;

-- Test insert
INSERT INTO payroll_reports (...) VALUES (...);

-- Re-enable RLS
ALTER TABLE payroll_reports ENABLE ROW LEVEL SECURITY;
```

## Step 6: Manual Test Insert

If automatic generation fails, try manual insert:

```sql
INSERT INTO payroll_reports (
  month,
  year,
  report_name,
  report_type,
  total_employees,
  total_gross_salary,
  total_deductions,
  total_net_salary,
  is_finalized,
  finalized_at,
  generated_by,
  finance_approved_by,
  report_data
) VALUES (
  12,
  2024,
  'Manual Test - Payroll Report - December 2024',
  'snapshot',
  5,
  50000.00,
  5000.00,
  45000.00,
  true,
  NOW(),
  auth.uid(),
  auth.uid(),
  '[]'::jsonb
);
```

If this works, the issue is in the application code.
If this fails, the issue is with database permissions.

## Step 7: Check Application Logs

Look for these specific logs in browser console:

### When Finance Approves:
```
🔄 Starting report generation for December 2024
```
**If missing**: Function not being called

### After Employee Count:
```
📊 Employees with payroll: 5
```
**If 0**: No employee data

### After Calculations:
```
💰 Totals - Gross: 50000 Deductions: 5000 Net: 45000
```
**If all 0**: Payroll data missing

### On Success:
```
✅ Finalized report generated successfully!
```
**If missing**: Database insert failed

### On Error:
```
❌ Database error: [error details]
```
**Check error message** for specific issue

## Step 8: Force Report Generation

If automatic generation still doesn't work:

1. **Use the purple button** "🔄 Generate Report" on Employees page
2. This manually triggers the same function
3. Watch console for detailed logs
4. Check if report appears in Reports page

## Step 9: Verify Reports Page

1. Navigate to `http://localhost:5173/reports`
2. Hard refresh (Cmd + Shift + R)
3. Check browser console for fetch errors
4. Look for:
   - Loading spinner
   - "No finalized reports yet" message
   - Table with reports

## Step 10: Check Network Tab

1. Open DevTools → Network tab
2. Refresh Reports page
3. Look for request to `/rest/v1/payroll_reports`
4. Check response:
   - Status 200 = Success
   - Status 403 = Permission denied (RLS issue)
   - Status 404 = Table not found
   - Empty array [] = No reports in database

## Quick Diagnostic Script

Run this in browser console on Employees page:

```javascript
// Check if function exists
console.log('generateFinalizedReport exists:', typeof generateFinalizedReport)

// Check payroll signoff
console.log('Payroll signoff:', payrollSignOff)

// Check if Finance approved
console.log('Finance approved:', !!payrollSignOff?.finance_signoff_at)

// Check employee count
console.log('Employee count:', employees.length)

// Check profile
console.log('Profile:', profile)
console.log('Is Finance:', isFinance)
```

## Expected Behavior

✅ **When Finance clicks "Approve":**
1. Payroll is approved (saved to `payroll_signoffs`)
2. `generateFinalizedReport()` is called automatically
3. Console shows progress logs
4. Report is saved to `payroll_reports`
5. Alert shows "Report generated successfully"
6. Report appears in Reports tab immediately

✅ **When clicking "🔄 Generate Report" button:**
1. Same as above, but triggered manually
2. Can be used multiple times (upserts existing report)

## Success Criteria

- [ ] Console shows all 4 emoji logs (🔄 📊 💰 ✅)
- [ ] Alert appears with success message
- [ ] Report appears in `payroll_reports` table
- [ ] Report shows in Reports page
- [ ] Excel download works
- [ ] PDF download works

## If Nothing Works

1. **Check Supabase dashboard** for slow queries or errors
2. **Verify table exists**: `SELECT * FROM payroll_reports LIMIT 1`
3. **Check RLS**: `SELECT * FROM pg_policies WHERE tablename = 'payroll_reports'`
4. **Test with RLS disabled** temporarily
5. **Check browser console** for any JavaScript errors
6. **Verify imports** in Employees.tsx (getMonthName, supabase, etc.)
