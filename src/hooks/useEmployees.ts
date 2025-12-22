import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Employee, MonthlyPayroll, EmployeeWithPayroll, Department, Designation, Deduction, Addition, Incentive } from '@/types/database'

interface UseEmployeesOptions {
  month: number
  year: number
}

interface Filters {
  search: string
  employmentStatus: string
  pfApplicable: string
  esiApplicable: string
  designation: string
  department: string
  paymentMode: string
  deductionType: string
  additionType: string
  incentiveType: string
  hrRemark: string
  salaryProcessingRequired: string
  paymentStatus: string
  isActive: string // 'active', 'deactivated', or '' for all
}

export function useEmployees({ month, year }: UseEmployeesOptions) {
  const [employees, setEmployees] = useState<EmployeeWithPayroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    employmentStatus: '',
    pfApplicable: '',
    esiApplicable: '',
    designation: '',
    department: '',
    paymentMode: '',
    deductionType: '',
    additionType: '',
    incentiveType: '',
    hrRemark: '',
    salaryProcessingRequired: '',
    paymentStatus: '',
    isActive: 'active', // Default to showing only active employees
  })

  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [additions, setAdditions] = useState<Addition[]>([])
  const [incentives, setIncentives] = useState<Incentive[]>([])

  // Fetch reference data once on mount (departments, designations, etc.)
  const fetchReferenceData = useCallback(async () => {
    try {
      const [deptRes, desigRes, dedRes, addRes, incRes] = await Promise.all([
        supabase.from('departments').select('*').eq('is_active', true).order('display_order'),
        supabase.from('designations').select('*').eq('is_active', true).order('display_order'),
        supabase.from('deductions').select('*').eq('is_active', true).order('display_order'),
        supabase.from('additions').select('*').eq('is_active', true).order('display_order'),
        supabase.from('incentives').select('*').eq('is_active', true).order('display_order'),
      ])

      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (desigRes.data) setDesignations(desigRes.data as Designation[])
      if (dedRes.data) setDeductions(dedRes.data as Deduction[])
      if (addRes.data) setAdditions(addRes.data as Addition[])
      if (incRes.data) setIncentives(incRes.data as Incentive[])
    } catch (err) {
      console.error('Error fetching reference data:', err)
    }
  }, [])

  // Debounce search filter to avoid excessive API calls
  const [debouncedFilters, setDebouncedFilters] = useState(filters)

  useEffect(() => {
    // For search, debounce 300ms; for other filters, apply immediately
    // Note: We check all fields to ensure updates to other filters are immediate
    if (filters.search !== debouncedFilters.search) {
      const timer = setTimeout(() => {
        setDebouncedFilters(filters)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setDebouncedFilters(filters)
    }
  }, [filters])

  // Fetch employees and payroll data (runs on filter changes)
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Fetching employees with filters:', debouncedFilters)

      // Fetch employees with filters
      let employeeQuery = supabase.from('employees').select('*')

      // Apply filters using DEBOUNCED values
      if (debouncedFilters.employmentStatus) {
        employeeQuery = employeeQuery.eq('employment_status', debouncedFilters.employmentStatus)
      }
      if (debouncedFilters.pfApplicable) {
        employeeQuery = employeeQuery.eq('pf_applicable', debouncedFilters.pfApplicable)
      }
      if (debouncedFilters.esiApplicable) {
        employeeQuery = employeeQuery.eq('esi_applicable', debouncedFilters.esiApplicable)
      }
      if (debouncedFilters.designation) {
        employeeQuery = employeeQuery.eq('designation', debouncedFilters.designation)
      }
      if (debouncedFilters.department) {
        employeeQuery = employeeQuery.eq('department', debouncedFilters.department)
      }
      if (debouncedFilters.paymentMode) {
        employeeQuery = employeeQuery.eq('payment_mode', debouncedFilters.paymentMode)
      }
      // Apply isActive filter
      if (debouncedFilters.isActive === 'active') {
        employeeQuery = employeeQuery.eq('is_active', true)
      } else if (debouncedFilters.isActive === 'deactivated') {
        employeeQuery = employeeQuery.eq('is_active', false)
      }

      // Fetch employees and payroll in parallel
      const [employeesResult, payrollResult] = await Promise.all([
        employeeQuery.order('employee_id'),
        supabase
          .from('monthly_payroll')
          .select('*')
          .eq('month', month)
          .eq('year', year)
      ])

      if (employeesResult.error) throw employeesResult.error
      if (payrollResult.error) throw payrollResult.error

      const employeesData = employeesResult.data
      const payrollData = payrollResult.data

      // Create a map of payroll data by employee_id
      const payrollMap = new Map<string, MonthlyPayroll>()
      payrollData?.forEach((p) => {
        payrollMap.set(p.employee_id, p)
      })

      // Combine employees with their payroll data
      let combined: EmployeeWithPayroll[] = (employeesData || []).map((emp: Employee) => ({
        ...emp,
        payroll: payrollMap.get(emp.id),
      }))

      // Apply search filter
      if (debouncedFilters.search) {
        const searchLower = debouncedFilters.search.toLowerCase()
        combined = combined.filter(
          (emp) =>
            emp.employee_id.toLowerCase().includes(searchLower) ||
            emp.employee_name.toLowerCase().includes(searchLower)
        )
      }

      // Apply payroll-specific filters
      if (debouncedFilters.deductionType) {
        combined = combined.filter((emp) => emp.payroll?.deduction_type === debouncedFilters.deductionType)
      }
      if (debouncedFilters.additionType) {
        combined = combined.filter((emp) => emp.payroll?.addition_type === debouncedFilters.additionType)
      }
      if (debouncedFilters.incentiveType) {
        combined = combined.filter((emp) => emp.payroll?.incentive_type === debouncedFilters.incentiveType)
      }
      if (debouncedFilters.hrRemark) {
        combined = combined.filter((emp) => emp.payroll?.hr_remark === debouncedFilters.hrRemark)
      }
      if (debouncedFilters.salaryProcessingRequired) {
        combined = combined.filter(
          (emp) => emp.payroll?.salary_processing_required === debouncedFilters.salaryProcessingRequired
        )
      }
      if (debouncedFilters.paymentStatus) {
        combined = combined.filter((emp) => emp.payroll?.payment_status === debouncedFilters.paymentStatus)
      }

      setEmployees(combined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [month, year, debouncedFilters])

  // Fetch reference data once on mount
  useEffect(() => {
    fetchReferenceData()
  }, [fetchReferenceData])

  // Fetch employees when debounced filters change
  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      employmentStatus: '',
      pfApplicable: '',
      esiApplicable: '',
      designation: '',
      department: '',
      paymentMode: '',
      deductionType: '',
      additionType: '',
      incentiveType: '',
      hrRemark: '',
      salaryProcessingRequired: '',
      paymentStatus: '',
      isActive: 'active', // Reset to showing only active employees
    })
  }

  return {
    employees,
    loading,
    error,
    filters,
    updateFilter,
    clearFilters,
    refetch: fetchEmployees,
    designations,
    departments,
    deductions,
    additions,
    incentives,
  }
}
