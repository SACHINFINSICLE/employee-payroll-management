# Deployment Steps for Payroll System Updates

## 🚀 Quick Start

### Step 1: Database Migration (REQUIRED)
Before running the application, you **MUST** create the new database table.

1. **Open Supabase Dashboard**
   - URL: https://lejgupfetoonfoohacrp.supabase.co
   - Navigate to: **SQL Editor**

2. **Run Migration**
   - Open the file: `payroll_signoffs_migration.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Table Created**
   - Go to **Table Editor** in Supabase
   - You should see a new table: `payroll_signoffs`

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Start Development Server
```bash
npm run dev
```

## ✨ What's New

### 1. **Collapsible Sidebar**
- Sidebar now starts in collapsed state (icon-only)
- Click the toggle button (chevron) to expand/collapse
- Hover over icons to see tooltips when collapsed

### 2. **Enhanced Field Visibility**
- Both HR and Finance users can now see ALL fields
- Editing permissions are still controlled by admin settings
- Finance can edit their fields independently (no need to wait for HR)

### 3. **Global Payroll Sign-off**
- **NEW**: Sign-off is now for the entire payroll, not per employee
- **HR Sign-off Button**: Only enabled when ALL employees have complete data
- **Finance Approval**: Can approve or reject entire payroll after HR sign-off
- **Status Card**: Shows current payroll status with badges

### 4. **Smart Validation**
The system validates that all employees have:
- ✅ Employee ID and Name
- ✅ Employment Status
- ✅ Current Salary (> 0)
- ✅ Deduction Type selected
- ✅ Addition Type selected
- ✅ HR Remark selected

If any employee is missing data, the HR sign-off button is disabled with a helpful tooltip.

## 📋 User Workflows

### For HR Users:
1. Navigate to **Employees** page
2. Fill in all required fields for all employees
3. Click **Init Payroll** if needed to create payroll records
4. Once all data is complete, the **HR Sign Off** button becomes enabled
5. Click **HR Sign Off** and optionally add remarks
6. Payroll status changes to "Pending Finance"

### For Finance Users:
1. Navigate to **Employees** page
2. Review all employee payroll data
3. Edit Finance-specific fields if needed (PF, ESI, Payment Status)
4. Once satisfied, click **Approve Payroll**
5. Or click **Reject** to send back to HR with remarks
6. After approval, payroll is locked and status shows "Approved"

### For Admin Users:
- Access **Settings** page to configure field permissions
- Control which fields HR and Finance can edit
- Both roles can view all fields by default

## 🔒 Security & Permissions

- Row Level Security (RLS) enabled on new table
- Only HR, Finance, and Admin can create/update sign-offs
- All authenticated users can view sign-off status
- Field editing respects admin-configured permissions

## 🐛 Troubleshooting

### "Cannot read properties of null" error
- **Cause**: Database table not created
- **Solution**: Run the SQL migration (Step 1 above)

### Sign-off button stays disabled
- **Cause**: Some employees have incomplete data
- **Solution**: Hover over the button to see tooltip, check all employees have required fields filled

### Fields are not editable
- **Cause**: Payroll has been signed off
- **Solution**: This is expected behavior. Finance must reject to unlock fields

### Sidebar doesn't collapse
- **Cause**: Browser cache issue
- **Solution**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## 📞 Support

If you encounter any issues:
1. Check browser console for errors (F12)
2. Verify database migration was successful
3. Check Supabase logs for any database errors
4. Ensure all environment variables are set correctly in `.env`

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ Sidebar collapses and expands smoothly
- ✅ Both HR and Finance can see all employee fields
- ✅ Global sign-off card appears above employee table
- ✅ HR sign-off button enables when all data is complete
- ✅ Finance can approve/reject after HR sign-off
- ✅ Status badges show correct payroll state
