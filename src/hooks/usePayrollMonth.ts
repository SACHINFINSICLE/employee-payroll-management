import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { MonthlyPayrollCycle } from '@/types/database'

// Company start date - hardcoded to October 2025
const COMPANY_START_MONTH = 10 // October
const COMPANY_START_YEAR = 2025

// PayrollMonth interface for potential future use
// interface PayrollMonth {
//   month: number
//   year: number
//   status: 'pending' | 'hr_signed' | 'finalized'
//   isFinalized: boolean
//   isCurrent: boolean // Is this the active/current payroll month
// }

interface UsePayrollMonthReturn {
  // Current selected month/year for viewing
  selectedMonth: number
  selectedYear: number
  
  // The active payroll month (latest non-finalized)
  activeMonth: number
  activeYear: number
  
  // All payroll cycles
  payrollCycles: MonthlyPayrollCycle[]
  
  // Navigation
  canGoNext: boolean
  canGoPrev: boolean
  goToNextMonth: () => void
  goToPrevMonth: () => void
  goToMonth: (month: number, year: number) => void
  goToActiveMonth: () => void
  
  // Status helpers
  isViewingFinalized: boolean
  isViewingActive: boolean
  selectedPayrollStatus: 'pending' | 'hr_signed' | 'finalized'
  
  // Loading state
  loading: boolean
  
  // Refresh
  refresh: () => Promise<void>
}

export function usePayrollMonth(): UsePayrollMonthReturn {
  const [payrollCycles, setPayrollCycles] = useState<MonthlyPayrollCycle[]>([])
  const [selectedMonth, setSelectedMonth] = useState(COMPANY_START_MONTH)
  const [selectedYear, setSelectedYear] = useState(COMPANY_START_YEAR)
  const [loading, setLoading] = useState(true)

  // Load all payroll cycles
  const loadPayrollCycles = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('monthly_payrolls')
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (error) throw error
      setPayrollCycles(data || [])
    } catch (err) {
      console.error('Error loading payroll cycles:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPayrollCycles()
  }, [loadPayrollCycles])

  // Determine the active payroll month (latest non-finalized, or next month after last finalized)
  const { activeMonth, activeYear } = useMemo(() => {
    if (payrollCycles.length === 0) {
      // No payroll cycles exist yet, start with October 2025
      return { activeMonth: COMPANY_START_MONTH, activeYear: COMPANY_START_YEAR }
    }

    // Find the last finalized payroll
    const finalizedPayrolls = payrollCycles.filter(p => 
      p.status === 'finalized' || p.finance_signoff_at
    )

    if (finalizedPayrolls.length === 0) {
      // No finalized payrolls, active is October 2025
      return { activeMonth: COMPANY_START_MONTH, activeYear: COMPANY_START_YEAR }
    }

    // Get the last finalized payroll (sorted ascending, so last is most recent)
    const lastFinalized = finalizedPayrolls[finalizedPayrolls.length - 1]
    
    // Active month is the month AFTER the last finalized
    let nextMonth = lastFinalized.month + 1
    let nextYear = lastFinalized.year
    
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }

    return { activeMonth: nextMonth, activeYear: nextYear }
  }, [payrollCycles])

  // Set initial selected month to active month once loaded
  useEffect(() => {
    if (!loading && payrollCycles.length >= 0) {
      setSelectedMonth(activeMonth)
      setSelectedYear(activeYear)
    }
  }, [loading, activeMonth, activeYear])

  // Get status of selected month
  const selectedPayrollStatus = useMemo((): 'pending' | 'hr_signed' | 'finalized' => {
    const payroll = payrollCycles.find(
      p => p.month === selectedMonth && p.year === selectedYear
    )
    
    if (!payroll) return 'pending'
    
    // Check timestamps for more reliable status
    if (payroll.finance_signoff_at) return 'finalized'
    if (payroll.hr_signoff_at) return 'hr_signed'
    return payroll.status as 'pending' | 'hr_signed' | 'finalized'
  }, [payrollCycles, selectedMonth, selectedYear])

  // Check if viewing a finalized month
  const isViewingFinalized = selectedPayrollStatus === 'finalized'
  
  // Check if viewing the active (current) month
  const isViewingActive = selectedMonth === activeMonth && selectedYear === activeYear

  // Navigation: Can go to previous month?
  const canGoPrev = useMemo(() => {
    // Can't go before company start
    if (selectedYear < COMPANY_START_YEAR) return false
    if (selectedYear === COMPANY_START_YEAR && selectedMonth <= COMPANY_START_MONTH) return false
    return true
  }, [selectedMonth, selectedYear])

  // Navigation: Can go to next month?
  const canGoNext = useMemo(() => {
    // Can only go to next month if:
    // 1. We're viewing a finalized month (can go to next finalized or active)
    // 2. We're not already at the active month
    
    if (selectedMonth === activeMonth && selectedYear === activeYear) {
      // Already at active month, can't go further
      return false
    }
    
    // Check if the next month exists (either finalized or is the active month)
    let nextMonth = selectedMonth + 1
    let nextYear = selectedYear
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    
    // Can go to next if it's finalized or if it's the active month
    const nextPayroll = payrollCycles.find(
      p => p.month === nextMonth && p.year === nextYear
    )
    
    // Allow navigation to next if:
    // - Next month is finalized
    // - Next month is the active month
    const isNextActive = nextMonth === activeMonth && nextYear === activeYear
    const isNextFinalized = !!(nextPayroll && (nextPayroll.finance_signoff_at || nextPayroll.status === 'finalized'))
    
    return isNextActive || isNextFinalized
  }, [selectedMonth, selectedYear, activeMonth, activeYear, payrollCycles])

  const goToNextMonth = useCallback(() => {
    if (!canGoNext) return
    
    let newMonth = selectedMonth + 1
    let newYear = selectedYear
    
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
    
    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }, [canGoNext, selectedMonth, selectedYear])

  const goToPrevMonth = useCallback(() => {
    if (!canGoPrev) return
    
    let newMonth = selectedMonth - 1
    let newYear = selectedYear
    
    if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }
    
    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }, [canGoPrev, selectedMonth, selectedYear])

  const goToMonth = useCallback((month: number, year: number) => {
    // Validate the month is accessible
    if (year < COMPANY_START_YEAR) return
    if (year === COMPANY_START_YEAR && month < COMPANY_START_MONTH) return
    
    // Check if this month is accessible (finalized or active)
    const isActive = month === activeMonth && year === activeYear
    const payroll = payrollCycles.find(p => p.month === month && p.year === year)
    const isFinalized = payroll && (payroll.finance_signoff_at || payroll.status === 'finalized')
    
    if (isActive || isFinalized) {
      setSelectedMonth(month)
      setSelectedYear(year)
    }
  }, [activeMonth, activeYear, payrollCycles])

  const goToActiveMonth = useCallback(() => {
    setSelectedMonth(activeMonth)
    setSelectedYear(activeYear)
  }, [activeMonth, activeYear])

  const refresh = useCallback(async () => {
    await loadPayrollCycles()
  }, [loadPayrollCycles])

  return {
    selectedMonth,
    selectedYear,
    activeMonth,
    activeYear,
    payrollCycles,
    canGoNext,
    canGoPrev,
    goToNextMonth,
    goToPrevMonth,
    goToMonth,
    goToActiveMonth,
    isViewingFinalized,
    isViewingActive,
    selectedPayrollStatus,
    loading,
    refresh
  }
}

// Export constants for use elsewhere
export const PAYROLL_START_MONTH = COMPANY_START_MONTH
export const PAYROLL_START_YEAR = COMPANY_START_YEAR
