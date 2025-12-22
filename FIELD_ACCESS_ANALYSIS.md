# Field Access Mapping Analysis

## Overview

This document analyzes the field access control system and identifies all fields used in the Employees page, ensuring proper mapping between the UI and the `field_access_settings` table.

## Fields Used in Employees Page

### Employee Table Fields (displayed in table)
1. ✅ **employee_id** - Employee ID (read-only display)
2. ✅ **employee_name** - Employee Name (read-only display)
3. ✅ **employment_status** - Employment Status (editable)
4. ✅ **designation** - Designation (editable)
5. ✅ **department** - Department (editable)
6. ✅ **joining_date** - Joining Date (editable)
7. ✅ **end_date** - End Date (editable)
8. ✅ **current_salary** - Current Salary (editable)
9. ✅ **pf_applicable** - PF Applicable (editable)
10. ✅ **esi_applicable** - ESI Applicable (editable)
11. ✅ **bank_account_number** - Bank Account Number (editable)

### Monthly Payroll Fields (displayed in table)
12. ✅ **deduction_type** - Deduction Type (editable)
13. ✅ **deduction_amount** - Deduction Amount (editable)
14. ✅ **addition_type** - Addition Type (editable)
15. ✅ **addition_amount** - Addition Amount (editable)
16. ✅ **incentive_type** - Incentive Type (editable)
17. ✅ **incentive_amount** - Incentive Amount (editable)
18. ✅ **pf_amount** - PF Amount (editable, conditional on pf_applicable)
19. ✅ **esi_amount** - ESI Amount (editable, conditional on esi_applicable)
20. ✅ **net_pay** - Net Pay (read-only, calculated)
21. ✅ **hr_remark** - HR Remark (editable)
22. ✅ **payment_status** - Payment Status (editable)

## Field Access Settings in Database

The migration file `page_field_access_migration.sql` includes all these fields with proper mappings:

### HR-Managed Fields
- employee_id
- employee_name
- employment_status
- designation
- department
- joining_date
- end_date
- bank_account_number
- current_salary
- pf_applicable
- esi_applicable
- deduction_type
- addition_type
- incentive_type
- hr_remark

### Finance-Managed Fields
- deduction_amount
- addition_amount
- incentive_amount
- pf_amount
- esi_amount
- payment_status

### Shared Fields (HR sets type, Finance sets amount)
- Deductions: HR sets `deduction_type`, Finance can edit `deduction_amount`
- Additions: HR sets `addition_type`, Finance can edit `addition_amount`
- Incentives: HR sets `incentive_type`, Finance can edit `incentive_amount`

### Read-Only Fields
- net_pay (calculated field, not editable by anyone)

## Recommended Access Matrix

| Field Name | Display Name | HR Can Edit | Finance Can Edit | Visible |
|------------|--------------|-------------|------------------|---------|
| employee_id | Employee ID | ✅ | ❌ | ✅ |
| employee_name | Employee Name | ✅ | ❌ | ✅ |
| employment_status | Employment Status | ✅ | ❌ | ✅ |
| designation | Designation | ✅ | ❌ | ✅ |
| department | Department | ✅ | ❌ | ✅ |
| joining_date | Joining Date | ✅ | ❌ | ✅ |
| end_date | End Date | ✅ | ❌ | ✅ |
| bank_account_number | Bank Account Number | ✅ | ❌ | ✅ |
| current_salary | Current Salary | ✅ | ❌ | ✅ |
| pf_applicable | PF Applicable | ✅ | ❌ | ✅ |
| esi_applicable | ESI Applicable | ✅ | ❌ | ✅ |
| deduction_type | Deduction Type | ✅ | ❌ | ✅ |
| deduction_amount | Deduction Amount | ✅ | ✅ | ✅ |
| addition_type | Addition Type | ✅ | ❌ | ✅ |
| addition_amount | Addition Amount | ✅ | ✅ | ✅ |
| incentive_type | Incentive Type | ✅ | ❌ | ✅ |
| incentive_amount | Incentive Amount | ✅ | ✅ | ✅ |
| pf_amount | PF Amount | ❌ | ✅ | ✅ |
| esi_amount | ESI Amount | ❌ | ✅ | ✅ |
| hr_remark | HR Remark | ✅ | ❌ | ✅ |
| payment_status | Payment Status | ❌ | ✅ | ✅ |
| net_pay | Net Pay | ❌ | ❌ | ✅ |

## Issues Found and Fixed

### ✅ Issue 1: Missing Fields in field_access_settings
**Problem**: Some fields used in the Employees page might not have been in the database.

**Solution**: The migration file now includes ALL fields with proper mappings:
- All employee basic info fields
- All payroll fields
- Conditional fields (pf_applicable, esi_applicable)
- Fields not displayed in main table but in database

### ✅ Issue 2: Inconsistent Access Logic
**Problem**: The access logic needs to be clear about who can edit what.

**Solution**: 
- HR manages employee information and payroll types
- Finance manages amounts and payment status
- Both can see all fields (is_visible = true)
- Admin can edit everything

### ✅ Issue 3: No Page Access Control
**Problem**: Page access was hardcoded in the application.

**Solution**: 
- Created `page_access_settings` table
- Admin can now configure page access dynamically
- Sidebar and routes use database settings

## How Field Access Works

### 1. Field Access Hook (`useFieldAccess.ts`)
```typescript
const canEdit = (fieldName, hrSignedOff, financeSignedOff) => {
  // Check field_access_settings table
  // Apply sign-off logic
  // Return true/false
}
```

### 2. Employees Page Usage
```typescript
{canEdit('field_name', hrSigned, finSigned) && canEditRow ? (
  <Input ... />
) : (
  <ReadOnlyDisplay />
)}
```

### 3. Sign-off Logic
- Before HR sign-off: HR can edit their assigned fields
- After HR sign-off: HR cannot edit, Finance can edit their assigned fields
- After Finance sign-off: No one can edit (payroll locked)

## Testing Checklist

### Admin User
- [ ] Can see all fields in Field Access Control settings
- [ ] Can toggle HR/Finance edit permissions
- [ ] Can toggle field visibility
- [ ] Changes reflect immediately in Employees page

### HR User
- [ ] Can edit: employee info, salary, deduction/addition/incentive types, HR remark
- [ ] Cannot edit: PF/ESI amounts, payment status (Finance fields)
- [ ] Can see all visible fields
- [ ] Cannot edit after HR sign-off

### Finance User
- [ ] Can edit: deduction/addition/incentive amounts, PF/ESI amounts, payment status
- [ ] Cannot edit: employee info, salary, types (HR fields)
- [ ] Can see all visible fields
- [ ] Can edit after HR sign-off (until Finance sign-off)

## Migration Instructions

1. **Run the SQL migration**:
   ```bash
   # Open Supabase Dashboard
   # Go to SQL Editor
   # Run: page_field_access_migration.sql
   ```

2. **Verify in Admin Settings**:
   - Login as admin
   - Go to Settings > Field Access Control
   - Verify all 22 fields are listed
   - Check default permissions match the matrix above

3. **Test with Different Roles**:
   - Login as HR user
   - Try editing different fields
   - Perform HR sign-off
   - Login as Finance user
   - Verify Finance can edit their fields
   - Perform Finance approval
   - Verify payroll is locked

## Notes

- The migration uses `ON CONFLICT DO UPDATE` to safely update existing records
- All fields have proper ordering (`field_order`) for consistent display
- The `net_pay` field is visible but not editable by anyone (calculated field)
- Settings page is restricted to Admin only (cannot be changed)
