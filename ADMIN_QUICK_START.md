# Admin Quick Start Guide - Access Control Configuration

## Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `page_field_access_migration.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute the migration
6. Verify success message appears

## Step 2: Access Admin Settings

1. Login to the application as an **Admin** user
2. Click on **Settings** in the sidebar
3. You should see multiple tabs at the top

## Step 3: Configure Page Access

1. Click on the **"Page Access Control"** tab (first tab)
2. You'll see a table with 4 pages:
   - Dashboard
   - Employees
   - Reports
   - Settings

3. For each page, you can toggle:
   - **HR Can Access** - Whether HR users can see this page
   - **Finance Can Access** - Whether Finance users can see this page

4. **Default Configuration** (already set by migration):
   - Dashboard: ✅ HR, ✅ Finance
   - Employees: ✅ HR, ✅ Finance
   - Reports: ✅ HR, ✅ Finance
   - Settings: ❌ HR, ❌ Finance (locked to Admin only)
   
   **Note**: By default, all pages (except Settings) are accessible to all users. You can restrict access as needed.

5. **To Change Access**:
   - Simply toggle the switches
   - Changes save automatically
   - Users will see changes on next page refresh

## Step 4: Configure Field Access

1. Click on the **"Field Access Control"** tab (second tab)
2. You'll see a table with 22 fields used in the Employees page

3. For each field, you can toggle:
   - **HR Can Edit** - Whether HR can edit this field
   - **Finance Can Edit** - Whether Finance can edit this field
   - **Visible** - Whether the field is visible to non-admin users

4. **Default Configuration** (already set by migration):

   **HR-Managed Fields**:
   - Employee info (ID, name, status, designation, department)
   - Salary and statutory settings (salary, PF/ESI applicable)
   - Payroll types (deduction type, addition type, incentive type)
   - HR remarks

   **Finance-Managed Fields**:
   - Payroll amounts (deduction, addition, incentive amounts)
   - Statutory amounts (PF amount, ESI amount)
   - Payment status

   **Shared Fields**:
   - Amounts can be edited by both HR and Finance

5. **To Change Access**:
   - Toggle the switches as needed
   - Changes save automatically
   - Changes take effect immediately in the Employees page

## Step 5: Test with Different Roles

### Test as HR User
1. Logout and login as an HR user
2. Check sidebar - should see: Dashboard, Employees, Reports (all pages by default)
3. Go to Employees page
4. Try editing fields - should be able to edit HR-assigned fields only
5. Try accessing /settings directly - should redirect to dashboard

### Test as Finance User
1. Logout and login as a Finance user
2. Check sidebar - should see: Dashboard, Employees, Reports
3. Go to Employees page
4. Try editing fields - should be able to edit Finance-assigned fields
5. Try accessing /settings directly - should redirect to dashboard

### Test as Admin User
1. Logout and login as an Admin user
2. Check sidebar - should see all pages
3. Can access and edit everything

## Common Configuration Scenarios

### Scenario 1: Restrict HR Access to Reports
1. Go to Settings > Page Access Control
2. Find "Reports" row
3. Toggle "HR Can Access" to OFF
4. HR users will no longer see Reports in their sidebar

### Scenario 2: Let Finance Edit Deduction Types
1. Go to Settings > Field Access Control
2. Find "deduction_type" row
3. Toggle "Finance Can Edit" to ON
4. Finance users can now edit deduction types

### Scenario 3: Hide Bank Account Numbers
1. Go to Settings > Field Access Control
2. Find "bank_account_number" row
3. Toggle "Visible" to OFF
4. Field will be hidden from non-admin users

### Scenario 4: Let HR Edit Payment Status
1. Go to Settings > Field Access Control
2. Find "payment_status" row
3. Toggle "HR Can Edit" to ON
4. HR users can now edit payment status

## Important Notes

### Page Access
- **Admin** always has access to all pages (cannot be changed)
- **Settings** page is always restricted to Admin only (cannot be changed)
- Changes require users to refresh their browser to see updated sidebar
- Direct URL navigation is also protected (users get redirected)

### Field Access
- **Admin** can always edit all fields (cannot be changed)
- **Net Pay** is calculated and cannot be edited by anyone
- Changes take effect immediately (no refresh needed)
- Sign-off workflow still applies:
  - After HR sign-off: HR cannot edit their fields
  - After Finance approval: No one can edit (payroll locked)

### Best Practices
1. **Test changes** with a test user before applying to production
2. **Document your configuration** if you deviate from defaults
3. **Communicate changes** to your team when permissions change
4. **Review regularly** to ensure permissions match your workflow

## Troubleshooting

### Issue: Changes not appearing
- **Solution**: Ask users to refresh their browser (Ctrl+F5 or Cmd+Shift+R)

### Issue: User can't access a page they should
- **Solution**: Check Page Access Control settings for that page and role

### Issue: User can't edit a field they should
- **Solution**: 
  1. Check Field Access Control settings
  2. Check if payroll is signed off (fields lock after sign-off)
  3. Verify user has correct role in their profile

### Issue: Settings page not loading
- **Solution**: Ensure migration was run successfully and user is Admin

## Support

For technical issues or questions about the access control system, refer to:
- **PAGE_ACCESS_MODEL.md** - Detailed page access documentation
- **FIELD_ACCESS_ANALYSIS.md** - Complete field mapping analysis
- **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
