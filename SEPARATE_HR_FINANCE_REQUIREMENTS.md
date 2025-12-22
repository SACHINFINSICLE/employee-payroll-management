# Separate HR and Finance Lock Requirements - Implementation

## Overview

Updated the Payroll Lock Requirements system to provide **separate, granular control** for HR and Finance roles. Each role can now have different field requirements before they can lock an employee.

## Changes Made

### 1. Database Schema Updates ✅

**File**: `payroll_finalization_migration.sql`

Changed from:
```sql
required_for_lock BOOLEAN DEFAULT false
```

To:
```sql
required_for_hr_lock BOOLEAN DEFAULT false
required_for_finance_lock BOOLEAN DEFAULT false
```

**Default Configuration**:
- **HR Requirements** (employee details focus):
  - ✅ Employee ID
  - ✅ Full Name
  - ✅ Email
  - ✅ Department
  - ✅ Designation
  - ✅ Basic Salary
  - ✅ PF Applicable
  - ✅ ESI Applicable

- **Finance Requirements** (payment details focus):
  - ✅ Employee ID
  - ✅ Full Name
  - ✅ Basic Salary
  - ✅ Bank Name
  - ✅ Account Number
  - ✅ IFSC Code
  - ✅ PF Applicable
  - ✅ ESI Applicable

### 2. TypeScript Types Updated ✅

**File**: `src/types/database.ts`

```typescript
export interface PayrollLockRequirement {
  id: string
  field_name: string
  required_for_hr_lock: boolean      // NEW
  required_for_finance_lock: boolean // NEW
  display_name: string
  created_by: string | null
  created_at: string
  updated_at: string
}
```

### 3. Hook Updated ✅

**File**: `src/hooks/usePayrollFinalization.ts`

Updated `updateLockRequirement` function:

```typescript
const updateLockRequirement = async (
  fieldName: string, 
  requiredForHR: boolean,      // NEW
  requiredForFinance: boolean  // NEW
) => {
  // Updates both columns separately
}
```

### 4. UI Component Redesigned ✅

**File**: `src/components/PayrollLockSettings.tsx`

**New Features**:
- ✅ Separate sections for HR and Finance
- ✅ Visual distinction (blue lock for HR, green lock for Finance)
- ✅ Badge showing count of required fields per role
- ✅ Independent toggle switches for each role
- ✅ Hover effects for better UX
- ✅ Clear descriptions for each section

**UI Layout**:
```
┌─────────────────────────────────────────┐
│ 🔒 HR Lock Requirements                 │
│ [5 required]                            │
│                                         │
│ ┌─────────────┐  ┌─────────────┐      │
│ │ Employee ID │  │ Full Name   │      │
│ │     [ON]    │  │     [ON]    │      │
│ └─────────────┘  └─────────────┘      │
│                                         │
│ 🔒 Finance Lock Requirements            │
│ [4 required]                            │
│                                         │
│ ┌─────────────┐  ┌─────────────┐      │
│ │ Bank Name   │  │ Account No  │      │
│ │     [ON]    │  │     [ON]    │      │
│ └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

## Migration Path

### For New Installations
Use the updated `payroll_finalization_migration.sql` file which includes the new schema.

### For Existing Installations
Run the migration file: `update_lock_requirements_separate_hr_finance.sql`

This will:
1. ✅ Add new columns `required_for_hr_lock` and `required_for_finance_lock`
2. ✅ Migrate existing data from `required_for_lock`
3. ✅ Set sensible defaults based on field types
4. ✅ Optionally drop the old column (commented out by default)

```bash
# Run in Supabase SQL Editor
psql -f update_lock_requirements_separate_hr_finance.sql
```

## Benefits

### 1. **Better Role Separation**
- HR focuses on employee information completeness
- Finance focuses on payment details accuracy
- No overlap or confusion

### 2. **Flexible Configuration**
- Admin can require different fields for each role
- Example: HR must verify department, Finance must verify bank details
- Independent control per field

### 3. **Improved User Experience**
- Clear visual distinction (blue vs green)
- Each role sees only relevant requirements
- Badge counters show progress at a glance

### 4. **Compliance & Audit**
- Different approval criteria for different roles
- Better separation of duties
- Clearer audit trail

## Usage

### As Admin (Settings Page)

1. Navigate to **Settings → Lock Requirements**
2. See two sections: **HR Lock Requirements** and **Finance Lock Requirements**
3. Toggle switches independently for each role
4. Click **Save Changes** to apply

### Example Configurations

**Scenario 1: Strict HR, Flexible Finance**
```
HR Requirements (8 fields):
✅ Employee ID, Name, Email, Department, 
✅ Designation, Salary, PF, ESI

Finance Requirements (4 fields):
✅ Employee ID, Name, Bank Name, Account Number
```

**Scenario 2: Balanced Approach**
```
HR Requirements (6 fields):
✅ Employee ID, Name, Department, 
✅ Designation, Salary, PF

Finance Requirements (6 fields):
✅ Employee ID, Name, Salary, Bank Name,
✅ Account Number, IFSC Code
```

**Scenario 3: Minimal Requirements**
```
HR Requirements (3 fields):
✅ Employee ID, Name, Salary

Finance Requirements (3 fields):
✅ Employee ID, Bank Name, Account Number
```

## Testing Checklist

- [ ] Run migration on test database
- [ ] Verify both columns exist in `payroll_lock_requirements` table
- [ ] Check Settings page shows two separate sections
- [ ] Toggle HR requirements and save
- [ ] Toggle Finance requirements and save
- [ ] Verify HR can only lock when HR requirements met
- [ ] Verify Finance can only lock when Finance requirements met
- [ ] Check badge counters update correctly
- [ ] Test with different field combinations
- [ ] Verify existing data migrated correctly

## Rollback Plan

If you need to rollback:

```sql
-- Restore single column approach
ALTER TABLE payroll_lock_requirements 
ADD COLUMN IF NOT EXISTS required_for_lock BOOLEAN DEFAULT false;

-- Copy data back (choose one strategy)
UPDATE payroll_lock_requirements
SET required_for_lock = (required_for_hr_lock OR required_for_finance_lock);

-- Drop new columns
ALTER TABLE payroll_lock_requirements 
DROP COLUMN required_for_hr_lock,
DROP COLUMN required_for_finance_lock;
```

## Summary

✅ **Database**: Separate columns for HR and Finance requirements  
✅ **Types**: Updated TypeScript interfaces  
✅ **Hook**: Updated to handle both requirements  
✅ **UI**: Redesigned with separate sections and visual distinction  
✅ **Migration**: Provided for existing installations  
✅ **Documentation**: Complete usage guide

The system now provides **granular, role-specific control** over lock requirements, giving administrators the flexibility to configure different validation rules for HR and Finance teams.
