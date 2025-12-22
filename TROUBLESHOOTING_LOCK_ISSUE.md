# Troubleshooting: Unable to Lock Employees

## Issue
Unable to lock employees using the paddle lock icon even though all required HR data has been filled according to admin settings.

---

## Quick Fix (Most Likely Solution)

### The validation functions haven't been applied to the database yet!

**Run this migration immediately:**

```bash
# Using Supabase CLI
supabase db execute -f add_employee_validation_for_locks.sql

# OR manually in Supabase SQL Editor:
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy and paste contents of add_employee_validation_for_locks.sql
# 3. Click "Run"
```

After running the migration, **refresh your browser** and the locks should work.

---

## Diagnostic Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to Console tab
3. Look for errors when clicking the lock icon

**Expected messages if functions are missing:**
```
HR Validation RPC error: {code: '42883', ...}
can_hr_lock_employee function not found - allowing lock
```

If you see these messages, the validation functions don't exist yet. **Run the migration above.**

---

### Step 2: Verify Functions Exist in Database

Run this in Supabase SQL Editor:

```sql
-- Check if validation functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('can_hr_lock_employee', 'can_finance_lock_employee')
  AND routine_schema = 'public';
```

**Expected Result:** 2 rows showing both functions

**If no rows returned:** Functions don't exist - run `add_employee_validation_for_locks.sql`

---

### Step 3: Check Lock Requirements Configuration

Run this in Supabase SQL Editor:

```sql
-- Check what fields are required for HR lock
SELECT 
  field_name,
  display_name,
  required_for_hr_lock,
  required_for_finance_lock
FROM payroll_lock_requirements
WHERE required_for_hr_lock = true
ORDER BY display_name;
```

**This shows which fields must be filled for HR to lock an employee.**

Common required fields:
- Employee ID
- Full Name
- Email
- Department
- Designation
- Basic Salary
- PF Applicable
- ESI Applicable

---

### Step 4: Test Validation on Specific Employee

Replace `YOUR-EMPLOYEE-UUID` with actual employee ID:

```sql
-- Test HR validation
SELECT * FROM can_hr_lock_employee('YOUR-EMPLOYEE-UUID');

-- Result shows:
-- can_lock: true/false
-- missing_fields: array of missing field names
```

**Example output if employee is incomplete:**
```
can_lock: false
missing_fields: ["Email", "Department"]
```

---

### Step 5: Verify Employee Data

Check if the employee actually has all required fields filled:

```sql
-- Replace with your employee ID
SELECT 
  employee_id,
  employee_name,
  email,
  department,
  designation,
  current_salary,
  pf_applicable,
  esi_applicable,
  bank_name,
  account_number,
  ifsc_code
FROM employees
WHERE id = 'YOUR-EMPLOYEE-UUID';
```

**Check for:**
- NULL values
- Empty strings ('')
- Zero values for salary

---

## Common Issues & Solutions

### Issue 1: Functions Not Found (Error 42883)
**Symptom:** Console shows "function not found" error

**Solution:** Run the migration:
```bash
supabase db execute -f add_employee_validation_for_locks.sql
```

---

### Issue 2: Lock Button Disabled with Warning Icon
**Symptom:** Lock icon shows ⚠️ and is disabled

**Solution:** 
1. Hover over the lock icon to see missing fields
2. Fill in the missing fields for that employee
3. Save the employee record
4. Refresh the page
5. Lock icon should now be enabled

---

### Issue 3: Lock Requirements Not Configured
**Symptom:** No requirements showing in database

**Solution:** Run the initial migration:
```bash
supabase db execute -f payroll_finalization_migration.sql
```

This creates the `payroll_lock_requirements` table with default requirements.

---

### Issue 4: Field Name Mismatch
**Symptom:** Validation fails even though data looks complete

**Possible cause:** Field names in validation function don't match employee table columns

**Check employee table structure:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
```

**Validation function expects these column names:**
- `employee_id` (not `emp_id`)
- `employee_name` (not `full_name`)
- `current_salary` (not `basic_salary`)
- `email`
- `department`
- `designation`
- `pf_applicable`
- `esi_applicable`
- `bank_name`
- `account_number`
- `ifsc_code`

---

### Issue 5: PF/ESI Fields Are NULL
**Symptom:** Validation fails on PF Applicable or ESI Applicable

**Solution:** These fields must be set to either 'Yes' or 'No', not NULL

Update employee:
```sql
UPDATE employees
SET 
  pf_applicable = 'Yes',  -- or 'No'
  esi_applicable = 'Yes'  -- or 'No'
WHERE id = 'YOUR-EMPLOYEE-UUID';
```

---

## Testing After Fix

1. **Refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. Navigate to Employees page
3. Check an employee with complete data
4. Lock icon should be enabled (no warning)
5. Click lock icon
6. Should lock successfully
7. Check lock count updates (e.g., 1/20)

---

## Still Not Working?

### Enable Debug Mode

Add this to browser console:
```javascript
localStorage.setItem('debug', 'true')
```

Then check console for detailed validation logs.

### Check Network Tab

1. Open DevTools → Network tab
2. Click lock icon
3. Look for RPC call to `can_hr_lock_employee`
4. Check request/response

**Expected request:**
```json
{
  "p_employee_id": "uuid-here"
}
```

**Expected response:**
```json
{
  "can_lock": true,
  "missing_fields": []
}
```

---

## Manual Override (Temporary)

If you need to lock employees immediately while debugging:

**Option 1: Disable validation temporarily**

In `src/hooks/usePayrollFinalization.ts`, the validation functions now have backward compatibility - they return `can_lock: true` if the database functions don't exist.

**Option 2: Lock directly in database**

```sql
-- Create/update lock record directly
INSERT INTO employee_payroll_locks (
  employee_id,
  payroll_id,
  hr_locked,
  hr_locked_by,
  hr_locked_at
) VALUES (
  'EMPLOYEE-UUID',
  'PAYROLL-UUID',
  true,
  'YOUR-USER-UUID',
  NOW()
)
ON CONFLICT (employee_id, payroll_id) 
DO UPDATE SET 
  hr_locked = true,
  hr_locked_by = EXCLUDED.hr_locked_by,
  hr_locked_at = NOW();
```

---

## Files to Check

1. ✅ `add_employee_validation_for_locks.sql` - Validation functions
2. ✅ `fix_lock_stats_counting.sql` - Lock count fix
3. ✅ `src/hooks/usePayrollFinalization.ts` - Frontend validation logic
4. ✅ `src/components/PayrollLockIcon.tsx` - Lock icon component
5. ✅ `src/pages/Employees.tsx` - Employee page with locks

---

## Contact Points

If issue persists:
1. Check all migrations have been run in order
2. Verify Supabase connection is working
3. Check user has proper permissions (HR role)
4. Verify payroll cycle exists for current month/year
