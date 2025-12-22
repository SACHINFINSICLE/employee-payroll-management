# Employee-Level Lock Implementation

## Overview
Implemented employee-level field locking to ensure that once HR or Finance locks an employee's record for a specific month, the respective fields become non-editable.

## Changes Made

### 1. Updated `useFieldAccess` Hook (`src/hooks/useFieldAccess.ts`)

**Modified the `canEdit` function** to accept two additional parameters:
- `employeeHRLocked: boolean` - Indicates if this specific employee has been locked by HR
- `employeeFinanceLocked: boolean` - Indicates if this specific employee has been locked by Finance

**Logic:**
- **HR users** can edit their assigned fields only if:
  1. HR hasn't signed off globally (`!hrSignedOff`)
  2. This specific employee hasn't been HR locked (`!employeeHRLocked`)

- **Finance users** can edit their assigned fields only if:
  1. Finance hasn't signed off globally (`!financeSignedOff`)
  2. This specific employee hasn't been Finance locked (`!employeeFinanceLocked`)

- **Admin users** can always edit (unless Finance has signed off globally)

### 2. Updated `Employees.tsx` Component (`src/pages/Employees.tsx`)

**Added employee lock state extraction:**
```typescript
// Check individual employee locks
const employeeLock = employeeLocks.get(emp.id)
const isHRLocked = employeeLock?.hr_locked || false
const isFinanceLocked = employeeLock?.finance_locked || false
```

**Updated all `canEdit` calls** to pass the employee-level lock status:
```typescript
canEdit('field_name', hrSigned, finSigned, isHRLocked, isFinanceLocked)
```

This affects all editable fields:
- Employee fields: `employment_status`, `designation`, `department`, `joining_date`, `end_date`, `current_salary`, `pf_applicable`, `esi_applicable`, `bank_account_number`, `bank_name`, `bank_ifsc_code`
- Payroll fields: `deduction_type`, `deduction_amount`, `addition_type`, `addition_amount`, `incentive_type`, `incentive_amount`, `pf_amount`, `esi_amount`, `hr_remark`, `payment_status`

## How It Works

### For HR Users:
1. HR can edit all HR-assigned fields for employees
2. Once HR clicks the lock icon for an employee, that employee's HR fields become non-editable
3. HR can still unlock the employee to make changes (until global HR sign-off)
4. Once global HR sign-off happens, no HR fields can be edited

### For Finance Users:
1. Finance can edit all Finance-assigned fields for employees
2. Once Finance clicks the lock icon for an employee, that employee's Finance fields become non-editable
3. Finance can still unlock the employee to make changes (until global Finance sign-off)
4. Once global Finance sign-off happens, no Finance fields can be edited

### Lock Icon Behavior:
- HR lock icon appears when payroll status is `pending`
- Finance lock icon appears when payroll status is `hr_signed`
- Locks are employee-specific and month-specific
- The system validates required fields before allowing a lock

## Database Integration

The implementation uses the existing `employee_payroll_locks` table which tracks:
- `hr_locked`: Boolean indicating if HR has locked this employee
- `hr_locked_by`: User ID who performed the HR lock
- `hr_locked_at`: Timestamp of HR lock
- `finance_locked`: Boolean indicating if Finance has locked this employee
- `finance_locked_by`: User ID who performed the Finance lock
- `finance_locked_at`: Timestamp of Finance lock
- `payroll_id`: Links to the specific month/year payroll cycle
- `employee_id`: Links to the specific employee

## Benefits

1. **Granular Control**: Lock employees individually as their data is verified
2. **Prevents Accidental Changes**: Once locked, fields cannot be edited by the respective department
3. **Clear Visual Feedback**: Lock icons show the current lock status
4. **Audit Trail**: Lock actions are tracked with user ID and timestamp
5. **Progressive Workflow**: HR locks first, then Finance locks after HR sign-off

## Testing Checklist

- [ ] HR user can edit fields before locking an employee
- [ ] HR user cannot edit HR fields after locking an employee
- [ ] HR user can unlock and re-lock an employee (before global sign-off)
- [ ] Finance user can edit fields before locking an employee
- [ ] Finance user cannot edit Finance fields after locking an employee
- [ ] Finance user can unlock and re-lock an employee (before global sign-off)
- [ ] Admin can always edit (until global Finance sign-off)
- [ ] Lock status persists across page refreshes
- [ ] Lock icons display correctly based on payroll status
