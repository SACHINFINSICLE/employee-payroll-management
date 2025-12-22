# Signoff Override Feature

## Overview
A new **Signoff Override** tab has been added to the Admin Settings page to facilitate testing during development. This feature allows administrators to reset payroll signoffs while preserving all employee payroll data.

## Location
**Settings → Signoff Override** tab (Admin access only)

## Features

### 1. Year Selection
- Dropdown to select the year for viewing signoffs
- Defaults to the current year
- Shows years from 2 years ago to 2 years in the future

### 2. Signoff List View
The table displays all payroll signoffs for the selected year with the following information:

- **Month**: Name of the month (e.g., January, February)
- **Year**: The year of the signoff
- **HR Signoff**: Shows if HR has signed off and the date
- **Finance Signoff**: Shows if Finance has signed off and the date
- **Status**: Visual indicator showing:
  - **Complete**: Both HR and Finance have signed off (green badge)
  - **Pending Finance**: HR signed off, waiting for Finance (yellow badge)
  - **Not Started**: No signoffs yet (gray badge)
- **Remarks**: Any remarks associated with the signoff
- **Actions**: Override button to reset the signoff

### 3. Override Functionality

#### What it does:
- Resets both HR and Finance signoffs for the selected month
- Sets `hr_signoff_at`, `hr_signoff_by`, `finance_signoff_at`, and `finance_signoff_by` to `null`
- Updates remarks to indicate admin override: `[ADMIN OVERRIDE] Signoff reset for testing purposes`
- **Preserves all employee payroll data** - no employee records are modified

#### How to use:
1. Navigate to **Settings → Signoff Override**
2. Select the year you want to view
3. Find the month you want to override
4. Click the **Override** button
5. Confirm the action in the dialog
6. The signoff will be reset, allowing you to re-test the signoff workflow

#### Restrictions:
- Only enabled for signoffs that have at least one signoff (HR or Finance)
- Disabled for months with no signoffs
- Shows loading state while processing

## Use Cases

### Development Testing
- Test the HR signoff workflow multiple times
- Test the Finance approval/rejection workflow
- Verify signoff validation logic
- Test signoff cancellation features

### Data Integrity
- All employee payroll data remains intact
- Only the signoff status is reset
- Monthly payroll records are preserved
- Deductions, additions, and incentives remain unchanged

## Technical Details

### Database Changes
The override operation updates the `payroll_signoffs` table:
```sql
UPDATE payroll_signoffs
SET 
  hr_signoff_at = NULL,
  hr_signoff_by = NULL,
  finance_signoff_at = NULL,
  finance_signoff_by = NULL,
  remarks = '[ADMIN OVERRIDE] Signoff reset for testing purposes'
WHERE id = <signoff_id>
```

### No Impact on Employee Data
The following tables are **NOT** affected:
- `employees`
- `monthly_payroll`
- `deductions`
- `additions`
- `incentives`

## Security

- **Admin Only**: This feature is only accessible to users with the `admin` role
- **Confirmation Required**: Users must confirm the override action
- **Audit Trail**: The remarks field is updated to indicate an admin override occurred

## Important Notes

⚠️ **Development Feature**: This feature is intended for development and testing purposes only. In production, consider:
- Removing this feature
- Adding additional audit logging
- Implementing stricter access controls
- Adding approval workflows for overrides

## Future Enhancements

Potential improvements for production use:
1. Add detailed audit logging with timestamp and admin user
2. Implement a "restore previous signoff" feature
3. Add email notifications when overrides occur
4. Create a separate audit log table for override history
5. Add ability to override with custom remarks
