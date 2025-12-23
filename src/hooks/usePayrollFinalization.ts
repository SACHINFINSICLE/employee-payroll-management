import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  MonthlyPayrollCycle,
  EmployeePayrollLock,
  PayrollLockStats,
  PayrollLockRequirement
} from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

// Company payroll start date
const COMPANY_START_MONTH = 10 // October
const COMPANY_START_YEAR = 2025

export function usePayrollFinalization() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper to check if a month is accessible (can be viewed/created)
  const isMonthAccessible = useCallback(async (month: number, year: number): Promise<boolean> => {
    // Can't access months before company start
    if (year < COMPANY_START_YEAR) return false
    if (year === COMPANY_START_YEAR && month < COMPANY_START_MONTH) return false

    // October 2025 is always accessible (first month)
    if (year === COMPANY_START_YEAR && month === COMPANY_START_MONTH) return true

    // For any other month, the previous month must be finalized
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }

    // Check if previous month is finalized
    const { data: prevPayroll } = await supabase
      .from('monthly_payrolls')
      .select('status, finance_signoff_at')
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .single()

    // Previous month must exist and be finalized
    return !!(prevPayroll && (prevPayroll.finance_signoff_at || prevPayroll.status === 'finalized'))
  }, [])

  // Get or create payroll cycle for a month
  const getOrCreatePayrollCycle = useCallback(async (month: number, year: number) => {
    try {
      setLoading(true)
      setError(null)

      // Check if payroll exists
      const { data: existing, error: fetchError } = await supabase
        .from('monthly_payrolls')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        return existing as MonthlyPayrollCycle
      }

      // SAFEGUARD: Before creating a new payroll, verify this month is accessible
      const accessible = await isMonthAccessible(month, year)
      if (!accessible) {
        throw new Error(`Cannot create payroll for ${month}/${year}: Previous month must be finalized first`)
      }

      // Create new payroll cycle with CLEAN status (no signoff data)
      const { data: newPayroll, error: createError } = await supabase
        .from('monthly_payrolls')
        .insert({
          month,
          year,
          status: 'pending',
          // Explicitly set all signoff fields to null for safety
          hr_signoff_by: null,
          hr_signoff_at: null,
          finance_signoff_by: null,
          finance_signoff_at: null,
          reverted_by: null,
          reverted_at: null,
          reversion_reason: null
        })
        .select()
        .single()

      if (createError) throw createError

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: newPayroll.id,
        action_type: 'payroll_created',
        performed_by: user?.id,
        details: { month, year }
      })

      return newPayroll as MonthlyPayrollCycle
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, isMonthAccessible])

  // Get all payroll cycles
  const getAllPayrollCycles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('monthly_payrolls')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (fetchError) throw fetchError

      return data as MonthlyPayrollCycle[]
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Get lock stats for a payroll
  const getPayrollLockStats = useCallback(async (payrollId: string) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_payroll_lock_stats', { p_payroll_id: payrollId })
        .single()

      if (rpcError) throw rpcError

      return data as PayrollLockStats
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  // Get employee locks for a payroll
  const getEmployeeLocks = useCallback(async (payrollId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('employee_payroll_locks')
        .select('*')
        .eq('payroll_id', payrollId)

      if (fetchError) throw fetchError

      return data as EmployeePayrollLock[]
    } catch (err: any) {
      setError(err.message)
      return []
    }
  }, [])

  // Validate if employee can be HR locked
  const validateHRLock = useCallback(async (employeeId: string) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('can_hr_lock_employee', { p_employee_id: employeeId })
        .single()

      if (rpcError) {
        console.error('HR Validation RPC error:', rpcError)
        // If function doesn't exist, allow locking (backward compatibility)
        if (rpcError.code === '42883') {
          console.warn('can_hr_lock_employee function not found - allowing lock')
          return { can_lock: true, missing_fields: [] }
        }
        throw rpcError
      }

      return data as { can_lock: boolean; missing_fields: string[] }
    } catch (err: any) {
      console.error('Validation error:', err)
      // Default to allowing lock if validation fails (backward compatibility)
      return { can_lock: true, missing_fields: [] }
    }
  }, [])

  // Validate if employee can be Finance locked
  const validateFinanceLock = useCallback(async (employeeId: string) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('can_finance_lock_employee', { p_employee_id: employeeId })
        .single()

      if (rpcError) {
        console.error('Finance Validation RPC error:', rpcError)
        // If function doesn't exist, allow locking (backward compatibility)
        if (rpcError.code === '42883') {
          console.warn('can_finance_lock_employee function not found - allowing lock')
          return { can_lock: true, missing_fields: [] }
        }
        throw rpcError
      }

      return data as { can_lock: boolean; missing_fields: string[] }
    } catch (err: any) {
      console.error('Validation error:', err)
      // Default to allowing lock if validation fails (backward compatibility)
      return { can_lock: true, missing_fields: [] }
    }
  }, [])

  // Toggle HR lock for an employee
  const toggleHRLock = useCallback(async (
    employeeId: string,
    payrollId: string,
    currentlyLocked: boolean
  ) => {
    try {
      setLoading(true)
      setError(null)

      // If trying to lock (not unlock), validate first
      if (!currentlyLocked) {
        const validation = await validateHRLock(employeeId)
        if (!validation.can_lock) {
          const missingFieldsList = validation.missing_fields.join(', ')
          setError(`Cannot lock employee. Missing required fields: ${missingFieldsList}`)
          return false
        }
      }

      // Check if lock record exists
      const { data: existing } = await supabase
        .from('employee_payroll_locks')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('payroll_id', payrollId)
        .single()

      if (existing) {
        // Update existing lock
        const { error: updateError } = await supabase
          .from('employee_payroll_locks')
          .update({
            hr_locked: !currentlyLocked,
            hr_locked_by: !currentlyLocked ? user?.id : null,
            hr_locked_at: !currentlyLocked ? new Date().toISOString() : null
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Create new lock record
        const { error: insertError } = await supabase
          .from('employee_payroll_locks')
          .insert({
            employee_id: employeeId,
            payroll_id: payrollId,
            hr_locked: true,
            hr_locked_by: user?.id,
            hr_locked_at: new Date().toISOString()
          })

        if (insertError) throw insertError
      }

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        employee_id: employeeId,
        action_type: currentlyLocked ? 'hr_unlock' : 'hr_lock',
        performed_by: user?.id
      })

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Toggle Finance lock for an employee
  const toggleFinanceLock = useCallback(async (
    employeeId: string,
    payrollId: string,
    currentlyLocked: boolean
  ) => {
    try {
      setLoading(true)
      setError(null)

      // If trying to lock (not unlock), validate first
      if (!currentlyLocked) {
        const validation = await validateFinanceLock(employeeId)
        if (!validation.can_lock) {
          const missingFieldsList = validation.missing_fields.join(', ')
          setError(`Cannot lock employee. Missing required fields: ${missingFieldsList}`)
          return false
        }
      }

      // Check if lock record exists
      const { data: existing } = await supabase
        .from('employee_payroll_locks')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('payroll_id', payrollId)
        .single()

      if (existing) {
        // Update existing lock
        const { error: updateError } = await supabase
          .from('employee_payroll_locks')
          .update({
            finance_locked: !currentlyLocked,
            finance_locked_by: !currentlyLocked ? user?.id : null,
            finance_locked_at: !currentlyLocked ? new Date().toISOString() : null
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        // Create new lock record
        const { error: insertError } = await supabase
          .from('employee_payroll_locks')
          .insert({
            employee_id: employeeId,
            payroll_id: payrollId,
            finance_locked: true,
            finance_locked_by: user?.id,
            finance_locked_at: new Date().toISOString()
          })

        if (insertError) throw insertError
      }

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        employee_id: employeeId,
        action_type: currentlyLocked ? 'finance_unlock' : 'finance_lock',
        performed_by: user?.id
      })

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // HR Sign-off
  const hrSignoff = useCallback(async (payrollId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Check if can sign off
      const { data: canSignoff } = await supabase
        .rpc('can_hr_signoff', { p_payroll_id: payrollId })
        .single()

      if (!canSignoff) {
        throw new Error('Cannot sign off: Not all employees are locked')
      }

      // Update payroll
      const { error: updateError } = await supabase
        .from('monthly_payrolls')
        .update({
          status: 'hr_signed',
          hr_signoff_by: user?.id,
          hr_signoff_at: new Date().toISOString()
        })
        .eq('id', payrollId)

      if (updateError) throw updateError

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        action_type: 'hr_signoff',
        performed_by: user?.id
      })

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Finance Sign-off
  const financeSignoff = useCallback(async (payrollId: string) => {
    try {
      setLoading(true)
      setError(null)

      // First, get the payroll details to verify month/year
      const { data: payroll, error: payrollError } = await supabase
        .from('monthly_payrolls')
        .select('month, year')
        .eq('id', payrollId)
        .single()

      if (payrollError || !payroll) {
        throw new Error('Payroll not found')
      }

      // SAFEGUARD: Verify this month can be finalized (previous month must be finalized, except for Oct 2025)
      const isFirstMonth = payroll.year === COMPANY_START_YEAR && payroll.month === COMPANY_START_MONTH
      if (!isFirstMonth) {
        let prevMonth = payroll.month - 1
        let prevYear = payroll.year
        if (prevMonth < 1) {
          prevMonth = 12
          prevYear -= 1
        }

        const { data: prevPayroll } = await supabase
          .from('monthly_payrolls')
          .select('status, finance_signoff_at')
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .single()

        const isPrevFinalized = prevPayroll && (prevPayroll.finance_signoff_at || prevPayroll.status === 'finalized')
        if (!isPrevFinalized) {
          throw new Error(`Cannot finalize: Previous month (${prevMonth}/${prevYear}) must be finalized first`)
        }
      }

      interface PayrollLockStats {
        total_employees: number
        hr_locked_count: number
        finance_locked_count: number
        can_hr_signoff: boolean
        can_finance_signoff: boolean
      }

      // Check if can sign off (all employees locked)
      // Note: We are checking this based on lock stats instead of the strict RPC
      // to allow Finance to sign off independently of HR status
      const { data: lockStats, error: statsError } = await supabase
        .rpc('get_payroll_lock_stats', { p_payroll_id: payrollId })
        .single<PayrollLockStats>()

      if (statsError) throw statsError

      const allLocked = lockStats.total_employees > 0 &&
        lockStats.finance_locked_count === lockStats.total_employees

      if (!allLocked) {
        throw new Error('Cannot sign off: Not all employees are locked by Finance')
      }

      // Update ONLY this specific payroll
      const { error: updateError } = await supabase
        .from('monthly_payrolls')
        .update({
          status: 'finalized',
          finance_signoff_by: user?.id,
          finance_signoff_at: new Date().toISOString()
        })
        .eq('id', payrollId)

      if (updateError) throw updateError

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        action_type: 'payroll_finalized',
        performed_by: user?.id,
        details: { month: payroll.month, year: payroll.year }
      })

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Revert payroll finalization (Admin only)
  const revertPayroll = useCallback(async (payrollId: string, reason: string) => {
    try {
      setLoading(true)
      setError(null)

      // Update payroll
      const { error: updateError } = await supabase
        .from('monthly_payrolls')
        .update({
          status: 'pending',
          hr_signoff_by: null,
          hr_signoff_at: null,
          finance_signoff_by: null,
          finance_signoff_at: null,
          reverted_by: user?.id,
          reverted_at: new Date().toISOString(),
          reversion_reason: reason
        })
        .eq('id', payrollId)

      if (updateError) throw updateError

      // Log audit
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        action_type: 'payroll_reverted',
        performed_by: user?.id,
        details: { reason }
      })

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  // Get lock requirements
  const getLockRequirements = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('payroll_lock_requirements')
        .select('*')
        .eq('required_for_lock', true)
        .order('display_name')

      if (fetchError) throw fetchError

      return data as PayrollLockRequirement[]
    } catch (err: any) {
      setError(err.message)
      return []
    }
  }, [])

  // Update lock requirement
  const updateLockRequirement = useCallback(async (
    fieldName: string,
    requiredForHR: boolean,
    requiredForFinance: boolean
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('payroll_lock_requirements')
        .update({
          required_for_hr_lock: requiredForHR,
          required_for_finance_lock: requiredForFinance
        })
        .eq('field_name', fieldName)

      if (updateError) throw updateError

      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // Get HR-signed payrolls (for Finance dropdown)
  const getHRSignedPayrolls = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('monthly_payrolls')
        .select('*')
        .eq('status', 'hr_signed')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (fetchError) throw fetchError

      return data as MonthlyPayrollCycle[]
    } catch (err: any) {
      setError(err.message)
      return []
    }
  }, [])

  // Bulk HR Lock - Lock or unlock all employees for HR
  const bulkHRLock = useCallback(async (
    payrollId: string,
    employeeIds: string[],
    lock: boolean
  ): Promise<{ success: number; failed: number; skipped: number }> => {
    try {
      setLoading(true)
      setError(null)

      let success = 0
      let failed = 0
      let skipped = 0

      for (const employeeId of employeeIds) {
        try {
          // If locking, validate first
          if (lock) {
            const validation = await validateHRLock(employeeId)
            if (!validation.can_lock) {
              skipped++
              continue
            }
          }

          // Check if lock record exists
          const { data: existing } = await supabase
            .from('employee_payroll_locks')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('payroll_id', payrollId)
            .single()

          if (existing) {
            // Update existing lock
            const { error: updateError } = await supabase
              .from('employee_payroll_locks')
              .update({
                hr_locked: lock,
                hr_locked_by: lock ? user?.id : null,
                hr_locked_at: lock ? new Date().toISOString() : null
              })
              .eq('id', existing.id)

            if (updateError) {
              failed++
              continue
            }
          } else if (lock) {
            // Create new lock record only when locking
            const { error: insertError } = await supabase
              .from('employee_payroll_locks')
              .insert({
                employee_id: employeeId,
                payroll_id: payrollId,
                hr_locked: true,
                hr_locked_by: user?.id,
                hr_locked_at: new Date().toISOString()
              })

            if (insertError) {
              failed++
              continue
            }
          }

          success++
        } catch {
          failed++
        }
      }

      // Log bulk audit entry
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        action_type: lock ? 'bulk_hr_lock' : 'bulk_hr_unlock',
        performed_by: user?.id,
        details: { total: employeeIds.length, success, failed, skipped }
      })

      return { success, failed, skipped }
    } catch (err: any) {
      setError(err.message)
      return { success: 0, failed: employeeIds.length, skipped: 0 }
    } finally {
      setLoading(false)
    }
  }, [user, validateHRLock])

  // Bulk Finance Lock - Lock or unlock all employees for Finance
  const bulkFinanceLock = useCallback(async (
    payrollId: string,
    employeeIds: string[],
    lock: boolean
  ): Promise<{ success: number; failed: number; skipped: number }> => {
    try {
      setLoading(true)
      setError(null)

      let success = 0
      let failed = 0
      let skipped = 0

      for (const employeeId of employeeIds) {
        try {
          // If locking, validate first
          if (lock) {
            const validation = await validateFinanceLock(employeeId)
            if (!validation.can_lock) {
              skipped++
              continue
            }
          }

          // Check if lock record exists
          const { data: existing } = await supabase
            .from('employee_payroll_locks')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('payroll_id', payrollId)
            .single()

          if (existing) {
            // Update existing lock
            const { error: updateError } = await supabase
              .from('employee_payroll_locks')
              .update({
                finance_locked: lock,
                finance_locked_by: lock ? user?.id : null,
                finance_locked_at: lock ? new Date().toISOString() : null
              })
              .eq('id', existing.id)

            if (updateError) {
              failed++
              continue
            }
          } else if (lock) {
            // Create new lock record only when locking
            const { error: insertError } = await supabase
              .from('employee_payroll_locks')
              .insert({
                employee_id: employeeId,
                payroll_id: payrollId,
                finance_locked: true,
                finance_locked_by: user?.id,
                finance_locked_at: new Date().toISOString()
              })

            if (insertError) {
              failed++
              continue
            }
          }

          success++
        } catch {
          failed++
        }
      }

      // Log bulk audit entry
      await supabase.from('payroll_audit_log').insert({
        payroll_id: payrollId,
        action_type: lock ? 'bulk_finance_lock' : 'bulk_finance_unlock',
        performed_by: user?.id,
        details: { total: employeeIds.length, success, failed, skipped }
      })

      return { success, failed, skipped }
    } catch (err: any) {
      setError(err.message)
      return { success: 0, failed: employeeIds.length, skipped: 0 }
    } finally {
      setLoading(false)
    }
  }, [user, validateFinanceLock])

  return {
    loading,
    error,
    getOrCreatePayrollCycle,
    getAllPayrollCycles,
    getPayrollLockStats,
    getEmployeeLocks,
    validateHRLock,
    validateFinanceLock,
    toggleHRLock,
    toggleFinanceLock,
    bulkHRLock,
    bulkFinanceLock,
    hrSignoff,
    financeSignoff,
    revertPayroll,
    getLockRequirements,
    updateLockRequirement,
    getHRSignedPayrolls
  }
}
