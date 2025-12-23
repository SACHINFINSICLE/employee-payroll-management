import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useEmployees } from '@/hooks/useEmployees'
import { useFieldAccess } from '@/hooks/useFieldAccess'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Filter, Plus, Upload, CheckCircle, X, Save, Power, Lock, AlertTriangle, Info } from 'lucide-react'
import { MonthNavigator } from '@/components/MonthNavigator'
import { formatCurrency, getMonthName } from '@/lib/utils'
import * as XLSX from 'xlsx'
// Department and Designation types used by useEmployees hook return values
import type { Employee, MonthlyPayroll, EmploymentStatus, YesNo, PaymentMode, PayrollSignOff, MonthlyPayrollCycle, EmployeePayrollLock, PayrollLockStats } from '@/types/database'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { BulkUploadModal } from '@/components/BulkUploadModal'
import { PayrollLockIcon } from '@/components/PayrollLockIcon'
import { HRSignoffModal } from '@/components/HRSignoffModal'
import { FinanceSignoffModal } from '@/components/FinanceSignoffModal'
import { usePayrollFinalization } from '@/hooks/usePayrollFinalization'
import { usePayrollMonth } from '@/hooks/usePayrollMonth'

const employmentStatusOptions = [
  { value: '', label: 'All Status' },
  { value: 'Employed', label: 'Employed' },
  { value: 'Notice Period', label: 'Notice Period' },
  { value: 'Resigned', label: 'Resigned' },
  { value: 'Terminated', label: 'Terminated' },
]

interface RowEditState {
  employee: Partial<Employee>
  payroll: Partial<MonthlyPayroll>
  isDirty: boolean
}

interface RowValidationError {
  deduction?: string
  addition?: string
  incentive?: string
}

interface EditStates {
  [employeeId: string]: RowEditState
}

const hrRemarkOptions = [
  { value: '', label: 'All HR Remark' },
  { value: 'Nil', label: 'Nil' },
  { value: 'Process Payroll', label: 'Process Payroll' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Skip Salary for the month', label: 'Skip Salary' },
  { value: 'F&F Settled', label: 'F&F Settled' },
]

const paymentStatusOptions = [
  { value: '', label: 'All Payment' },
  { value: 'Nil', label: 'Nil' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Not Paid', label: 'Not Paid' },
]

const paymentModeOptions = [
  { value: 'INR Account', label: 'INR Account' },
  { value: 'AUD Account', label: 'AUD Account' },
]

export function Employees() {
  const { profile, isHR, isFinance } = useAuth()
  const { canEdit } = useFieldAccess()

  // Use the payroll month hook for month progression logic
  const {
    selectedMonth: month,
    selectedYear: year,
    activeMonth,
    activeYear,
    canGoNext,
    canGoPrev,
    goToMonth,
    goToActiveMonth,
    isViewingFinalized: isViewingFinalizedMonth,
    isViewingActive,
    refresh: refreshPayrollMonths
  } = usePayrollMonth()
  const [showFilters, setShowFilters] = useState(false)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showSignOffDialog, setShowSignOffDialog] = useState(false)
  const [signOffRemarks, setSignOffRemarks] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [isCancellingSignOff, setIsCancellingSignOff] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set())
  const [payrollSignOff, setPayrollSignOff] = useState<PayrollSignOff | null>(null)
  const [editStates, setEditStates] = useState<EditStates>({})
  const [togglingEmployeeId, setTogglingEmployeeId] = useState<string | null>(null)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [employeeToToggle, setEmployeeToToggle] = useState<{ id: string; name: string; employee_id: string; is_active: boolean } | null>(null)
  const [employeeIdExists, setEmployeeIdExists] = useState(false)
  const [checkingEmployeeId, setCheckingEmployeeId] = useState(false)

  // Payroll finalization state
  const [currentPayroll, setCurrentPayroll] = useState<MonthlyPayrollCycle | null>(null)
  const [lockStats, setLockStats] = useState<PayrollLockStats | null>(null)
  const [employeeLocks, setEmployeeLocks] = useState<Map<string, EmployeePayrollLock>>(new Map())
  const [employeeValidation, setEmployeeValidation] = useState<Map<string, { canLockHR: boolean; canLockFinance: boolean; missingHRFields: string[]; missingFinanceFields: string[] }>>(new Map())
  const [showHRSignoffModal, setShowHRSignoffModal] = useState(false)
  const [showFinanceSignoffModal, setShowFinanceSignoffModal] = useState(false)
  const [snapshotData, setSnapshotData] = useState<any[] | null>(null)
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false)
  const [bulkLockLoading, setBulkLockLoading] = useState(false)
  const [showBulkLockConfirm, setShowBulkLockConfirm] = useState(false)
  const [bulkLockAction, setBulkLockAction] = useState<{ type: 'hr' | 'finance'; lock: boolean } | null>(null)

  const { employees: liveEmployees, loading, filters, updateFilter, clearFilters, refetch, designations, departments, deductions, additions, incentives } = useEmployees({ month, year })

  // Use snapshot data if viewing finalized payroll, otherwise use live data
  const employees = isViewingSnapshot && snapshotData ? snapshotData : liveEmployees

  // Helper to get actual payroll status based on timestamps (more reliable than status field)
  const actualPayrollStatus = useMemo((): 'pending' | 'hr_signed' | 'finalized' => {
    if (!currentPayroll) return 'pending'
    // Check timestamps to determine actual status (more reliable than status field)
    if (currentPayroll.finance_signoff_at) return 'finalized'
    if (currentPayroll.hr_signoff_at) return 'hr_signed'
    return 'pending'
  }, [currentPayroll])

  const {
    getOrCreatePayrollCycle,
    getPayrollLockStats,
    getEmployeeLocks,
    toggleHRLock,
    toggleFinanceLock,
    bulkHRLock,
    bulkFinanceLock
  } = usePayrollFinalization()

  const [newEmployee, setNewEmployee] = useState({ employee_id: '', employee_name: '', designation: '', department: '', joining_date: '', payment_mode: 'INR Account' as PaymentMode })

  // Load payroll finalization data when month/year changes
  useEffect(() => {
    loadPayrollData()
  }, [month, year])

  const loadPayrollData = async () => {
    try {
      console.log(`📅 Loading payroll data for ${month}/${year}`)
      const payroll = await getOrCreatePayrollCycle(month, year)
      console.log('📊 Payroll loaded:', {
        id: payroll.id,
        status: payroll.status,
        hr_signoff_at: payroll.hr_signoff_at,
        finance_signoff_at: payroll.finance_signoff_at
      })
      setCurrentPayroll(payroll)

      // Check if payroll is finalized and load snapshot data
      const isFinalized = !!payroll.finance_signoff_at
      if (isFinalized) {
        console.log('📸 Payroll is finalized, fetching snapshot data...')
        const { data: reportData, error: reportError } = await supabase
          .from('payroll_reports')
          .select('report_data, total_employees')
          .eq('month', month)
          .eq('year', year)
          .eq('report_type', 'snapshot')
          .eq('is_finalized', true)
          .single()

        if (reportError) {
          console.error('Error fetching snapshot:', reportError)
          setSnapshotData(null)
          setIsViewingSnapshot(false)
          // Still load live stats if snapshot fails
          const stats = await getPayrollLockStats(payroll.id)
          setLockStats(stats)
        } else if (reportData?.report_data) {
          const snapshotEmployees = reportData.report_data as any[]
          const snapshotCount = reportData.total_employees || snapshotEmployees.length
          console.log('📸 Snapshot data loaded:', snapshotCount, 'employees')
          setSnapshotData(snapshotEmployees)
          setIsViewingSnapshot(true)

          // For finalized payrolls, use FROZEN lock stats from snapshot
          setLockStats({
            total_employees: snapshotCount,
            hr_locked_count: snapshotCount,
            finance_locked_count: snapshotCount,
            can_hr_signoff: true,
            can_finance_signoff: true
          })
        } else {
          console.log('⚠️ No snapshot data found for finalized payroll')
          setSnapshotData(null)
          setIsViewingSnapshot(false)
          const stats = await getPayrollLockStats(payroll.id)
          setLockStats(stats)
        }

        // For finalized payrolls, don't load live locks
        setEmployeeLocks(new Map())
        setEmployeeValidation(new Map())
      } else {
        // Not finalized, use live data
        setSnapshotData(null)
        setIsViewingSnapshot(false)

        // Load lock stats and employee locks in PARALLEL for better performance
        const [stats, locks] = await Promise.all([
          getPayrollLockStats(payroll.id),
          getEmployeeLocks(payroll.id)
        ])

        console.log('🔒 Lock stats:', stats)
        setLockStats(stats)

        const lockMap = new Map(locks.map(l => [l.employee_id, l]))
        setEmployeeLocks(lockMap)

        // Note: We skip validateAllEmployees on initial load for performance
        // Validation will be done on-demand when user interacts with lock buttons
        setEmployeeValidation(new Map())
      }
    } catch (error) {
      console.error('Error loading payroll data:', error)
    }
  }

  /*
  const validateAllEmployees = async () => {
    const validationMap = new Map()

    for (const employee of employees) {
      const hrValidation = await validateHRLock(employee.id)
      const financeValidation = await validateFinanceLock(employee.id)

      // Also check for type vs amount consistency
      const typeAmountErrors = validateTypeAmountConsistencyForEmployee(employee)
      const hasTypeAmountErrors = Object.keys(typeAmountErrors).length > 0
      const typeAmountMissingFields = Object.values(typeAmountErrors)

      validationMap.set(employee.id, {
        canLockHR: hrValidation.can_lock && !hasTypeAmountErrors,
        canLockFinance: financeValidation.can_lock && !hasTypeAmountErrors,
        missingHRFields: [...hrValidation.missing_fields, ...typeAmountMissingFields],
        missingFinanceFields: [...financeValidation.missing_fields, ...typeAmountMissingFields]
      })
    }

    setEmployeeValidation(validationMap)
  }
  */

  /*
  // Validate type vs amount consistency for an employee (using saved data, not edit state)
  const validateTypeAmountConsistencyForEmployee = (emp: any): RowValidationError => {
    const errors: RowValidationError = {}

    const deductionType = emp.payroll?.deduction_type
    const deductionAmount = Number(emp.payroll?.deduction_amount || 0)
    const additionType = emp.payroll?.addition_type
    const additionAmount = Number(emp.payroll?.addition_amount || 0)
    const incentiveType = emp.payroll?.incentive_type
    const incentiveAmount = Number(emp.payroll?.incentive_amount || 0)

    // If deduction type is not 'Nil' and not empty, amount must be > 0
    if (deductionType && deductionType !== 'Nil' && deductionType !== '' && deductionAmount <= 0) {
      errors.deduction = `Deduction amount required for "${deductionType}"`
    }

    // If addition type is not 'Nil' and not empty, amount must be > 0
    if (additionType && additionType !== 'Nil' && additionType !== '' && additionAmount <= 0) {
      errors.addition = `Addition amount required for "${additionType}"`
    }

    // If incentive type is not 'Nil' and not empty, amount must be > 0
    if (incentiveType && incentiveType !== 'Nil' && incentiveType !== '' && incentiveAmount <= 0) {
      errors.incentive = `Incentive amount required for "${incentiveType}"`
    }

    return errors
  }
  */

  // Filter snapshot data client-side when viewing a snapshot
  const displayedEmployees = useMemo(() => {
    if (isViewingSnapshot && snapshotData) {
      let filtered = [...snapshotData]

      // Apply filters client-side to snapshot data
      if (filters.isActive === 'active') {
        filtered = filtered.filter(emp => emp.is_active !== false) // Treat null/undefined as active for safety, or strict true
      } else if (filters.isActive === 'deactivated') {
        filtered = filtered.filter(emp => emp.is_active === false)
      }

      if (filters.employmentStatus) {
        filtered = filtered.filter(emp => emp.employment_status === filters.employmentStatus)
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(emp =>
          (emp.employee_name && emp.employee_name.toLowerCase().includes(searchLower)) ||
          (emp.employee_id && emp.employee_id.toLowerCase().includes(searchLower))
        )
      }

      if (filters.pfApplicable) {
        filtered = filtered.filter(emp => emp.pf_applicable === filters.pfApplicable)
      }
      if (filters.esiApplicable) {
        filtered = filtered.filter(emp => emp.esi_applicable === filters.esiApplicable)
      }
      if (filters.designation) {
        filtered = filtered.filter(emp => emp.designation === filters.designation)
      }
      if (filters.department) {
        filtered = filtered.filter(emp => emp.department === filters.department)
      }
      if (filters.paymentMode) {
        filtered = filtered.filter(emp => emp.payment_mode === filters.paymentMode)
      }
      if (filters.deductionType) {
        filtered = filtered.filter(emp => emp.payroll?.deduction_type === filters.deductionType)
      }
      if (filters.additionType) {
        filtered = filtered.filter(emp => emp.payroll?.addition_type === filters.additionType)
      }
      if (filters.incentiveType) {
        filtered = filtered.filter(emp => emp.payroll?.incentive_type === filters.incentiveType)
      }
      if (filters.hrRemark) {
        filtered = filtered.filter(emp => emp.payroll?.hr_remark === filters.hrRemark)
      }
      if (filters.salaryProcessingRequired) {
        filtered = filtered.filter(emp => emp.payroll?.salary_processing_required === filters.salaryProcessingRequired)
      }
      if (filters.paymentStatus) {
        filtered = filtered.filter(emp => emp.payroll?.payment_status === filters.paymentStatus)
      }

      return filtered
    }

    return employees
  }, [isViewingSnapshot, snapshotData, employees, filters])

  const handleHRLockToggle = async (employeeId: string) => {
    if (!currentPayroll) return

    const currentLock = employeeLocks.get(employeeId)
    const isLocked = currentLock?.hr_locked || false

    const success = await toggleHRLock(employeeId, currentPayroll.id, isLocked)
    if (success) {
      await loadPayrollData()
    }
  }

  const handleFinanceLockToggle = async (employeeId: string) => {
    if (!currentPayroll) return

    const currentLock = employeeLocks.get(employeeId)
    const isLocked = currentLock?.finance_locked || false

    const success = await toggleFinanceLock(employeeId, currentPayroll.id, isLocked)
    if (success) {
      await loadPayrollData()
    }
  }

  const handleSignoffSuccess = async () => {
    await loadPayrollData()
    await refreshPayrollMonths() // Refresh payroll month progression after finalization
    refetch()
  }

  const handleFinanceSignoffSuccess = async () => {
    await handleSignoffSuccess() // Load fresh data first
    await generateFinalizedReport() // Auto-generate the snapshot report
  }

  // Open bulk lock confirmation dialog
  const openBulkLockConfirm = (type: 'hr' | 'finance', lock: boolean) => {
    setBulkLockAction({ type, lock })
    setShowBulkLockConfirm(true)
  }

  // Execute bulk lock after confirmation
  const executeBulkLock = async () => {
    if (!bulkLockAction || !currentPayroll) return

    const employeeIds = employees.filter(emp => emp.is_active).map(emp => emp.id)
    if (employeeIds.length === 0) {
      alert('No active employees to lock/unlock')
      setShowBulkLockConfirm(false)
      setBulkLockAction(null)
      return
    }

    setShowBulkLockConfirm(false)
    setBulkLockLoading(true)

    try {
      let result
      if (bulkLockAction.type === 'hr') {
        result = await bulkHRLock(currentPayroll.id, employeeIds, bulkLockAction.lock)
      } else {
        result = await bulkFinanceLock(currentPayroll.id, employeeIds, bulkLockAction.lock)
      }
      await loadPayrollData()

      const roleLabel = bulkLockAction.type === 'hr' ? 'HR' : 'Finance'
      const message = bulkLockAction.lock
        ? `${roleLabel} Lock completed: ${result.success} locked, ${result.skipped} skipped (validation failed), ${result.failed} failed`
        : `${roleLabel} Unlock completed: ${result.success} unlocked, ${result.failed} failed`
      alert(message)
    } catch (error) {
      console.error('Bulk lock error:', error)
      alert('Failed to perform bulk lock operation')
    } finally {
      setBulkLockLoading(false)
      setBulkLockAction(null)
    }
  }

  // Cancel bulk lock confirmation
  const cancelBulkLockConfirm = () => {
    setShowBulkLockConfirm(false)
    setBulkLockAction(null)
  }

  // Real-time employee ID validation
  useEffect(() => {
    const checkEmployeeId = async () => {
      if (!newEmployee.employee_id.trim()) {
        setEmployeeIdExists(false)
        return
      }

      setCheckingEmployeeId(true)
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_id', newEmployee.employee_id.trim())
          .maybeSingle()

        if (error && error.code !== 'PGRST116') throw error
        setEmployeeIdExists(!!data)
      } catch (error) {
        console.error('Error checking employee ID:', error)
      } finally {
        setCheckingEmployeeId(false)
      }
    }

    const timeoutId = setTimeout(checkEmployeeId, 300)
    return () => clearTimeout(timeoutId)
  }, [newEmployee.employee_id])


  useEffect(() => {
    fetchPayrollSignOff()
  }, [month, year])

  const fetchPayrollSignOff = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_signoffs')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setPayrollSignOff(data)
    } catch (error) {
      console.error('Error fetching payroll sign-off:', error)
    }
  }

  const checkPayrollComplete = () => {
    if (employees.length === 0) return false

    // Check if all employees have payroll records with required fields filled
    return employees.every(emp => {
      if (!emp.payroll) return false

      // Check required fields are not null/empty
      const hasBasicInfo = emp.employee_id && emp.employee_name && emp.employment_status
      const hasPayrollInfo = emp.payroll.employee_salary > 0
      const hasDeduction = emp.payroll.deduction_type !== null && emp.payroll.deduction_type !== undefined
      const hasAddition = emp.payroll.addition_type !== null && emp.payroll.addition_type !== undefined
      const hasHrRemark = emp.payroll.hr_remark !== null && emp.payroll.hr_remark !== undefined

      return hasBasicInfo && hasPayrollInfo && hasDeduction && hasAddition && hasHrRemark
    })
  }

  const handleAddEmployee = async () => {
    try {
      setSaving(true)
      await supabase.from('employees').insert({
        employee_id: newEmployee.employee_id,
        employee_name: newEmployee.employee_name,
        designation: newEmployee.designation || null,
        department: newEmployee.department || null,
        joining_date: newEmployee.joining_date || null,
        employment_status: 'Employed' as EmploymentStatus,
        pf_applicable: 'No' as YesNo,
        esi_applicable: 'No' as YesNo,
        payment_mode: newEmployee.payment_mode,
        current_salary: 0,
        is_active: true,
        created_by: profile?.id,
      })
      setShowAddEmployee(false)
      setNewEmployee({ employee_id: '', employee_name: '', designation: '', department: '', joining_date: '', payment_mode: 'INR Account' as PaymentMode })
      refetch()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateRowField = (employeeId: string, field: string, value: any, isPayrollField: boolean) => {
    console.log('Field updated:', { employeeId, field, value, isPayrollField })
    setEditStates((prev) => {
      const current = prev[employeeId] || { employee: {}, payroll: {}, isDirty: false }
      const newState = {
        ...prev,
        [employeeId]: {
          ...current,
          [isPayrollField ? 'payroll' : 'employee']: {
            ...current[isPayrollField ? 'payroll' : 'employee'],
            [field]: value,
          },
          isDirty: true,
        },
      }
      console.log('Edit state updated:', newState[employeeId])
      return newState
    })
  }

  const getFieldValue = (emp: any, field: string, isPayrollField: boolean) => {
    const editState = editStates[emp.id]
    if (editState && editState.isDirty) {
      const changedValue = isPayrollField ? editState.payroll[field as keyof MonthlyPayroll] : editState.employee[field as keyof Employee]
      if (changedValue !== undefined) return changedValue
    }
    return isPayrollField ? emp.payroll?.[field as keyof MonthlyPayroll] : emp[field as keyof Employee]
  }

  // Validate deduction/addition/incentive type vs amount consistency
  const validateTypeAmountConsistency = (emp: any): RowValidationError => {
    const errors: RowValidationError = {}

    const deductionType = getFieldValue(emp, 'deduction_type', true)
    const deductionAmount = Number(getFieldValue(emp, 'deduction_amount', true) || 0)
    const additionType = getFieldValue(emp, 'addition_type', true)
    const additionAmount = Number(getFieldValue(emp, 'addition_amount', true) || 0)
    const incentiveType = getFieldValue(emp, 'incentive_type', true)
    const incentiveAmount = Number(getFieldValue(emp, 'incentive_amount', true) || 0)

    // If deduction type is not 'Nil' and not empty, amount must be > 0
    if (deductionType && deductionType !== 'Nil' && deductionType !== '' && deductionAmount <= 0) {
      errors.deduction = `Deduction amount must be greater than 0 when "${deductionType}" is selected`
    }

    // If addition type is not 'Nil' and not empty, amount must be > 0
    if (additionType && additionType !== 'Nil' && additionType !== '' && additionAmount <= 0) {
      errors.addition = `Addition amount must be greater than 0 when "${additionType}" is selected`
    }

    // If incentive type is not 'Nil' and not empty, amount must be > 0
    if (incentiveType && incentiveType !== 'Nil' && incentiveType !== '' && incentiveAmount <= 0) {
      errors.incentive = `Incentive amount must be greater than 0 when "${incentiveType}" is selected`
    }

    return errors
  }

  // Check if employee row has validation errors
  const hasRowValidationErrors = (emp: any): boolean => {
    const errors = validateTypeAmountConsistency(emp)
    return Object.keys(errors).length > 0
  }

  // Get validation errors for display
  const getRowValidationErrors = (emp: any): RowValidationError => {
    return validateTypeAmountConsistency(emp)
  }

  const saveRow = async (emp: any) => {
    const editState = editStates[emp.id]
    if (!editState || !editState.isDirty) {
      console.log('No changes to save for employee:', emp.employee_id)
      return
    }

    // Validate type vs amount consistency before saving
    const validationErrors = validateTypeAmountConsistency(emp)
    if (Object.keys(validationErrors).length > 0) {
      const errorMessages = Object.values(validationErrors).join('\n')
      alert(`Cannot save: Please fix the following errors:\n\n${errorMessages}`)
      return
    }

    console.log('Saving changes for employee:', emp.employee_id, editState)

    try {
      setSavingRows((prev) => new Set(prev).add(emp.id))

      // Update employee fields if changed
      if (Object.keys(editState.employee).length > 0) {
        console.log('Updating employee fields:', editState.employee)
        const { data, error } = await supabase.from('employees').update(editState.employee).eq('id', emp.id)
        if (error) throw error
        console.log('Employee update successful:', data)
      }

      // Update or create payroll fields if changed
      const hasPayrollChanges = Object.keys(editState.payroll).length > 0
      const needsPayrollRecord = !emp.payroll?.id

      if (hasPayrollChanges || needsPayrollRecord) {
        if (emp.payroll?.id) {
          // Update existing payroll record
          if (hasPayrollChanges) {
            console.log('Updating payroll fields:', editState.payroll)
            const { data, error } = await supabase.from('monthly_payroll').update(editState.payroll).eq('id', emp.payroll.id)
            if (error) throw error
            console.log('Payroll update successful:', data)
          }
        } else {
          // Insert new payroll record with required defaults
          const insertData = {
            employee_id: emp.id,
            month,
            year,
            deduction_type: 'Nil',
            deduction_amount: 0,
            addition_type: 'Nil',
            addition_amount: 0,
            incentive_type: 'Nil',
            incentive_amount: 0,
            pf_amount: 0,
            esi_amount: 0,
            hr_remark: 'Nil',
            salary_processing_required: 'Yes',
            payment_status: 'Nil',
            is_locked: false,
            ...editState.payroll, // Override with actual edited values
          }
          console.log('Inserting new payroll record:', insertData)
          const { data, error } = await supabase.from('monthly_payroll').insert(insertData)
          if (error) throw error
          console.log('Payroll insert successful:', data)
        }
      }

      // Clear edit state and refresh
      setEditStates((prev) => {
        const newState = { ...prev }
        delete newState[emp.id]
        return newState
      })

      console.log('Refreshing data...')
      refetch()
      console.log('Save completed successfully')
    } catch (error) {
      console.error('Error saving row:', error)
      alert('Failed to save changes: ' + (error as any)?.message || 'Unknown error')
    } finally {
      setSavingRows((prev) => {
        const newSet = new Set(prev)
        newSet.delete(emp.id)
        return newSet
      })
    }
  }

  const cancelRowEdit = (employeeId: string) => {
    setEditStates((prev) => {
      const newState = { ...prev }
      delete newState[employeeId]
      return newState
    })
  }

  const handleToggleEmployeeStatus = async () => {
    if (!employeeToToggle) return

    try {
      setTogglingEmployeeId(employeeToToggle.id)

      // Toggle employee active status (soft delete)
      const newStatus = !employeeToToggle.is_active
      const { error } = await supabase
        .from('employees')
        .update({ is_active: newStatus })
        .eq('id', employeeToToggle.id)

      if (error) {
        console.error('Toggle status error:', error)
        throw error
      }

      setShowDeactivateDialog(false)
      setEmployeeToToggle(null)
      await refetch()

      const action = newStatus ? 'activated' : 'deactivated'
      alert(`Employee ${employeeToToggle.employee_id} - ${employeeToToggle.name} has been ${action} successfully.`)
    } catch (error: any) {
      console.error('Error toggling employee status:', error)
      alert(`Failed to update employee status: ${error.message || 'Please try again.'}`)
    } finally {
      setTogglingEmployeeId(null)
    }
  }

  const confirmToggleEmployee = (emp: any) => {
    setEmployeeToToggle({
      id: emp.id,
      name: emp.employee_name,
      employee_id: emp.employee_id,
      is_active: emp.is_active
    })
    setShowDeactivateDialog(true)
  }

  const handleGlobalHRSignOff = async () => {
    if (!checkPayrollComplete()) {
      alert('Cannot sign off: Some employees have incomplete payroll information')
      return
    }

    try {
      setSaving(true)

      if (payrollSignOff) {
        // Update existing sign-off
        await supabase
          .from('payroll_signoffs')
          .update({
            hr_signoff_at: new Date().toISOString(),
            hr_signoff_by: profile?.id,
            remarks: signOffRemarks || payrollSignOff.remarks,
            is_complete: true
          })
          .eq('id', payrollSignOff.id)
      } else {
        // Create new sign-off
        await supabase
          .from('payroll_signoffs')
          .insert({
            month,
            year,
            hr_signoff_at: new Date().toISOString(),
            hr_signoff_by: profile?.id,
            remarks: signOffRemarks,
            is_complete: true
          })
      }

      setShowSignOffDialog(false)
      setSignOffRemarks('')
      await fetchPayrollSignOff()
      refetch()
    } catch (error) {
      console.error('Error during HR sign-off:', error)
      alert('Failed to sign off. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelHRSignOff = async () => {
    if (!payrollSignOff?.hr_signoff_at) return

    // Check if the current user is the one who signed off
    if (payrollSignOff.hr_signoff_by !== profile?.id) {
      alert('Only the person who signed off can cancel the signoff')
      return
    }

    try {
      setSaving(true)

      await supabase
        .from('payroll_signoffs')
        .update({
          hr_signoff_at: null,
          hr_signoff_by: null,
          remarks: signOffRemarks ? `[HR CANCELLED] ${signOffRemarks}\n${payrollSignOff.remarks || ''}` : payrollSignOff.remarks
        })
        .eq('id', payrollSignOff.id)

      setShowSignOffDialog(false)
      setSignOffRemarks('')
      await fetchPayrollSignOff()
      refetch()
    } catch (error) {
      console.error('Error cancelling HR sign-off:', error)
      alert('Failed to cancel sign-off. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const generateFinalizedReport = async () => {
    try {
      console.log('🔄 Starting report generation for', getMonthName(month), year)

      // Fetch all ACTIVE employees with their payroll data for this month
      // Filter out inactive employees to match the signoff scope (240 vs 246)
      const employeesWithPayroll = employees
        .filter(emp => emp.is_active)
        .map(emp => ({
          ...emp,
          payroll: emp.payroll
        }))

      console.log('📊 Employees with payroll:', employeesWithPayroll.length)

      // Calculate totals
      const totalGrossSalary = employeesWithPayroll.reduce((sum, emp) => sum + ((emp.payroll as any)?.gross_salary || 0), 0)
      const totalDeductions = employeesWithPayroll.reduce((sum, emp) => sum + ((emp.payroll as any)?.deduction_amount || 0), 0)
      const totalNetSalary = employeesWithPayroll.reduce((sum, emp) => sum + ((emp.payroll as any)?.net_pay || 0), 0)

      console.log('💰 Totals - Gross:', totalGrossSalary, 'Deductions:', totalDeductions, 'Net:', totalNetSalary)

      // Create immutable snapshot report
      const { data, error } = await supabase.from('payroll_reports').upsert({
        month,
        year,
        report_name: `Payroll Report - ${getMonthName(month)} ${year}`,
        report_type: 'snapshot',
        total_employees: employeesWithPayroll.length,
        total_gross_salary: totalGrossSalary,
        total_deductions: totalDeductions,
        total_net_salary: totalNetSalary,
        generated_by: profile?.id,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        finance_approved_by: profile?.id,
        report_data: employeesWithPayroll,
      }, { onConflict: 'month,year,report_type' })

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }

      console.log('✅ Finalized report generated successfully!', data)
      alert(`Report generated successfully for ${getMonthName(month)} ${year}!`)
    } catch (error) {
      console.error('❌ Error generating finalized report:', error)
      alert('Warning: Report generation failed. Please check console for details.')
      // Don't fail the approval if report generation fails
    }
  }

  const handleGlobalFinanceAction = async (approve: boolean) => {
    if (!payrollSignOff?.hr_signoff_at) {
      alert('HR must sign off first')
      return
    }

    try {
      setSaving(true)

      if (approve) {
        // Approve payroll
        await supabase
          .from('payroll_signoffs')
          .update({
            finance_signoff_at: new Date().toISOString(),
            finance_signoff_by: profile?.id,
            remarks: signOffRemarks || payrollSignOff.remarks
          })
          .eq('id', payrollSignOff.id)

        // Auto-generate finalized report
        await generateFinalizedReport()
      } else {
        // Reject payroll - clear HR sign-off
        if (!signOffRemarks) {
          alert('Please provide remarks for rejection')
          setSaving(false)
          return
        }

        await supabase
          .from('payroll_signoffs')
          .update({
            hr_signoff_at: null,
            hr_signoff_by: null,
            remarks: `[REJECTED] ${signOffRemarks}\n${payrollSignOff.remarks || ''}`
          })
          .eq('id', payrollSignOff.id)
      }

      setShowSignOffDialog(false)
      setSignOffRemarks('')
      setIsRejecting(false)
      await fetchPayrollSignOff()
      refetch()
    } catch (error) {
      console.error('Error during finance action:', error)
      alert('Failed to process. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Export Raw Data to Excel (Admin Only)
  const handleExportRawExcel = () => {
    if (profile?.role !== 'admin') return

    try {
      // Flatten data for export
      const exportData = employees.map(emp => ({
        'Employee ID': emp.employee_id,
        'Name': emp.employee_name,
        'Status': emp.employment_status,
        'Designation': emp.designation,
        'Department': emp.department,
        'Joining Date': emp.joining_date,
        'End Date': emp.end_date,
        'Basic Salary': emp.current_salary,
        'PF Applicable': emp.pf_applicable,
        'ESI Applicable': emp.esi_applicable,
        'Bank Account': emp.bank_account_number,
        'Bank Name': emp.bank_name,
        'IFSC': emp.bank_ifsc_code,
        'Payment Mode': emp.payment_mode,
        // Payroll Data
        'Deduction Type': emp.payroll?.deduction_type || '',
        'Deduction Amount': emp.payroll?.deduction_amount || 0,
        'Addition Type': emp.payroll?.addition_type || '',
        'Addition Amount': emp.payroll?.addition_amount || 0,
        'Incentive Type': emp.payroll?.incentive_type || '',
        'Incentive Amount': emp.payroll?.incentive_amount || 0,
        'PF Amount': emp.payroll?.pf_amount || 0,
        'ESI Amount': emp.payroll?.esi_amount || 0,
        'Net Pay': emp.payroll?.net_pay || 0,
        'HR Remark': emp.payroll?.hr_remark || '',
        'Payment Status': emp.payroll?.payment_status || '',
        'General Remarks': emp.payroll?.remarks || ''
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data')

      const fileName = `Payroll_Raw_Data_${getMonthName(month)}_${year}.xlsx`
      XLSX.writeFile(workbook, fileName)

      alert(`Successfully exported ${exportData.length} records to ${fileName}`)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please check console for details.')
    }
  }

  // Bulk Save All Changes
  const handleBulkSave = async () => {
    const dirtyEmployeeIds = Object.keys(editStates).filter(id => editStates[id].isDirty)
    if (dirtyEmployeeIds.length === 0) return

    if (!confirm(`Are you sure you want to save changes for ${dirtyEmployeeIds.length} employees? This will verify and calculate Net Pay for all.`)) {
      return
    }

    setSaving(true)
    let savedCount = 0
    let errorCount = 0

    try {
      for (const empId of dirtyEmployeeIds) {
        const emp = employees.find(e => e.id === empId)
        if (!emp) continue

        const errors = validateTypeAmountConsistency(emp)
        if (Object.keys(errors).length > 0) {
          console.warn(`Skipping save for ${emp.employee_id} due to validation errors`)
          errorCount++
          continue
        }

        try {
          await saveRow(emp)
          savedCount++
        } catch (err) {
          console.error(`Failed to save ${emp.employee_id}`, err)
          errorCount++
        }
      }

      alert(`Bulk Save Completed!\nSuccessfully saved: ${savedCount}\nFailed/Skipped: ${errorCount}`)

      if (savedCount > 0) {
        refetch()
      }
    } catch (error) {
      console.error('Bulk save fatal error:', error)
      alert('An unexpected error occurred during bulk save.')
    } finally {
      setSaving(false)
    }
  }

  const isPayrollLocked = actualPayrollStatus === 'finalized'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-600 mt-1">{getMonthName(month)} {year} Payroll</p>
        </div>
        <div className="flex items-center gap-3">
          {(isFinance || isHR) && (
            <Button
              variant="outline"
              onClick={generateFinalizedReport}
              disabled={actualPayrollStatus !== 'finalized'}
              className={actualPayrollStatus === 'finalized'
                ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"}
              title={actualPayrollStatus === 'finalized'
                ? "Generate report for finalized payroll"
                : "Payroll must be Finance-approved first"}
            >
              📊 Generate Report
            </Button>
          )}
          <MonthNavigator
            month={month}
            year={year}
            onMonthChange={goToMonth}
            onGoToActive={goToActiveMonth}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            isViewingFinalized={isViewingFinalizedMonth}
            isViewingActive={isViewingActive}
            activeMonth={activeMonth}
            activeYear={activeYear}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} className="pl-10" />
            </div>
            <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)}><Filter className="mr-2 h-4 w-4" />Filters</Button>
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Save Button - Visible only when there are unsaved changes */}
              {Object.keys(editStates).some(k => editStates[k].isDirty) && (
                <Button
                  onClick={handleBulkSave}
                  disabled={saving}
                  className="mr-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving All...' : `Save All (${Object.keys(editStates).filter(k => editStates[k].isDirty).length})`}
                </Button>
              )}

              {profile?.role === 'admin' && (
                <Button
                  variant="outline"
                  onClick={handleExportRawExcel}
                  className="mr-2"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Export Raw Data
                </Button>
              )}

              {isHR && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={() => setShowAddEmployee(true)}
                          disabled={isPayrollLocked}
                          className={isPayrollLocked ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <Plus className="mr-2 h-4 w-4" />Add
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isPayrollLocked && (
                      <TooltipContent>
                        <p>Cannot add employees to a finalized payroll month</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          onClick={() => setShowBulkUpload(true)}
                          disabled={isPayrollLocked}
                          className={isPayrollLocked ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <Upload className="mr-2 h-4 w-4" />Upload
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isPayrollLocked && (
                      <TooltipContent>
                        <p>Cannot upload employees to a finalized payroll month</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Select value={filters.isActive} onChange={(e) => updateFilter('isActive', e.target.value)} options={[{ value: '', label: 'All (Active + Deactivated)' }, { value: 'active', label: 'Active Only' }, { value: 'deactivated', label: 'Deactivated Only' }]} />
              <Select value={filters.employmentStatus} onChange={(e) => updateFilter('employmentStatus', e.target.value)} options={employmentStatusOptions} />
              <Select value={filters.designation} onChange={(e) => updateFilter('designation', e.target.value)} options={[{ value: '', label: 'All Designation' }, ...designations.map((d) => ({ value: d.name, label: d.name }))]} />
              <Select value={filters.department} onChange={(e) => updateFilter('department', e.target.value)} options={[{ value: '', label: 'All Department' }, ...departments.map((d) => ({ value: d.name, label: d.name }))]} />
              <Select value={filters.pfApplicable} onChange={(e) => updateFilter('pfApplicable', e.target.value)} options={[{ value: '', label: 'All PF Applicable' }, { value: 'Yes', label: 'PF: Yes' }, { value: 'No', label: 'PF: No' }]} />
              <Select value={filters.esiApplicable} onChange={(e) => updateFilter('esiApplicable', e.target.value)} options={[{ value: '', label: 'All ESI Applicable' }, { value: 'Yes', label: 'ESI: Yes' }, { value: 'No', label: 'ESI: No' }]} />
              <Select value={filters.paymentMode} onChange={(e) => updateFilter('paymentMode', e.target.value)} options={[{ value: '', label: 'All Payment Mode' }, ...paymentModeOptions]} />
              <Select value={filters.deductionType} onChange={(e) => updateFilter('deductionType', e.target.value)} options={[{ value: '', label: 'All Deduction' }, ...deductions.map((d) => ({ value: d.name, label: d.name }))]} />
              <Select value={filters.additionType} onChange={(e) => updateFilter('additionType', e.target.value)} options={[{ value: '', label: 'All Addition' }, ...additions.map((d) => ({ value: d.name, label: d.name }))]} />
              <Select value={filters.incentiveType} onChange={(e) => updateFilter('incentiveType', e.target.value)} options={[{ value: '', label: 'All Incentive' }, ...incentives.map((d) => ({ value: d.name, label: d.name }))]} />
              <Select value={filters.hrRemark} onChange={(e) => updateFilter('hrRemark', e.target.value)} options={hrRemarkOptions} />
              <Select value={filters.paymentStatus} onChange={(e) => updateFilter('paymentStatus', e.target.value)} options={paymentStatusOptions} />
              <Button variant="ghost" onClick={clearFilters}><X className="mr-2 h-4 w-4" />Clear Filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payroll Finalization Status */}
      <Card>
        <CardContent className="p-4">
          {/* DEBUG INFO */}
          <div className="bg-red-100 p-2 border border-red-500 text-xs font-mono mb-4">
            <strong>DEBUG INFO:</strong><br />
            ID: {currentPayroll?.id}<br />
            Status: {currentPayroll?.status}<br />
            HR Signed: {currentPayroll?.hr_signoff_at || 'NULL'}<br />
            Finance Signed: {currentPayroll?.finance_signoff_at || 'NULL'}<br />
            Computed Status: {actualPayrollStatus}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Status Badge and Lock Progress - Compact Layout */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Payroll Status:</span>
                {currentPayroll && (
                  <Badge variant={
                    actualPayrollStatus === 'finalized' ? 'default' :
                      actualPayrollStatus === 'hr_signed' ? 'secondary' :
                        'outline'
                  }>
                    {actualPayrollStatus === 'finalized' ? '🟢 Finalized' :
                      actualPayrollStatus === 'hr_signed' ? '🔵 HR Signed' :
                        '🟡 Pending'}
                  </Badge>
                )}
              </div>

              {/* Lock Progress Indicators */}
              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-600">HR Locks:</span>
                <span className="font-semibold">{lockStats?.hr_locked_count || 0}/{lockStats?.total_employees || 0}</span>
              </div>

              <div className="flex items-center gap-1 text-sm">
                <span className="text-slate-600">Finance Locks:</span>
                <span className="font-semibold">{lockStats?.finance_locked_count || 0}/{lockStats?.total_employees || 0}</span>
              </div>
            </div>

            {/* Bulk Lock Buttons and Sign-off Buttons */}
            <div className="flex flex-wrap gap-2">
              {/* HR Bulk Lock Buttons */}
              {isHR && actualPayrollStatus === 'pending' && (
                <>
                  {(lockStats?.hr_locked_count || 0) < (lockStats?.total_employees || 0) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkLockConfirm('hr', true)}
                      disabled={bulkLockLoading}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {bulkLockLoading ? 'Locking...' : 'Lock All (HR)'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkLockConfirm('hr', false)}
                      disabled={bulkLockLoading}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {bulkLockLoading ? 'Unlocking...' : 'Unlock All (HR)'}
                    </Button>
                  )}
                </>
              )}

              {/* Finance Bulk Lock Buttons */}
              {isFinance && (actualPayrollStatus === 'hr_signed' || actualPayrollStatus === 'pending') && (
                <>
                  {(lockStats?.finance_locked_count || 0) < (lockStats?.total_employees || 0) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkLockConfirm('finance', true)}
                      disabled={bulkLockLoading}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {bulkLockLoading ? 'Locking...' : 'Lock All (Finance)'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkLockConfirm('finance', false)}
                      disabled={bulkLockLoading}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {bulkLockLoading ? 'Unlocking...' : 'Unlock All (Finance)'}
                    </Button>
                  )}
                </>
              )}

              {/* HR Sign-off Button */}
              {isHR && actualPayrollStatus === 'pending' && (
                <Button
                  onClick={() => setShowHRSignoffModal(true)}
                  disabled={!lockStats?.can_hr_signoff}
                  title={!lockStats?.can_hr_signoff ? 'Lock all employees before signing off' : ''}
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  HR Sign Off
                </Button>
              )}

              {/* Finance Sign-off Button */}
              {isFinance && (actualPayrollStatus === 'hr_signed' || actualPayrollStatus === 'pending') && (
                <Button
                  onClick={() => setShowFinanceSignoffModal(true)}
                  disabled={!((lockStats?.finance_locked_count || 0) > 0 && (lockStats?.finance_locked_count === lockStats?.total_employees))}
                  title={!((lockStats?.finance_locked_count || 0) > 0 && (lockStats?.finance_locked_count === lockStats?.total_employees)) ? 'Lock all employees before signing off' : ''}
                  size="sm"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finance Sign Off
                </Button>
              )}

              {actualPayrollStatus === 'finalized' && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Payroll finalized for {getMonthName(month)} {year}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finalized Snapshot Banner */}
      {isViewingSnapshot && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Viewing Finalized Payroll Snapshot</h3>
                <p className="text-sm text-amber-700">
                  This is an immutable snapshot from when the payroll was finalized on {currentPayroll?.finance_signoff_at ? new Date(currentPayroll.finance_signoff_at).toLocaleDateString() : 'N/A'}.
                  All data is read-only and reflects the exact state at finalization time.
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Employees ({displayedEmployees.length}){isViewingSnapshot && <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800">Snapshot</Badge>}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center">Loading...</div> : displayedEmployees.length === 0 ? <div className="p-8 text-center text-slate-500">No employees found</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[115px] px-4">ID</TableHead>
                    <TableHead className="w-[200px] px-4">Name</TableHead>
                    <TableHead className="w-[150px] px-4">Status</TableHead>
                    <TableHead className="w-[160px] px-4">Designation</TableHead>
                    <TableHead className="w-[160px] px-4">Department</TableHead>
                    <TableHead className="w-[150px] px-4">Joining Date</TableHead>
                    <TableHead className="w-[150px] px-4">End Date</TableHead>
                    <TableHead className="w-[140px] px-4">Salary</TableHead>
                    <TableHead className="w-[140px] px-4">PF Applicable</TableHead>
                    <TableHead className="w-[140px] px-4">ESI Applicable</TableHead>
                    <TableHead className="w-[180px] px-4">Bank Account</TableHead>
                    <TableHead className="w-[180px] px-4">Bank Name</TableHead>
                    <TableHead className="w-[150px] px-4">Bank IFSC</TableHead>
                    <TableHead className="w-[140px] px-4">Payment Mode</TableHead>
                    <TableHead className="w-[160px] px-4">Deduction</TableHead>
                    <TableHead className="w-[130px] px-4">Ded Amt</TableHead>
                    <TableHead className="w-[160px] px-4">Addition</TableHead>
                    <TableHead className="w-[130px] px-4">Add Amt</TableHead>
                    <TableHead className="w-[160px] px-4">
                      <div className="flex items-center gap-1">
                        Incentive
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Incentive is not part of net pay calculation</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="w-[130px] px-4">
                      <div className="flex items-center gap-1">
                        Inc Amt
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Incentive is not part of net pay calculation</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="w-[130px] px-4">PF</TableHead>
                    <TableHead className="w-[130px] px-4">ESI</TableHead>
                    <TableHead className="w-[140px] px-4">Net Pay</TableHead>
                    <TableHead className="w-[180px] px-4">HR Remark</TableHead>
                    <TableHead className="w-[140px] px-4">Payment</TableHead>
                    <TableHead className="w-[200px] px-4">Remarks</TableHead>
                    <TableHead className="w-[120px] px-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEmployees.map((emp) => {
                    const hrSigned = !!payrollSignOff?.hr_signoff_at
                    const finSigned = !!payrollSignOff?.finance_signoff_at
                    const isDirty = editStates[emp.id]?.isDirty
                    const isSaving = savingRows.has(emp.id)
                    // Employee can be edited only if: not payroll locked, user has permission, AND employee is active
                    const canEditRow = !isPayrollLocked && (isHR || isFinance) && emp.is_active

                    // Check individual employee locks
                    const employeeLock = employeeLocks.get(emp.id)
                    const isHRLocked = employeeLock?.hr_locked || false
                    const isFinanceLocked = employeeLock?.finance_locked || false

                    return (
                      <TableRow key={emp.id} className={`${isDirty ? 'bg-yellow-50' : ''} ${!emp.is_active ? 'bg-gray-100 opacity-60' : ''}`}>
                        <TableCell className="font-mono text-sm px-4">{emp.employee_id}</TableCell>
                        <TableCell className="font-medium px-4">{emp.employee_name}</TableCell>
                        <TableCell className="px-4">
                          {canEdit('employment_status', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'employment_status', false))}
                              onChange={(e) => updateRowField(emp.id, 'employment_status', e.target.value, false)}
                              options={employmentStatusOptions.slice(1)}
                              className="w-32"
                            />
                          ) : (
                            <Badge variant="outline">{emp.employment_status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('designation', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'designation', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'designation', e.target.value, false)}
                              options={[{ value: '', label: 'Select...' }, ...designations.map(d => ({ value: d.name, label: d.name }))]}
                              className="w-36"
                            />
                          ) : (
                            emp.designation || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('department', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'department', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'department', e.target.value, false)}
                              options={[{ value: '', label: 'Select...' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
                              className="w-36"
                            />
                          ) : (
                            emp.department || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('joining_date', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="date"
                              value={String(getFieldValue(emp, 'joining_date', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'joining_date', e.target.value, false)}
                              className="w-36"
                            />
                          ) : (
                            emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('end_date', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="date"
                              value={String(getFieldValue(emp, 'end_date', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'end_date', e.target.value, false)}
                              className="w-36"
                            />
                          ) : (
                            emp.end_date ? new Date(emp.end_date).toLocaleDateString() : '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('current_salary', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={String(getFieldValue(emp, 'current_salary', false) || 0)}
                              onChange={(e) => updateRowField(emp.id, 'current_salary', Number(e.target.value.replace(/[^0-9]/g, '')), false)}
                              className="w-28"
                            />
                          ) : (
                            formatCurrency(emp.current_salary)
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('pf_applicable', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'pf_applicable', false) || 'No')}
                              onChange={(e) => updateRowField(emp.id, 'pf_applicable', e.target.value, false)}
                              options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                              className="w-20"
                            />
                          ) : (
                            <Badge variant={emp.pf_applicable === 'Yes' ? 'default' : 'secondary'}>
                              {emp.pf_applicable}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('esi_applicable', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'esi_applicable', false) || 'No')}
                              onChange={(e) => updateRowField(emp.id, 'esi_applicable', e.target.value, false)}
                              options={[{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }]}
                              className="w-20"
                            />
                          ) : (
                            <Badge variant={emp.esi_applicable === 'Yes' ? 'default' : 'secondary'}>
                              {emp.esi_applicable}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('bank_account_number', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              value={String(getFieldValue(emp, 'bank_account_number', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'bank_account_number', e.target.value, false)}
                              className="w-36"
                            />
                          ) : (
                            emp.bank_account_number || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('bank_name', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              value={String(getFieldValue(emp, 'bank_name', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'bank_name', e.target.value, false)}
                              className="w-36"
                            />
                          ) : (
                            emp.bank_name || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('bank_ifsc_code', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              value={String(getFieldValue(emp, 'bank_ifsc_code', false) || '')}
                              onChange={(e) => updateRowField(emp.id, 'bank_ifsc_code', e.target.value, false)}
                              className="w-32"
                            />
                          ) : (
                            emp.bank_ifsc_code || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('payment_mode', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'payment_mode', false) || 'INR Account')}
                              onChange={(e) => updateRowField(emp.id, 'payment_mode', e.target.value, false)}
                              options={paymentModeOptions}
                              className="w-32"
                            />
                          ) : (
                            <Badge variant={emp.payment_mode === 'AUD Account' ? 'secondary' : 'outline'}>
                              {emp.payment_mode || 'INR Account'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('deduction_type', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'deduction_type', true) || '')}
                              onChange={(e) => updateRowField(emp.id, 'deduction_type', e.target.value, true)}
                              options={[{ value: '', label: 'Select...' }, ...deductions.map(d => ({ value: d.name, label: d.name }))]}
                              className="w-36"
                            />
                          ) : (
                            emp.payroll?.deduction_type || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('deduction_amount', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(getFieldValue(emp, 'deduction_amount', true) || 0)}
                                      onChange={(e) => updateRowField(emp.id, 'deduction_amount', Number(e.target.value.replace(/[^0-9]/g, '')), true)}
                                      className={`w-24 ${getRowValidationErrors(emp).deduction ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                    />
                                    {getRowValidationErrors(emp).deduction && (
                                      <AlertTriangle className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {getRowValidationErrors(emp).deduction && (
                                  <TooltipContent side="top" className="bg-red-600 text-white max-w-xs">
                                    <p>{getRowValidationErrors(emp).deduction}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          ) : actualPayrollStatus === 'finalized' && (emp.payroll?.deduction_amount || 0) > 0 ? (
                            <Badge variant="destructive">
                              {formatCurrency(emp.payroll?.deduction_amount || 0)}
                            </Badge>
                          ) : (
                            formatCurrency(emp.payroll?.deduction_amount || 0)
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('addition_type', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'addition_type', true) || '')}
                              onChange={(e) => updateRowField(emp.id, 'addition_type', e.target.value, true)}
                              options={[{ value: '', label: 'Select...' }, ...additions.map(d => ({ value: d.name, label: d.name }))]}
                              className="w-36"
                            />
                          ) : (
                            emp.payroll?.addition_type || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('addition_amount', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(getFieldValue(emp, 'addition_amount', true) || 0)}
                                      onChange={(e) => updateRowField(emp.id, 'addition_amount', Number(e.target.value.replace(/[^0-9]/g, '')), true)}
                                      className={`w-24 ${getRowValidationErrors(emp).addition ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                    />
                                    {getRowValidationErrors(emp).addition && (
                                      <AlertTriangle className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {getRowValidationErrors(emp).addition && (
                                  <TooltipContent side="top" className="bg-red-600 text-white max-w-xs">
                                    <p>{getRowValidationErrors(emp).addition}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          ) : actualPayrollStatus === 'finalized' && (emp.payroll?.addition_amount || 0) > 0 ? (
                            <Badge variant="success">
                              {formatCurrency(emp.payroll?.addition_amount || 0)}
                            </Badge>
                          ) : (
                            formatCurrency(emp.payroll?.addition_amount || 0)
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('incentive_type', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'incentive_type', true) || '')}
                              onChange={(e) => updateRowField(emp.id, 'incentive_type', e.target.value, true)}
                              options={[{ value: '', label: 'Select...' }, ...incentives.map(d => ({ value: d.name, label: d.name }))]}
                              className="w-36"
                            />
                          ) : (
                            emp.payroll?.incentive_type || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('incentive_amount', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(getFieldValue(emp, 'incentive_amount', true) || 0)}
                                      onChange={(e) => updateRowField(emp.id, 'incentive_amount', Number(e.target.value.replace(/[^0-9]/g, '')), true)}
                                      className={`w-24 ${getRowValidationErrors(emp).incentive ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                    />
                                    {getRowValidationErrors(emp).incentive && (
                                      <AlertTriangle className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                {getRowValidationErrors(emp).incentive && (
                                  <TooltipContent side="top" className="bg-red-600 text-white max-w-xs">
                                    <p>{getRowValidationErrors(emp).incentive}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          ) : actualPayrollStatus === 'finalized' && (emp.payroll?.incentive_amount || 0) > 0 ? (
                            <Badge variant="success">
                              {formatCurrency(emp.payroll?.incentive_amount || 0)}
                            </Badge>
                          ) : (
                            formatCurrency(emp.payroll?.incentive_amount || 0)
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {emp.pf_applicable === 'Yes' && canEdit('pf_amount', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={String(getFieldValue(emp, 'pf_amount', true) || 0)}
                              onChange={(e) => updateRowField(emp.id, 'pf_amount', Number(e.target.value.replace(/[^0-9]/g, '')), true)}
                              className="w-24"
                            />
                          ) : emp.pf_applicable === 'Yes' ? (
                            actualPayrollStatus === 'finalized' && (emp.payroll?.pf_amount || 0) > 0 ? (
                              <Badge variant="destructive">
                                {formatCurrency(emp.payroll?.pf_amount || 0)}
                              </Badge>
                            ) : formatCurrency(emp.payroll?.pf_amount || 0)
                          ) : '-'}
                        </TableCell>
                        <TableCell className="px-4">
                          {emp.esi_applicable === 'Yes' && canEdit('esi_amount', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={String(getFieldValue(emp, 'esi_amount', true) || 0)}
                              onChange={(e) => updateRowField(emp.id, 'esi_amount', Number(e.target.value.replace(/[^0-9]/g, '')), true)}
                              className="w-24"
                            />
                          ) : emp.esi_applicable === 'Yes' ? (
                            actualPayrollStatus === 'finalized' && (emp.payroll?.esi_amount || 0) > 0 ? (
                              <Badge variant="destructive">
                                {formatCurrency(emp.payroll?.esi_amount || 0)}
                              </Badge>
                            ) : formatCurrency(emp.payroll?.esi_amount || 0)
                          ) : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(emp.payroll?.net_pay || 0)}</TableCell>
                        <TableCell className="px-4">
                          {canEdit('hr_remark', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'hr_remark', true) || 'Nil')}
                              onChange={(e) => updateRowField(emp.id, 'hr_remark', e.target.value, true)}
                              options={hrRemarkOptions.slice(1)}
                              className="w-36"
                            />
                          ) : (
                            emp.payroll?.hr_remark || '-'
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('payment_status', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Select
                              value={String(getFieldValue(emp, 'payment_status', true) || 'Nil')}
                              onChange={(e) => updateRowField(emp.id, 'payment_status', e.target.value, true)}
                              options={paymentStatusOptions.slice(1)}
                              className="w-28"
                            />
                          ) : (
                            <Badge variant={emp.payroll?.payment_status === 'Paid' ? 'success' : 'secondary'}>
                              {emp.payroll?.payment_status || 'Nil'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          {canEdit('remarks', hrSigned, finSigned, isHRLocked, isFinanceLocked) && canEditRow ? (
                            <Input
                              type="text"
                              placeholder="Add remarks..."
                              value={String(getFieldValue(emp, 'remarks', true) || '')}
                              onChange={(e) => updateRowField(emp.id, 'remarks', e.target.value, true)}
                              className="w-44"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{emp.payroll?.remarks || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex gap-1">
                            {/* HR Lock Icon */}
                            {isHR && currentPayroll?.status === 'pending' && (
                              <PayrollLockIcon
                                isLocked={employeeLocks.get(emp.id)?.hr_locked || false}
                                lockType="hr"
                                onToggle={() => handleHRLockToggle(emp.id)}
                                disabled={false}
                                canLock={employeeValidation.get(emp.id)?.canLockHR ?? true}
                                missingFields={employeeValidation.get(emp.id)?.missingHRFields ?? []}
                              />
                            )}

                            {/* Finance Lock Icon */}
                            {isFinance && currentPayroll?.status === 'hr_signed' && (
                              <PayrollLockIcon
                                isLocked={employeeLocks.get(emp.id)?.finance_locked || false}
                                lockType="finance"
                                onToggle={() => handleFinanceLockToggle(emp.id)}
                                disabled={false}
                                canLock={employeeValidation.get(emp.id)?.canLockFinance ?? true}
                                missingFields={employeeValidation.get(emp.id)?.missingFinanceFields ?? []}
                              />
                            )}

                            {isDirty && canEditRow && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Button
                                          size="sm"
                                          onClick={() => saveRow(emp)}
                                          disabled={isSaving || hasRowValidationErrors(emp)}
                                          className={`h-8 px-2 ${hasRowValidationErrors(emp) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {hasRowValidationErrors(emp) && (
                                      <TooltipContent side="top" className="bg-red-600 text-white max-w-xs">
                                        <p>Cannot save: Please fill in the required amount fields</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelRowEdit(emp.id)}
                                  disabled={isSaving}
                                  className="h-8 px-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {!isPayrollLocked && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => confirmToggleEmployee(emp)}
                                disabled={togglingEmployeeId === emp.id}
                                className={`h-8 px-2 ${emp.is_active ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                                title={emp.is_active ? 'Deactivate employee' : 'Activate employee'}
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent onClose={() => { setShowAddEmployee(false); setNewEmployee({ employee_id: '', employee_name: '', designation: '', department: '', joining_date: '', payment_mode: 'INR Account' as PaymentMode }); setEmployeeIdExists(false) }}>
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Employee ID *</Label>
              <Input
                value={newEmployee.employee_id}
                onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                className={employeeIdExists ? 'border-red-500' : ''}
              />
              {checkingEmployeeId && (
                <p className="text-xs text-slate-500 mt-1">Checking availability...</p>
              )}
              {employeeIdExists && !checkingEmployeeId && (
                <p className="text-xs text-red-600 mt-1">⚠️ This Employee ID already exists</p>
              )}
              {!employeeIdExists && !checkingEmployeeId && newEmployee.employee_id.trim() && (
                <p className="text-xs text-green-600 mt-1">✓ Employee ID is available</p>
              )}
            </div>
            <div><Label>Full Name *</Label><Input value={newEmployee.employee_name} onChange={(e) => setNewEmployee({ ...newEmployee, employee_name: e.target.value })} /></div>
            <div>
              <Label>Designation</Label>
              <Select
                value={newEmployee.designation}
                onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                options={[{ value: '', label: 'Select...' }, ...designations.map(d => ({ value: d.name, label: d.name }))]}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                options={[{ value: '', label: 'Select...' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
              />
            </div>
            <div><Label>Joining Date</Label><Input type="date" value={newEmployee.joining_date} onChange={(e) => setNewEmployee({ ...newEmployee, joining_date: e.target.value })} /></div>
            <div>
              <Label>Payment Mode</Label>
              <Select
                value={newEmployee.payment_mode}
                onChange={(e) => setNewEmployee({ ...newEmployee, payment_mode: e.target.value as PaymentMode })}
                options={paymentModeOptions}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddEmployee(false); setNewEmployee({ employee_id: '', employee_name: '', designation: '', department: '', joining_date: '', payment_mode: 'INR Account' as PaymentMode }); setEmployeeIdExists(false) }}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={saving || !newEmployee.employee_id || !newEmployee.employee_name || employeeIdExists || checkingEmployeeId}>{saving ? 'Saving...' : 'Add Employee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => {
          refetch()
          setShowBulkUpload(false)
        }}
        existingEmployeeIds={employees.map(emp => emp.employee_id.toUpperCase())}
        systemDesignations={designations}
        systemDepartments={departments}
      />

      <Dialog open={showSignOffDialog} onOpenChange={setShowSignOffDialog}>
        <DialogContent onClose={() => { setShowSignOffDialog(false); setSignOffRemarks(''); setIsRejecting(false); setIsCancellingSignOff(false) }}>
          <DialogHeader><DialogTitle>{isCancellingSignOff ? 'Cancel HR Sign-off' : isRejecting ? 'Reject Payroll' : isHR ? 'HR Sign-off' : 'Finance Approval'}</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">{isCancellingSignOff ? 'Add optional remarks for cancelling sign-off:' : isRejecting ? 'Please provide a reason for rejection:' : 'Add optional remarks:'}</p>
            <Textarea value={signOffRemarks} onChange={(e) => setSignOffRemarks(e.target.value)} placeholder="Enter remarks..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSignOffDialog(false); setSignOffRemarks(''); setIsRejecting(false); setIsCancellingSignOff(false) }}>Cancel</Button>
            {isCancellingSignOff ? <Button variant="destructive" onClick={handleCancelHRSignOff} disabled={saving}>Cancel Sign-off</Button> : isRejecting ? <Button variant="destructive" onClick={() => handleGlobalFinanceAction(false)} disabled={saving}>Reject</Button> : isHR ? <Button onClick={handleGlobalHRSignOff} disabled={saving}>Sign Off</Button> : <Button onClick={() => handleGlobalFinanceAction(true)} disabled={saving}>Approve</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent onClose={() => { setShowDeactivateDialog(false); setEmployeeToToggle(null) }}>
          <DialogHeader>
            <DialogTitle>{employeeToToggle?.is_active ? 'Deactivate Employee' : 'Activate Employee'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              {employeeToToggle?.is_active
                ? 'Are you sure you want to deactivate this employee?'
                : 'Are you sure you want to activate this employee?'}
            </p>
            {employeeToToggle && (
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Employee ID:</span>
                  <span className="font-mono">{employeeToToggle.employee_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-700">Name:</span>
                  <span>{employeeToToggle.name}</span>
                </div>
              </div>
            )}
            <div className={`mt-4 p-3 border rounded-lg ${employeeToToggle?.is_active ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-sm ${employeeToToggle?.is_active ? 'text-orange-800' : 'text-green-800'}`}>
                {employeeToToggle?.is_active ? (
                  <>
                    <strong>Note:</strong> Deactivating this employee will:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>Mark the employee as inactive in the system</li>
                      <li>Display their records in a grey shade</li>
                      <li>Make all fields non-editable (read-only)</li>
                      <li>Preserve all employee data and history</li>
                      <li>Allow you to reactivate them later if needed</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> Activating this employee will:
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      <li>Mark the employee as active in the system</li>
                      <li>Restore normal display of their records</li>
                      <li>Enable editing of all fields</li>
                      <li>Allow them to be included in payroll processing</li>
                    </ul>
                  </>
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeactivateDialog(false); setEmployeeToToggle(null) }}>
              Cancel
            </Button>
            <Button
              variant={employeeToToggle?.is_active ? 'destructive' : 'default'}
              onClick={handleToggleEmployeeStatus}
              disabled={togglingEmployeeId !== null}
            >
              {togglingEmployeeId ? 'Processing...' : employeeToToggle?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HR Sign-off Modal */}
      <HRSignoffModal
        open={showHRSignoffModal}
        onClose={() => setShowHRSignoffModal(false)}
        onSuccess={handleSignoffSuccess}
        month={month}
        year={year}
        payrollId={currentPayroll?.id || ''}
        lockStats={lockStats}
      />

      {/* Finance Sign-off Modal */}
      <FinanceSignoffModal
        open={showFinanceSignoffModal}
        onClose={() => setShowFinanceSignoffModal(false)}
        onSuccess={handleFinanceSignoffSuccess}
        month={month}
        year={year}
        payrollId={currentPayroll?.id || ''}
        lockStats={lockStats}
      />

      {/* Bulk Lock Confirmation Dialog */}
      <Dialog open={showBulkLockConfirm} onOpenChange={(open) => !open && cancelBulkLockConfirm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkLockAction?.lock ? 'Lock' : 'Unlock'} All Employees ({bulkLockAction?.type?.toUpperCase()})
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Are you sure you want to <strong>{bulkLockAction?.lock ? 'lock' : 'unlock'}</strong> all{' '}
              <strong>{employees.filter(emp => emp.is_active).length}</strong> active employees for{' '}
              <strong>{bulkLockAction?.type?.toUpperCase()}</strong>?
            </p>
            {bulkLockAction?.lock && (
              <p className="mt-2 text-sm text-amber-600">
                Note: Employees that don't meet validation requirements will be skipped.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelBulkLockConfirm}>
              Cancel
            </Button>
            <Button onClick={executeBulkLock}>
              {bulkLockAction?.lock ? 'Lock All' : 'Unlock All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
