# Fix: Employee Delete Not Working

## Problem
Employees appear to be deleted (success message shows) but remain in the database after refresh. No errors appear in the console.

## Root Cause
**Missing DELETE policy in Row Level Security (RLS)**

The `employees` table has RLS enabled but lacks a DELETE policy. Without this policy, Supabase silently blocks DELETE operations, returning success without actually deleting the data.

## Solution

### Step 1: Apply the DELETE Policy

Run the SQL migration file `employees_delete_policy.sql` in your Supabase SQL Editor:

```sql
-- Add DELETE policy for employees table
DROP POLICY IF EXISTS "HR, Finance and Admin can delete employees" ON employees;

CREATE POLICY "HR, Finance and Admin can delete employees" ON employees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'finance', 'admin')
    )
  );
```

### Step 2: Verify Policy Creation

After running the migration, verify the policy exists:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'employees';
```

You should see a policy for DELETE operations.

### Step 3: Test the Delete Functionality

1. Refresh your application
2. Try deleting an employee
3. Check the browser console for logs:
   - "Delete result: [...]" - Shows deleted data
   - Any error messages if deletion fails
4. Refresh the page to confirm employee is gone

## How to Apply the Fix

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `employees_delete_policy.sql`
4. Paste and run the SQL
5. Verify success message

### Option 2: Using Supabase CLI (if set up)
```bash
supabase db push employees_delete_policy.sql
```

### Option 3: Using MCP Server (if available)
Use the `apply_migration` tool with the SQL content.

## Code Changes Made

### Enhanced Error Handling
Updated `handleDeleteEmployee()` function in `/src/pages/Employees.tsx`:

**Changes:**
- Added `.select()` to get deleted data confirmation
- Added detailed console logging
- Improved error messages with specific details
- Added `await` to refetch for proper sequencing

**Before:**
```typescript
const { error } = await supabase
  .from('employees')
  .delete()
  .eq('id', employeeToDelete.id)
```

**After:**
```typescript
const { error, data } = await supabase
  .from('employees')
  .delete()
  .eq('id', employeeToDelete.id)
  .select()

if (error) {
  console.error('Delete error:', error)
  throw error
}

console.log('Delete result:', data)
```

## Why This Happened

### Row Level Security (RLS)
Supabase uses PostgreSQL's RLS feature for security. When RLS is enabled on a table, you must define policies for each operation (SELECT, INSERT, UPDATE, DELETE).

### Silent Failures
Without a DELETE policy:
- ✅ The API call succeeds (no error thrown)
- ❌ No data is actually deleted
- ❌ No error message appears
- ❌ Data persists after refresh

This is by design - RLS silently blocks unauthorized operations rather than throwing errors.

## Verification Checklist

After applying the fix:

- [ ] SQL migration runs without errors
- [ ] DELETE policy appears in `pg_policies` view
- [ ] Delete button works in UI
- [ ] Console shows "Delete result: [...]" with employee data
- [ ] Employee disappears from list after deletion
- [ ] Employee stays deleted after page refresh
- [ ] Related payroll data is also deleted (cascade)
- [ ] Error messages appear if deletion fails

## Related Tables

The DELETE policy should also cascade to related tables if foreign keys are set up with `ON DELETE CASCADE`:

- `monthly_payroll` - All payroll records for the employee
- Any other tables with foreign keys to `employees`

Verify cascade behavior:
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'employees';
```

Look for `delete_rule = 'CASCADE'` in the results.

## Prevention

To avoid similar issues in the future:

1. **Always define all CRUD policies** when enabling RLS
2. **Test each operation** (SELECT, INSERT, UPDATE, DELETE) after creating policies
3. **Check console logs** for silent failures
4. **Use `.select()` on mutations** to verify data was actually modified
5. **Review RLS policies** regularly in Supabase dashboard

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Policy Examples](https://supabase.com/docs/guides/auth/row-level-security#policy-examples)
