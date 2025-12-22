# Payroll Finalization - Quick Start Guide

## Step 1: Apply Database Migration

You need to run the SQL migration file in your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `payroll_finalization_migration.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl/Cmd + Enter`
7. Verify success message appears

### Option B: Using Command Line
```bash
# If you have psql installed and Supabase connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f payroll_finalization_migration.sql
```

## Step 2: Verify Migration

Check that the following tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'monthly_payrolls',
  'employee_payroll_locks',
  'payroll_lock_requirements',
  'payroll_audit_log'
);
```

You should see all 4 tables listed.

## Step 3: Test the System

### As HR User:
1. **Navigate to Employees page**
2. **Select month/year** (top right)
3. **Lock employees**:
   - Click blue padlock icon for each employee
   - Watch progress indicator: "X/Y employees locked"
4. **Sign off**:
   - Once all locked, "HR Sign Off" button becomes enabled
   - Click button, select month/year, confirm
   - Status changes to 🔵 HR Signed

### As Finance User:
1. **Navigate to Employees page**
2. **View HR-signed payroll**
3. **Lock employees**:
   - Click green padlock icon for each employee
   - Watch progress indicator
4. **Sign off**:
   - Click "Finance Sign Off" button
   - Select HR-signed month from dropdown
   - Confirm
   - Status changes to 🟢 Finalized
   - Payroll becomes read-only

### As Admin:
1. **Configure Lock Requirements**:
   - Go to Settings → Lock Requirements tab
   - Toggle which fields are required before locking
   - Save changes

2. **Revert Payroll** (if needed):
   - Go to Settings → Revert Payroll tab
   - Select finalized payroll
   - Provide reason
   - Confirm reversion
   - Status returns to 🟡 Pending

## Step 4: Verify Features

### Check Lock Icons
- [ ] Blue padlock icons appear for HR (when status is Pending)
- [ ] Green padlock icons appear for Finance (when status is HR Signed)
- [ ] Icons toggle between locked/unlocked states
- [ ] Tooltips show lock status and who locked

### Check Progress Indicators
- [ ] HR progress bar shows correct count
- [ ] Finance progress bar shows correct count
- [ ] "Ready" badge appears when all locked
- [ ] Counts update in real-time

### Check Sign-off Flow
- [ ] HR button disabled until all employees locked
- [ ] Finance button disabled until all employees locked
- [ ] Month/year selection works correctly
- [ ] Status badges update properly
- [ ] Modals close after successful sign-off

### Check Read-only Mode
- [ ] Finalized payrolls cannot be edited
- [ ] Input fields are disabled
- [ ] Lock icons don't appear
- [ ] Green success message shows

### Check Admin Features
- [ ] Lock requirements can be configured
- [ ] Payroll can be reverted with reason
- [ ] Audit log captures all actions
- [ ] Only admin can access revert feature

## Common Issues & Solutions

### Issue: Lock icons not showing
**Solution**: 
- Verify user role in `user_profiles` table
- Check payroll status matches role requirements
- Ensure `currentPayroll` is loaded (check browser console)

### Issue: Sign-off button always disabled
**Solution**:
- Ensure at least one employee exists
- Verify all employees are locked
- Check `lockStats` in browser console
- Run: `SELECT * FROM get_payroll_lock_stats('[payroll_id]')`

### Issue: Modal doesn't open
**Solution**:
- Check browser console for errors
- Verify button onClick handlers
- Check state variables in React DevTools

### Issue: Database permission errors
**Solution**:
- Verify RLS policies are enabled
- Check user has proper role in `user_profiles`
- Ensure authenticated user exists

### Issue: Migration fails
**Solution**:
- Check if tables already exist (drop them first if testing)
- Verify you have proper database permissions
- Run migration line by line to identify issue
- Check Supabase logs for detailed error

## Testing Checklist

- [ ] HR can lock employees
- [ ] HR can unlock employees
- [ ] HR can sign off when all locked
- [ ] Finance can lock after HR sign-off
- [ ] Finance can sign off when all locked
- [ ] Payroll becomes read-only after finalization
- [ ] Admin can configure lock requirements
- [ ] Admin can revert finalized payrolls
- [ ] New employees after finalization work correctly
- [ ] Audit log captures all actions
- [ ] Progress indicators update correctly
- [ ] Status badges show correct state
- [ ] Tooltips display lock information

## Next Steps

1. ✅ Run migration
2. ✅ Test HR workflow
3. ✅ Test Finance workflow
4. ✅ Test Admin features
5. ✅ Verify audit trail
6. ✅ Test edge cases (new employees, reversion)
7. ✅ Review security (RLS policies)
8. ✅ Train users on new workflow

## Support

For detailed implementation information, see:
- `IMPLEMENTATION_COMPLETE.md` - Full feature documentation
- `PAYROLL_FINALIZATION_IMPLEMENTATION.md` - Technical details
- `payroll_finalization_migration.sql` - Database schema

## Success!

Once you've completed all steps and verified the features, your payroll finalization system is ready for production use! 🎉

The system provides:
- ✅ Dual lock mechanism (HR & Finance)
- ✅ Progress tracking
- ✅ Month/year selection
- ✅ Status indicators
- ✅ Admin controls
- ✅ Complete audit trail
- ✅ Read-only finalized payrolls
