# Granular Visibility Controls Implementation

## Overview
Separated the single "Visible" toggle into two independent visibility controls:
1. **HR Can View** - Controls whether HR role can view the field
2. **Finance Can View** - Controls whether Finance role can view the field

This provides granular control over field visibility for each role.

## Changes Made

### 1. Database Migration
**File:** `separate_visibility_controls_migration.sql`

- Added `hr_can_view` column to `field_access_settings` table (BOOLEAN, default true)
- Added `finance_can_view` column to `field_access_settings` table (BOOLEAN, default true)
- Migrated existing `is_visible` values to both new columns
- Kept `is_visible` for backward compatibility
- All existing fields now have both visibility flags set to their original `is_visible` value

### 2. TypeScript Types
**File:** `src/types/database.ts`

- Updated `FieldAccessSetting` interface to include:
  - `hr_can_view: boolean`
  - `finance_can_view: boolean`

### 3. Settings Page UI
**File:** `src/pages/Settings.tsx`

- Replaced single "Visible" column with two columns:
  - "HR Can View" - Toggle for HR visibility
  - "Finance Can View" - Toggle for Finance visibility
- Each toggle independently controls visibility for its respective role
- Both toggles work with the same `updateFieldSetting` function

### 4. Field Access Hook
**File:** `src/hooks/useFieldAccess.ts`

- Updated `canView()` function to use role-specific visibility:
  - **Admin:** Can view if any visibility flag is true (is_visible OR hr_can_view OR finance_can_view)
  - **HR:** Can view only if `hr_can_view` is true
  - **Finance:** Can view only if `finance_can_view` is true

## Visibility Control Logic

### Before (Single Toggle)
- One "Visible" toggle controlled visibility for both HR and Finance
- If visible = true, both roles could see the field
- If visible = false, neither role could see the field

### After (Granular Control)
- Separate toggles for HR and Finance visibility
- HR can view a field only if `hr_can_view` = true
- Finance can view a field only if `finance_can_view` = true
- Admin can view all fields regardless of visibility settings

## Example Use Cases

### Scenario 1: HR-Only Field
- **HR Can View:** ✅ ON
- **Finance Can View:** ❌ OFF
- Result: Only HR and Admin can see this field

### Scenario 2: Finance-Only Field
- **HR Can View:** ❌ OFF
- **Finance Can View:** ✅ ON
- Result: Only Finance and Admin can see this field

### Scenario 3: Shared Field
- **HR Can View:** ✅ ON
- **Finance Can View:** ✅ ON
- Result: Both HR and Finance can see this field

### Scenario 4: Hidden Field
- **HR Can View:** ❌ OFF
- **Finance Can View:** ❌ OFF
- Result: Only Admin can see this field

## Migration Results

✅ **Database Schema:** Successfully updated
- `hr_can_view` column added
- `finance_can_view` column added
- All existing data migrated (both set to original `is_visible` value)

✅ **Settings Page:** Updated UI
- Two separate visibility toggles displayed
- Independent control for each role

✅ **Access Control:** Updated logic
- Role-specific visibility enforced
- Admin retains full visibility

## Testing Checklist

- [x] Migration runs successfully
- [x] New columns added to field_access_settings table
- [x] Existing data migrated correctly
- [x] Settings page shows two separate visibility toggles
- [x] TypeScript types updated
- [x] useFieldAccess hook updated with new logic
- [x] Admin can view all fields
- [x] HR visibility controlled by hr_can_view
- [x] Finance visibility controlled by finance_can_view

## Backward Compatibility

The `is_visible` column is retained for backward compatibility. The new visibility logic prioritizes the role-specific columns (`hr_can_view` and `finance_can_view`) but falls back to `is_visible` for admin users.

## Notes

- All existing fields default to visible for both HR and Finance (migrated from original `is_visible` value)
- Admin role always has full visibility regardless of toggle settings
- The visibility controls are independent of edit permissions
- A user can view a field even if they cannot edit it
- This provides maximum flexibility for configuring role-based access
