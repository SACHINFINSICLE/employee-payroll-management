# Bulk Upload with Field Mapping Feature

## Overview
Enhanced the bulk upload feature with a two-step process that includes field mapping for designations and departments. This ensures data consistency with your existing system values and prevents disruption from random or inconsistent data.

## Two-Step Process

### Step 1: Data Entry & Validation
- Paste or enter employee data in Excel-like grid
- Real-time validation for:
  - Required fields (Employee ID, Name)
  - Duplicate Employee IDs within upload
  - Employee IDs already in database
  - Data type validation (salary must be number)
- Visual feedback with red/green row highlighting
- Error tooltips on hover

### Step 2: Field Mapping
- After all validation passes, click "Proceed to Mapping"
- System analyzes uploaded designations and departments
- Shows mapping interface for any values that don't match system
- Auto-fills mappings for exact matches
- Requires manual mapping for new/different values

## How It Works

### Scenario 1: All Values Match System
**Uploaded Data:**
```
Designation: Manager, Developer
Department: IT, Finance
```

**System Has:** Manager, Developer, IT, Finance

**Result:** 
- Mapping step shows success message
- All fields auto-mapped
- Can proceed directly to upload

### Scenario 2: Some Values Don't Match
**Uploaded Data:**
```
Designation: Sr. Manager, Dev
Department: Information Technology, Accounts
```

**System Has:** Manager, Developer, IT, Finance

**Mapping Interface:**
```
Map Designations:
┌─────────────────┬──────────────────────────┐
│ Uploaded Value  │ Map to System Designation│
├─────────────────┼──────────────────────────┤
│ Sr. Manager     │ [Select: Manager ▼]      │
│ Dev             │ [Select: Developer ▼]    │
└─────────────────┴──────────────────────────┘

Map Departments:
┌──────────────────────────┬──────────────────────────┐
│ Uploaded Value           │ Map to System Department │
├──────────────────────────┼──────────────────────────┤
│ Information Technology   │ [Select: IT ▼]           │
│ Accounts                 │ [Select: Finance ▼]      │
└──────────────────────────┴──────────────────────────┘
```

**User Action:**
1. Select appropriate system value for each uploaded value
2. Upload button activates when all mappings complete
3. Click "Upload Employees"

### Scenario 3: No Designations/Departments
**Uploaded Data:**
```
Employee ID, Name, Salary only (no designation/department)
```

**Result:**
- Mapping step shows success message
- No mappings needed
- Can proceed directly to upload

## User Workflow

### Complete Flow
```
1. Click "Upload" button
   ↓
2. Paste/Enter employee data
   ↓
3. Fix any validation errors (red rows)
   ↓
4. Click "Proceed to Mapping"
   ↓
5. Map designations and departments
   ↓
6. Click "Upload Employees"
   ↓
7. Success! Employees added to system
```

### Navigation
- **Cancel:** Close modal at any time (no data saved)
- **Back:** Return to data entry from mapping step
- **Proceed to Mapping:** Move from data entry to mapping (only enabled when no errors)
- **Upload Employees:** Final upload (only enabled when all mappings complete)

## Validation Rules

### Data Entry Step
✅ **Must Pass:**
- Employee ID required and unique
- Name required
- No duplicate Employee IDs in upload
- No Employee IDs already in database
- Salary must be valid number (if provided)

### Mapping Step
✅ **Must Complete:**
- All uploaded designations mapped to system values
- All uploaded departments mapped to system values
- Cannot upload until all mappings complete

## Technical Details

### Smart Mapping Logic
1. **Extract Unique Values:** System identifies all unique designations and departments from valid rows
2. **Auto-Match:** Checks if uploaded values exactly match system values
3. **Pre-Fill:** Auto-fills mappings for exact matches
4. **Require Mapping:** Shows dropdown for values that don't match
5. **Validate:** Ensures all mappings complete before allowing upload

### Data Transformation
```typescript
// Before Mapping
{
  designation: "Sr. Manager",
  department: "Information Technology"
}

// After Mapping
{
  designation: "Manager",      // Mapped value
  department: "IT"              // Mapped value
}
```

### Empty Values Handling
- If designation/department is empty in upload, it remains empty (null)
- No mapping required for empty values
- System only maps non-empty values

## Benefits

### 1. Data Consistency
- Ensures all employees use standardized designations and departments
- Prevents typos and variations (e.g., "Dev" vs "Developer")
- Maintains referential integrity with system master data

### 2. Prevents Disruption
- Stops random or inconsistent values from entering system
- Protects existing reports and analytics
- Maintains data quality standards

### 3. User Friendly
- Clear visual interface for mapping
- Shows exactly what needs to be mapped
- Auto-fills when possible to save time
- Provides immediate feedback

### 4. Flexible
- Handles exact matches automatically
- Allows manual mapping for variations
- Supports partial data (some fields empty)
- Works with any number of unique values

## Example Use Cases

### Use Case 1: Bulk Upload from External System
**Scenario:** HR exports data from old system with different naming conventions

**Uploaded:**
- Designation: "Sr. Dev", "Jr. Dev", "Team Lead"
- Department: "Tech", "Accounts"

**Mapping:**
- Sr. Dev → Senior Developer
- Jr. Dev → Junior Developer  
- Team Lead → Team Leader
- Tech → IT
- Accounts → Finance

**Result:** All employees imported with consistent system values

### Use Case 2: Excel with Variations
**Scenario:** Different people entered data with slight variations

**Uploaded:**
- "Manager", "manager", "MANAGER" (same role, different case)
- "IT", "I.T.", "Information Technology" (same dept, different format)

**Mapping:**
- All variations map to single system value
- Ensures consistency across all records

### Use Case 3: Partial Data
**Scenario:** Only have basic employee info, no designation/department yet

**Uploaded:**
- Employee ID, Name, Salary only

**Result:**
- No mapping needed
- Employees created with null designation/department
- Can be updated later

## UI Components

### Data Entry Screen
- Excel-like grid with 8 columns
- Row-by-row validation
- Color-coded status (red/green)
- Error tooltips
- "Proceed to Mapping" button

### Mapping Screen
- Two sections: Designations and Departments
- Table format with uploaded value and dropdown
- Red border on unmapped fields
- Success message when no mapping needed
- "Back" and "Upload Employees" buttons

## Error Messages

### Data Entry Errors
- "Employee ID is required"
- "Name is required"
- "Duplicate Employee ID within uploaded data (appears in rows: X, Y)"
- "Employee ID already exists in database"
- "Salary must be a valid number"

### Mapping Errors
- "Please map all fields before uploading" (shown when mappings incomplete)
- Red border on unmapped dropdowns

## Testing Checklist

- [x] Two-step process works correctly
- [x] Data entry validation still works
- [x] Proceed button only enabled when no errors
- [x] Mapping step shows correct unique values
- [x] Auto-mapping works for exact matches
- [x] Manual mapping dropdowns populated correctly
- [x] Upload button disabled until all mappings complete
- [x] Back button returns to data entry
- [x] Mapped values applied correctly on upload
- [x] Empty designations/departments handled correctly
- [x] Success message shows after upload
- [x] Employee list refreshes after upload

## Notes

- Mapping is case-sensitive for exact matches
- Only active designations and departments shown in dropdowns
- Mappings are not saved - must be done each upload
- System values come from Settings > Designations/Departments
- Upload is atomic - all employees inserted together or none
