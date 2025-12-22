# Employee Lock Validation Implementation

## Problem
Employees with incomplete/limited information could be locked using the padlock icons, which should not be allowed. Payroll locks should only be possible when all required fields are filled.

## Solution Overview
Implemented a comprehensive validation system that:
1. **Database-level validation** - Functions to check if employees meet lock requirements
2. **Frontend validation** - Pre-lock checks before allowing toggle
3. **Visual indicators** - Warning icons and tooltips showing missing fields

---

## Changes Made

### 1. Database Validation Functions ✅
**File:** `add_employee_validation_for_locks.sql` (NEW)

Created two validation functions:

#### `can_hr_lock_employee(p_employee_id UUID)`
Checks if an employee meets HR lock requirements:
- Employee ID
- Full Name
- Email
- Department
- Designation
- Basic Salary
- PF Applicable
- ESI Applicable

Returns:
```sql
{
  can_lock: BOOLEAN,
  missing_fields: TEXT[]
}
```

#### `can_finance_lock_employee(p_employee_id UUID)`
Checks if an employee meets Finance lock requirements:
- Employee ID
- Full Name
- Basic Salary
- Bank Name
- Account Number
- IFSC Code
- PF Applicable
- ESI Applicable

Returns:
```sql
{
  can_lock: BOOLEAN,
  missing_fields: TEXT[]
}
```

**Key Features:**
- Dynamic validation based on `payroll_lock_requirements` table
- Returns specific list of missing fields
- Separate validation for HR and Finance roles

---

### 2. Frontend Hook Updates ✅
**File:** `src/hooks/usePayrollFinalization.ts`

Added validation functions and integrated them into lock toggle logic:

```typescript
// New validation functions
validateHRLock(employeeId: string)
validateFinanceLock(employeeId: string)

// Updated toggle functions
toggleHRLock() - Now validates before locking
toggleFinanceLock() - Now validates before locking
```

**Validation Flow:**
1. User clicks lock icon
2. If trying to lock (not unlock):
   - Call validation function
   - If validation fails, show error with missing fields
   - Prevent lock operation
3. If unlocking, proceed without validation

---

### 3. Visual Indicators ✅
**File:** `src/components/PayrollLockIcon.tsx`

Enhanced the lock icon component to show validation status:

**New Props:**
- `canLock?: boolean` - Whether employee can be locked
- `missingFields?: string[]` - List of missing required fields

**Visual Changes:**
- ⚠️ **Warning Icon**: Shows amber AlertCircle overlay on unlock icon when data is incomplete
- **Disabled State**: Lock button is disabled when `canLock = false`
- **Enhanced Tooltip**: Shows missing fields in tooltip (e.g., "Cannot lock: Missing Email, Department")
- **Color Coding**: Amber text for warning tooltips

**Before:**
```
🔓 (unlocked, clickable)
```

**After (incomplete data):**
```
🔓⚠️ (unlocked with warning, disabled)
Tooltip: "Cannot lock: Missing Email, Department, Bank Name"
```

---

### 4. Employee Page Integration ✅
**File:** `src/pages/Employees.tsx`

Added validation state tracking and checking:

```typescript
// New state
const [employeeValidation, setEmployeeValidation] = useState<Map<...>>(new Map())

// Validation on load
const validateAllEmployees = async () => {
  // Check each employee against HR and Finance requirements
  // Store validation results in state
}

// Pass validation to lock icons
<PayrollLockIcon
  canLock={employeeValidation.get(emp.id)?.canLockHR ?? true}
  missingFields={employeeValidation.get(emp.id)?.missingHRFields ?? []}
/>
```

**Flow:**
1. On page load, validate all employees
2. Store validation results in state
3. Pass validation state to each lock icon
4. Icons show warnings for incomplete employees
5. Lock buttons are disabled for incomplete employees

---

## Lock Requirements Configuration

Requirements are stored in the `payroll_lock_requirements` table:

| Field Name | Display Name | HR Required | Finance Required |
|------------|--------------|-------------|------------------|
| employee_id | Employee ID | ✅ | ✅ |
| full_name | Full Name | ✅ | ✅ |
| email | Email | ✅ | ❌ |
| department | Department | ✅ | ❌ |
| designation | Designation | ✅ | ❌ |
| basic_salary | Basic Salary | ✅ | ✅ |
| bank_name | Bank Name | ❌ | ✅ |
| account_number | Account Number | ❌ | ✅ |
| ifsc_code | IFSC Code | ❌ | ✅ |
| pf_applicable | PF Applicable | ✅ | ✅ |
| esi_applicable | ESI Applicable | ✅ | ✅ |

**Customization:**
You can modify requirements by updating the `payroll_lock_requirements` table or using the admin interface.

---

## How to Apply

### 1. Run Database Migration
```bash
# Using Supabase CLI
supabase db execute -f add_employee_validation_for_locks.sql

# Or manually in Supabase SQL Editor
# Copy and paste the contents of add_employee_validation_for_locks.sql
```

### 2. Frontend Changes
The frontend changes are already applied. Just refresh your application.

---

## Testing

### Test Case 1: Complete Employee Data
1. Create/edit an employee with all required fields filled
2. Navigate to Employees page
3. ✅ Lock icon should be enabled (no warning)
4. ✅ Should be able to lock the employee

### Test Case 2: Incomplete HR Data
1. Create an employee missing email or department
2. Navigate to Employees page
3. ✅ HR lock icon should show warning (⚠️)
4. ✅ Tooltip should show "Cannot lock: Missing Email, Department"
5. ✅ HR lock button should be disabled
6. ✅ Finance lock (if visible) should work if finance fields are complete

### Test Case 3: Incomplete Finance Data
1. Create an employee missing bank details
2. Navigate to Employees page (as Finance user)
3. ✅ Finance lock icon should show warning (⚠️)
4. ✅ Tooltip should show "Cannot lock: Missing Bank Name, Account Number, IFSC Code"
5. ✅ Finance lock button should be disabled

### Test Case 4: Unlocking
1. Lock an employee (with complete data)
2. Remove a required field (e.g., email)
3. ✅ Should still be able to unlock the employee
4. ✅ After unlocking, lock icon should show warning

---

## User Experience

### For HR Users:
- Can only lock employees with complete HR information
- Visual warning (⚠️) on incomplete employees
- Hover over lock icon to see missing fields
- Clear error message if attempting to lock incomplete employee

### For Finance Users:
- Can only lock employees with complete Finance information (bank details)
- Visual warning (⚠️) on incomplete employees
- Hover over lock icon to see missing fields
- Clear error message if attempting to lock incomplete employee

### Error Messages:
When attempting to lock an incomplete employee:
```
Cannot lock employee. Missing required fields: Email, Department, Bank Name
```

---

## Files Modified/Created

### New Files:
1. ✅ `add_employee_validation_for_locks.sql` - Database validation functions
2. ✅ `EMPLOYEE_LOCK_VALIDATION.md` - This documentation

### Modified Files:
1. ✅ `src/hooks/usePayrollFinalization.ts` - Added validation functions and checks
2. ✅ `src/components/PayrollLockIcon.tsx` - Added visual warning indicators
3. ✅ `src/pages/Employees.tsx` - Added validation state tracking

---

## Benefits

1. **Data Integrity**: Ensures payroll is only locked when all required information is present
2. **User Guidance**: Clear visual indicators show which employees need attention
3. **Error Prevention**: Prevents accidental locking of incomplete records
4. **Audit Trail**: Validation ensures compliance with payroll requirements
5. **Role-Based**: Different requirements for HR and Finance roles
6. **Flexible**: Requirements can be customized via database table

---

## Future Enhancements

Potential improvements:
- Bulk validation report showing all incomplete employees
- Auto-highlight missing fields when editing employee
- Configurable validation rules via admin UI
- Email notifications for incomplete employee records
- Validation summary in payroll dashboard
