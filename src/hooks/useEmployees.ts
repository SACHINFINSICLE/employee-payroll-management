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
  })

  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [additions, setAdditions] = useState<Addition[]>([])
  const [incentives, setIncentives] = useState<Incentive[]>([])

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch departments, designations, deductions, additions, and incentives
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

      // Fetch employees
      let employeeQuery = supabase.from('employees').select('*')

      // Apply filters
      if (filters.employmentStatus) {
        employeeQuery = employeeQuery.eq('employment_status', filters.employmentStatus)
      }
      if (filters.pfApplicable) {
        employeeQuery = employeeQuery.eq('pf_applicable', filters.pfApplicable)
      }
      if (filters.esiApplicable) {
        employeeQuery = employeeQuery.eq('esi_applicable', filters.esiApplicable)
      }
      if (filters.designation) {
        employeeQuery = employeeQuery.eq('designation', filters.designation)
      }
      if (filters.department) {
        employeeQuery = employeeQuery.eq('department', filters.department)
      }
      if (filters.paymentMode) {
        employeeQuery = employeeQuery.eq('payment_mode', filters.paymentMode)
      }

      const { data: employeesData, error: employeesError } = await employeeQuery.order('employee_id')

      if (employeesError) throw employeesError

      // Fetch payroll data for the month
      const { data: payrollData, error: payrollError } = await supabase
        .from('monthly_payroll')
        .select('*')
        .eq('month', month)
        .eq('year', year)

      if (payrollError) throw payrollError

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
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        combined = combined.filter(
          (emp) =>
            emp.employee_id.toLowerCase().includes(searchLower) ||
            emp.employee_name.toLowerCase().includes(searchLower)
        )
      }

      // Apply payroll-specific filters
      if (filters.deductionType) {
        combined = combined.filter((emp) => emp.payroll?.deduction_type === filters.deductionType)
      }
      if (filters.additionType) {
        combined = combined.filter((emp) => emp.payroll?.addition_type === filters.additionType)
      }
      if (filters.incentiveType) {
        combined = combined.filter((emp) => emp.payroll?.incentive_type === filters.incentiveType)
      }
      if (filters.hrRemark) {
        combined = combined.filter((emp) => emp.payroll?.hr_remark === filters.hrRemark)
      }
      if (filters.salaryProcessingRequired) {
        combined = combined.filter(
          (emp) => emp.payroll?.salary_processing_required === filters.salaryProcessingRequired
        )
      }
      if (filters.paymentStatus) {
        combined = combined.filter((emp) => emp.payroll?.payment_status === filters.paymentStatus)
      }

      setEmployees(combined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [month, year, filters])

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
