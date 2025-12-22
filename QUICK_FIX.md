# Quick Fix - Reports Not Generating

## Immediate Action Steps

### 1. Hard Refresh Browser
```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### 2. Check for Purple Button
- Go to Employees page
- Select **December 2024** (not 2025!)
- If Finance has approved, you'll see: **🔄 Generate Report** button
- Click it
- Watch console for logs

### 3. Run Test SQL
Copy and paste this into Supabase SQL Editor:

```sql
-- Test 1: Check existing reports
SELECT month, year, report_name, is_finalized 
FROM payroll_reports 
ORDER BY year DESC, month DESC;

-- Test 2: Check Finance approvals
SELECT month, year, finance_signoff_at 
FROM payroll_signoffs 
WHERE finance_signoff_at IS NOT NULL
ORDER BY year DESC, month DESC;

-- Test 3: Insert test report for December 2024
INSERT INTO payroll_reports (
  month, year, report_name, report_type,
  total_employees, total_gross_salary, total_deductions, total_net_salary,
  is_finalized, finalized_at, report_data
) VALUES (
  12, 2024, 'TEST - December 2024', 'snapshot',
  1, 10000, 1000, 9000,
  true, NOW(), '[]'::jsonb
)
ON CONFLICT (month, year, report_type) DO UPDATE
SET report_name = 'TEST - December 2024 (Updated)';

-- Test 4: Verify it was inserted
SELECT * FROM payroll_reports WHERE month = 12 AND year = 2024;
```

### 4. Check Reports Page
- Go to: `http://localhost:5173/reports`
- Hard refresh
- You should see the TEST report
- Try downloading Excel and PDF

## What Console Should Show

When you click "🔄 Generate Report":

```
🔄 Starting report generation for December 2024
📊 Employees with payroll: 5
💰 Totals - Gross: 50000 Deductions: 5000 Net: 45000
✅ Finalized report generated successfully!
```

Then an alert: "Report generated successfully for December 2024!"

## If Still Not Working

### Check 1: Are you Finance role?
```sql
SELECT email, role FROM user_profiles WHERE id = auth.uid();
```

### Check 2: Is Finance approved?
```sql
SELECT * FROM payroll_signoffs 
WHERE month = 12 AND year = 2024 
AND finance_signoff_at IS NOT NULL;
```

### Check 3: Can you insert manually?
If the SQL insert above worked, the database is fine.
If it failed, check the error message.

### Check 4: Browser Console Errors?
Press F12, look for red errors.

## Most Likely Issues

1. **Wrong year**: You said "dec 2025" but system might expect 2024
2. **Finance not approved**: Check payroll_signoffs table
3. **RLS blocking**: Your role might not have permission
4. **Reports.tsx not loaded**: File was empty, now recreated

## Next Steps

1. Run the test SQL above
2. Check if TEST report appears in Reports page
3. If yes: Database works, issue is in auto-generation
4. If no: Database/RLS issue

5. Click purple "🔄 Generate Report" button
6. Watch console for logs
7. Report any errors you see

## Contact Points

Share these with me:
1. Console logs (all 4 emoji messages)
2. Any error messages
3. Result of test SQL queries
4. Your user role from user_profiles table
