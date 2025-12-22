export type UserRole = 'hr' | 'finance' | 'admin'
export type EmploymentStatus = 'Employed' | 'Notice Period' | 'Resigned' | 'Terminated'
export type YesNo = 'Yes' | 'No'
export type PaymentMode = 'INR Account' | 'AUD Account'
export type DeductionType = string // Dynamic values from deductions table
export type AdditionType = string // Dynamic values from additions table
export type IncentiveType = string // Dynamic values from incentives table
export type HrRemarkType = 'Nil' | 'Process Payroll' | 'On Hold' | 'Skip Salary for the month' | 'F&F Settled'
export type PaymentStatus = 'Nil' | 'Paid' | 'Not Paid'
export type PayrollStatus = 'pending' | 'hr_signed' | 'finalized'
export type PayrollAuditAction = 
  | 'payroll_created'
  | 'hr_signoff'
  | 'finance_signoff'
  | 'hr_lock'
  | 'hr_unlock'
  | 'finance_lock'
  | 'finance_unlock'
  | 'payroll_reverted'
  | 'payroll_finalized'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  employee_id: string
  employee_name: string
  employment_status: EmploymentStatus
  pf_applicable: YesNo
  esi_applicable: YesNo
  designation: string | null
  department: string | null
  joining_date: string | null
  end_date: string | null
  current_salary: number
  bank_account_number: string | null
  bank_name: string | null
  bank_ifsc_code: string | null
  payment_mode: PaymentMode
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface MonthlyPayroll {
  id: string
  employee_id: string
  month: number
  year: number
  employee_salary: number
  deduction_type: DeductionType
  deduction_amount: number
  addition_type: AdditionType
  addition_amount: number
  incentive_type: IncentiveType
  incentive_amount: number
  pf_amount: number
  esi_amount: number
  net_pay: number
  hr_remark: HrRemarkType
  hr_signoff_at: string | null
  hr_signoff_by: string | null
  salary_processing_required: YesNo
  payment_status: PaymentStatus
  finance_signoff_at: string | null
  finance_signoff_by: string | null
  remarks: string | null
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface EmployeeWithPayroll extends Employee {
  payroll?: MonthlyPayroll
}

export interface FieldAccessSetting {
  id: string
  field_name: string
  display_name: string
  hr_can_edit: boolean
  finance_can_edit: boolean
  hr_can_view: boolean
  finance_can_view: boolean
  is_visible: boolean
  field_order: number
  created_at: string
  updated_at: string
}

export interface PageAccessSetting {
  id: string
  page_name: string
  display_name: string
  page_route: string
  hr_can_access: boolean
  finance_can_access: boolean
  page_order: number
  created_at: string
  updated_at: string
}

export interface DropdownOption {
  id: string
  field_name: string
  option_value: string
  option_label: string
  is_active: boolean
  display_order: number
  created_at: string
}

export interface PayrollReport {
  id: string
  month: number
  year: number
  report_name: string
  report_type: string
  total_employees: number
  total_gross_salary: number
  total_deductions: number
  total_net_salary: number
  generated_by: string | null
  generated_at: string
  is_finalized: boolean
  finalized_at: string | null
  finance_approved_by: string | null
  report_data: unknown
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  old_data: unknown
  new_data: unknown
  changed_by: string | null
  changed_at: string
}

export interface DashboardStats {
  total_employees: number
  pending_hr_signoff: number
  pending_finance_signoff: number
  total_payroll: number
  paid_count: number
  not_paid_count: number
}

export interface PayrollSignOff {
  id: string
  month: number
  year: number
  hr_signoff_at: string | null
  hr_signoff_by: string | null
  finance_signoff_at: string | null
  finance_signoff_by: string | null
  remarks: string | null
  is_complete: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Designation {
  id: string
  name: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Deduction {
  id: string
  name: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Addition {
  id: string
  name: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface Incentive {
  id: string
  name: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface MonthlyPayrollCycle {
  id: string
  month: number
  year: number
  status: PayrollStatus
  hr_signoff_by: string | null
  hr_signoff_at: string | null
  finance_signoff_by: string | null
  finance_signoff_at: string | null
  reverted_by: string | null
  reverted_at: string | null
  reversion_reason: string | null
  created_at: string
  updated_at: string
}

export interface EmployeePayrollLock {
  id: string
  employee_id: string
  payroll_id: string
  hr_locked: boolean
  hr_locked_by: string | null
  hr_locked_at: string | null
  finance_locked: boolean
  finance_locked_by: string | null
  finance_locked_at: string | null
  created_at: string
  updated_at: string
}

export interface PayrollLockRequirement {
  id: string
  field_name: string
  required_for_hr_lock: boolean
  required_for_finance_lock: boolean
  display_name: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PayrollAuditLog {
  id: string
  payroll_id: string | null
  employee_id: string | null
  action_type: PayrollAuditAction
  performed_by: string | null
  performed_at: string
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
}

export interface PayrollLockStats {
  total_employees: number
  hr_locked_count: number
  finance_locked_count: number
  can_hr_signoff: boolean
  can_finance_signoff: boolean
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>
      }
      monthly_payroll: {
        Row: MonthlyPayroll
        Insert: Omit<MonthlyPayroll, 'id' | 'net_pay' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MonthlyPayroll, 'id' | 'net_pay' | 'created_at' | 'updated_at'>>
      }
      field_access_settings: {
        Row: FieldAccessSetting
        Insert: Omit<FieldAccessSetting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FieldAccessSetting, 'id' | 'created_at' | 'updated_at'>>
      }
      page_access_settings: {
        Row: PageAccessSetting
        Insert: Omit<PageAccessSetting, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PageAccessSetting, 'id' | 'created_at' | 'updated_at'>>
      }
      dropdown_options: {
        Row: DropdownOption
        Insert: Omit<DropdownOption, 'id' | 'created_at'>
        Update: Partial<Omit<DropdownOption, 'id' | 'created_at'>>
      }
      payroll_reports: {
        Row: PayrollReport
        Insert: Omit<PayrollReport, 'id' | 'generated_at'>
        Update: Partial<Omit<PayrollReport, 'id' | 'generated_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'changed_at'>
        Update: never
      }
      payroll_signoffs: {
        Row: PayrollSignOff
        Insert: Omit<PayrollSignOff, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PayrollSignOff, 'id' | 'month' | 'year' | 'created_at' | 'updated_at'>>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at'>>
      }
      designations: {
        Row: Designation
        Insert: Omit<Designation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Designation, 'id' | 'created_at' | 'updated_at'>>
      }
      deductions: {
        Row: Deduction
        Insert: Omit<Deduction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Deduction, 'id' | 'created_at' | 'updated_at'>>
      }
      additions: {
        Row: Addition
        Insert: Omit<Addition, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Addition, 'id' | 'created_at' | 'updated_at'>>
      }
      incentives: {
        Row: Incentive
        Insert: Omit<Incentive, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Incentive, 'id' | 'created_at' | 'updated_at'>>
      }
      monthly_payrolls: {
        Row: MonthlyPayrollCycle
        Insert: Omit<MonthlyPayrollCycle, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MonthlyPayrollCycle, 'id' | 'created_at' | 'updated_at'>>
      }
      employee_payroll_locks: {
        Row: EmployeePayrollLock
        Insert: Omit<EmployeePayrollLock, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EmployeePayrollLock, 'id' | 'created_at' | 'updated_at'>>
      }
      payroll_lock_requirements: {
        Row: PayrollLockRequirement
        Insert: Omit<PayrollLockRequirement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PayrollLockRequirement, 'id' | 'created_at' | 'updated_at'>>
      }
      payroll_audit_log: {
        Row: PayrollAuditLog
        Insert: Omit<PayrollAuditLog, 'id' | 'performed_at'>
        Update: never
      }
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: UserRole
      }
      can_edit_field: {
        Args: { field: string; user_id: string }
        Returns: boolean
      }
      initialize_monthly_payroll: {
        Args: { p_month: number; p_year: number }
        Returns: number
      }
      get_dashboard_stats: {
        Args: { p_month: number; p_year: number }
        Returns: DashboardStats
      }
      get_payroll_for_month: {
        Args: { p_month: number; p_year: number }
        Returns: string
      }
      can_hr_signoff: {
        Args: { p_payroll_id: string }
        Returns: boolean
      }
      can_finance_signoff: {
        Args: { p_payroll_id: string }
        Returns: boolean
      }
      get_payroll_lock_stats: {
        Args: { p_payroll_id: string }
        Returns: PayrollLockStats
      }
    }
  }
}
