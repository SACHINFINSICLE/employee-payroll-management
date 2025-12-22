# Payroll Finalization System - Implementation Guide

## Overview
This document outlines the implementation of a comprehensive payroll finalization system with lock/unlock mechanisms for HR and Finance sign-offs.

## Database Schema

### Tables Created

1. **monthly_payrolls**
   - Tracks payroll cycles by month/year
   - Fields: id, month, year, status (pending/hr_signed/finalized)
   - HR sign-off: hr_signoff_by, hr_signoff_at
   - Finance sign-off: finance_signoff_by, finance_signoff_at
   - Reversion tracking: reverted_by, reverted_at, reversion_reason
   - Unique constraint on (month, year)

2. **employee_payroll_locks**
   - Individual employee lock status per payroll
   - HR locks: hr_locked, hr_locked_by, hr_locked_at
   - Finance locks: finance_locked, finance_locked_by, finance_locked_at
   - Unique constraint on (employee_id, payroll_id)

3. **payroll_lock_requirements**
   - Admin-configurable required fields for locking
   - Fields: field_name, required_for_lock, display_name

4. **payroll_audit_log**
   - Comprehensive audit trail
   - Actions: payroll_created, hr_signoff, finance_signoff, hr_lock, hr_unlock, finance_lock, finance_unlock, payroll_reverted, payroll_finalized

### Helper Functions

- `get_payroll_for_month(month, year)` - Get payroll ID for a specific month
- `can_hr_signoff(payroll_id)` - Check if all employees are HR-locked
- `can_finance_signoff(payroll_id)` - Check if all employees are Finance-locked and HR signed
- `get_payroll_lock_stats(payroll_id)` - Get lock statistics

## Components Created

### 1. PayrollLockIcon.tsx
- Lock/unlock icon button for individual employees
- Separate icons for HR and Finance
- Tooltips showing lock status and who locked it
- Props: isLocked, lockType ('hr'|'finance'), onToggle, disabled

### 2. PayrollLockProgress.tsx
- Progress bar showing lock completion
- Displays "X/Y employees locked"
- Visual indicator when all employees are locked
- Separate progress for HR and Finance

### 3. HRSignoffModal.tsx
- Modal for HR to sign off payroll
- Month/year selection
- Shows lock progress
- Validates all employees are locked before allowing sign-off
- Creates payroll cycle if doesn't exist

### 4. FinanceSignoffModal.tsx
- Modal for Finance to sign off payroll
- Dropdown of HR-signed payrolls only
- Shows lock progress
- Validates all employees are Finance-locked
- Finalizes payroll on sign-off

### 5. PayrollLockSettings.tsx
- Admin settings for lock requirements
- Checklist of fields required before locking
- Toggle switches for each field
- Save/Reset functionality

### 6. PayrollRevertSettings.tsx
- Admin-only payroll reversion
- Select finalized/HR-signed payrolls
- Requires reason for reversion
- Confirmation dialog with warnings
- Clears sign-offs but keeps locks

## Custom Hook

### usePayrollFinalization.ts
Provides all payroll finalization operations:
- `getOrCreatePayrollCycle(month, year)` - Get or create payroll
- `getAllPayrollCycles()` - List all payrolls
- `getPayrollLockStats(payrollId)` - Get lock statistics
- `getEmployeeLocks(payrollId)` - Get employee locks
- `toggleHRLock(employeeId, payrollId, currentlyLocked)` - Toggle HR lock
- `toggleFinanceLock(employeeId, payrollId, currentlyLocked)` - Toggle Finance lock
- `hrSignoff(payrollId)` - HR sign-off
- `financeSignoff(payrollId)` - Finance sign-off
- `revertPayroll(payrollId, reason)` - Revert finalization
- `getLockRequirements()` - Get lock requirements
- `updateLockRequirement(fieldName, required)` - Update requirement
- `getHRSignedPayrolls()` - Get HR-signed payrolls for Finance

## Workflow

### Phase 1: HR Lock & Sign-off
1. HR views employees for a specific month/year
2. HR locks individual employees (padlock icon in Actions column)
3. Progress indicator shows "X/Y employees locked"
4. Once ALL employees locked → HR "Sign Off" button becomes enabled
5. HR clicks "Sign Off", selects month/year
6. System creates payroll record with HR sign-off timestamp
7. All employees created before HR sign-off are associated with that payroll

### Phase 2: Finance Lock & Sign-off
1. After HR sign-off, Finance can still edit fields (governed by field access control)
2. Finance locks employees individually (separate Finance padlock)
3. Finance can only sign off months that HR has already signed off
4. Finance selects from dropdown of HR-signed (but not finalized) months
5. Once Finance signs off → Payroll is FINALIZED (read-only)

### Phase 3: Post-Finalization
1. New employees added after finalization:
   - Appear in finalized month as "Not Finalized" (editable, shown on top)
   - Automatically included in next payroll cycle
2. Month dropdown shows all months with status indicators:
   - 🟡 Pending (no sign-offs)
   - 🔵 HR Signed (HR signed, Finance pending)
   - 🟢 Finalized (both signed)
3. Finalized months display as read-only (except new employees added later)

### Admin Controls
1. Admin can revert finalization from settings
2. Reversion clears both HR & Finance sign-offs but keeps employee locks
3. Audit trail tracks all reversions with reasons
4. Admin configures which fields are required for locking

## Integration Points

### Employees Page Updates Needed

1. **Add to imports:**
```typescript
import { PayrollLockIcon } from '@/components/PayrollLockIcon'
import { PayrollLockProgress } from '@/components/PayrollLockProgress'
import { HRSignoffModal } from '@/components/HRSignoffModal'
import { FinanceSignoffModal } from '@/components/FinanceSignoffModal'
import { usePayrollFinalization } from '@/hooks/usePayrollFinalization'
```

2. **Add state variables:**
```typescript
const [currentPayroll, setCurrentPayroll] = useState<MonthlyPayrollCycle | null>(null)
const [lockStats, setLockStats] = useState<PayrollLockStats | null>(null)
const [employeeLocks, setEmployeeLocks] = useState<Map<string, EmployeePayrollLock>>(new Map())
const [showHRSignoffModal, setShowHRSignoffModal] = useState(false)
const [showFinanceSignoffModal, setShowFinanceSignoffModal] = useState(false)
```

3. **Load payroll data on month/year change:**
```typescript
useEffect(() => {
  loadPayrollData()
}, [month, year])

const loadPayrollData = async () => {
  const payroll = await getOrCreatePayrollCycle(month, year)
  setCurrentPayroll(payroll)
  
  const stats = await getPayrollLockStats(payroll.id)
  setLockStats(stats)
  
  const locks = await getEmployeeLocks(payroll.id)
  const lockMap = new Map(locks.map(l => [l.employee_id, l]))
  setEmployeeLocks(lockMap)
}
```

4. **Add lock icons to Actions column:**
```typescript
// In table row rendering
<TableCell>
  <div className="flex items-center gap-2">
    {/* HR Lock Icon */}
    <PayrollLockIcon
      isLocked={employeeLocks.get(emp.id)?.hr_locked || false}
      lockType="hr"
      onToggle={() => handleHRLockToggle(emp.id)}
      disabled={currentPayroll?.status !== 'pending' || !isHR}
    />
    
    {/* Finance Lock Icon */}
    <PayrollLockIcon
      isLocked={employeeLocks.get(emp.id)?.finance_locked || false}
      lockType="finance"
      onToggle={() => handleFinanceLockToggle(emp.id)}
      disabled={currentPayroll?.status !== 'hr_signed' || !isFinance}
    />
    
    {/* Existing action buttons */}
  </div>
</TableCell>
```

5. **Add progress indicators and sign-off buttons to header:**
```typescript
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      {/* Lock Progress */}
      <div className="flex gap-6">
        <PayrollLockProgress stats={lockStats} type="hr" />
        <PayrollLockProgress stats={lockStats} type="finance" />
      </div>
      
      {/* Sign-off Buttons */}
      <div className="flex gap-2">
        {isHR && currentPayroll?.status === 'pending' && (
          <Button onClick={() => setShowHRSignoffModal(true)}>
            HR Sign Off
          </Button>
        )}
        {isFinance && currentPayroll?.status === 'hr_signed' && (
          <Button onClick={() => setShowFinanceSignoffModal(true)}>
            Finance Sign Off
          </Button>
        )}
      </div>
    </div>
  </CardContent>
</Card>
```

6. **Update month/year dropdown to show status:**
```typescript
// Add status badge next to month/year
<div className="flex items-center gap-2">
  <Select value={String(month)} onChange={...} options={months} />
  <Select value={String(year)} onChange={...} options={years} />
  {currentPayroll && (
    <Badge variant={
      currentPayroll.status === 'finalized' ? 'default' : 
      currentPayroll.status === 'hr_signed' ? 'secondary' : 
      'outline'
    }>
      {currentPayroll.status === 'finalized' ? '🟢 Finalized' :
       currentPayroll.status === 'hr_signed' ? '🔵 HR Signed' :
       '🟡 Pending'}
    </Badge>
  )}
</div>
```

7. **Implement read-only mode for finalized payrolls:**
```typescript
const isReadOnly = currentPayroll?.status === 'finalized'

// Disable all input fields when read-only
<Input disabled={isReadOnly || !canEdit('field_name')} />
```

8. **Sort employees (new ones first in finalized months):**
```typescript
const sortedEmployees = useMemo(() => {
  if (currentPayroll?.status === 'finalized') {
    // Check which employees were created after finalization
    const finalizedAt = currentPayroll.finance_signoff_at
    return [...employees].sort((a, b) => {
      const aIsNew = new Date(a.created_at) > new Date(finalizedAt!)
      const bIsNew = new Date(b.created_at) > new Date(finalizedAt!)
      if (aIsNew && !bIsNew) return -1
      if (!aIsNew && bIsNew) return 1
      return 0
    })
  }
  return employees
}, [employees, currentPayroll])
```

### Settings Page Updates

Add two new tabs/sections:
1. **Payroll Lock Requirements** - Use `<PayrollLockSettings />`
2. **Revert Payroll** (Admin only) - Use `<PayrollRevertSettings />`

## Migration Steps

1. **Run the SQL migration:**
```bash
# Apply the migration to your Supabase database
psql -h [your-db-host] -U postgres -d postgres -f payroll_finalization_migration.sql
```

2. **Install dependencies:**
```bash
npm install @radix-ui/react-tooltip
```

3. **Update TypeScript types:**
   - Already done in `src/types/database.ts`

4. **Integrate components:**
   - Update `src/pages/Employees.tsx` with integration points above
   - Update `src/pages/Settings.tsx` to include new settings components

5. **Test workflow:**
   - Test HR lock → HR sign-off
   - Test Finance lock → Finance sign-off
   - Test admin reversion
   - Test new employee addition after finalization
   - Test lock requirements configuration

## Security Considerations

- RLS policies ensure only authenticated users can access payroll data
- Admin role required for reverting payrolls
- HR role required for HR sign-offs
- Finance role required for Finance sign-offs
- Audit log tracks all actions with user ID and timestamp
- Field access control still governs edit permissions

## Future Enhancements

1. Email notifications on sign-offs
2. Bulk lock/unlock operations
3. Payroll comparison between months
4. Export finalized payroll reports
5. Mobile-responsive lock icons
6. Real-time collaboration indicators
