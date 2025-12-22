# Employee Deactivation Feature

## Overview
Replaced the employee deletion functionality with a soft-delete system using deactivation/activation toggles. This preserves all employee data while marking them as inactive.

## Changes Made

### 1. Database Migration (`add_employee_is_active_column.sql`)

Added `is_active` column to the `employees` table:
```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
```

**Benefits:**
- Preserves all employee data and history
- Allows reactivation of employees
- Maintains referential integrity
- Improves query performance with index

### 2. Type Definitions (`src/types/database.ts`)

Updated `Employee` interface to include:
```typescript
is_active: boolean
```

### 3. Employee Hook (`src/hooks/useEmployees.ts`)

**Always shows all employees:**
- No filtering by `is_active` status
- Both active and inactive employees are always visible
- Visual distinction through grey styling

### 4. UI Components (`src/pages/Employees.tsx`)

#### Replaced Delete with Deactivate/Activate Toggle

**Button Changes:**
- Icon: `Trash2` → `Power`
- Color: Red (delete) → Orange (deactivate) / Green (activate)
- Action: Delete → Toggle active status

**Button styling:**
```typescript
className={`h-8 px-2 ${emp.is_active ? 
  'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 
  'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
```

#### Visual Feedback for Deactivated Employees

**Grey shade styling:**
```typescript
className={`${isDirty ? 'bg-yellow-50' : ''} ${!emp.is_active ? 'bg-gray-100 opacity-60' : ''}`}
```

Deactivated employees appear with:
- Grey background (`bg-gray-100`)
- Reduced opacity (`opacity-60`)
- All data remains visible but **NOT editable** (read-only)
- Always visible in the table (no filter needed)

#### Edit Protection

**Deactivated employees are read-only:**
```typescript
const canEditRow = !isPayrollLocked && (isHR || isFinance) && emp.is_active
```

All fields become non-editable when `is_active = false`

#### Updated Dialog

**Delete Dialog → Deactivate/Activate Dialog:**
- Dynamic title based on current status
- Color-coded messaging (orange for deactivate, green for activate)
- Clear explanation of what happens
- Mentions that fields become read-only when deactivated

**Dialog features:**
- Shows employee ID and name
- Lists what will happen when toggling status
- Emphasizes read-only state for deactivated employees
- Preserves all data message
- Can be reversed at any time

### 5. New Employee Creation

Updated to set `is_active: true` by default when creating employees.

## How It Works

### For HR/Finance Users:

1. **Deactivate an Employee:**
   - Click the orange power button next to an employee
   - Confirm in the dialog
   - Employee row turns grey with reduced opacity
   - **All fields become read-only (non-editable)**
   - Employee remains visible in the table
   - All data is preserved

2. **View Deactivated Employees:**
   - Deactivated employees are **always visible** in the table
   - They appear with grey background and reduced opacity
   - No filter needed to see them

3. **Reactivate an Employee:**
   - Click the green power button next to a deactivated employee
   - Confirm in the dialog
   - Employee returns to normal display
   - **Fields become editable again**

4. **Edit Protection:**
   - Deactivated employees **cannot be edited**
   - All fields are read-only
   - Must reactivate to make changes

## Benefits

✅ **Data Preservation**: No employee data is ever lost  
✅ **Audit Trail**: Complete history maintained  
✅ **Reversible**: Employees can be reactivated anytime  
✅ **Visual Clarity**: Grey shade clearly indicates inactive status  
✅ **Always Visible**: All employees shown in table (active and inactive)  
✅ **Edit Protection**: Deactivated employees are read-only  
✅ **Safe**: No accidental permanent deletions  

## Database Impact

- **No data loss**: All records preserved
- **Foreign key integrity**: All relationships maintained
- **Payroll history**: Complete monthly records retained
- **Audit compliance**: Full employee lifecycle tracked

## UI/UX Improvements

1. **Color Coding:**
   - Orange = Deactivate (warning)
   - Green = Activate (positive action)
   - Grey = Inactive status (visual indicator)

2. **Clear Messaging:**
   - Dialog explains exactly what happens
   - No confusing technical jargon
   - Emphasizes data preservation

3. **Always Visible:**
   - All employees (active and inactive) always shown
   - No need for filters or toggles
   - Clear visual distinction through styling

## Testing Checklist

- [x] Database migration adds `is_active` column
- [x] New employees created with `is_active = true`
- [x] Deactivate button appears for active employees (orange)
- [x] Activate button appears for inactive employees (green)
- [x] Deactivated employees show in grey with reduced opacity
- [x] Deactivated employees are **always visible** in the table
- [x] Deactivated employees **cannot be edited** (read-only)
- [x] Attempting to edit deactivated employee shows read-only fields
- [x] Reactivation restores normal display and editing capability
- [x] All employee data preserved after deactivation
- [x] Save/Cancel buttons do not appear for deactivated employees

## Migration Steps

1. Run the SQL migration: `add_employee_is_active_column.sql`
2. Restart the application
3. Test deactivation on a test employee
4. Verify grey styling appears
5. Test reactivation
6. Confirm data integrity
