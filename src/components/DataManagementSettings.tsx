import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Trash2, AlertTriangle, RefreshCw, Users, Search } from 'lucide-react'

interface Employee {
  id: string
  employee_id: string
  employee_name: string
  department: string | null
  designation: string | null
  is_active: boolean
}

export function DataManagementSettings() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Delete employee dialog
  const [showDeleteEmployee, setShowDeleteEmployee] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // Reset application dialog - two-step confirmation
  const [showResetWarning1, setShowResetWarning1] = useState(false)
  const [showResetWarning2, setShowResetWarning2] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('employee_name')

      console.log('Employees fetch result:', { data, error })
      
      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2))
        throw error
      }
      
      // Map the data to extract needed fields
      const mappedEmployees = (data || []).map(emp => ({
        id: emp.id,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        department: emp.department,
        designation: emp.designation,
        is_active: emp.is_active ?? true
      }))
      
      setEmployees(mappedEmployees)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete || deleteConfirmText !== employeeToDelete.employee_id) return

    try {
      setDeleting(employeeToDelete.id)
      
      // Delete related payroll data first
      await supabase.from('monthly_payroll').delete().eq('employee_id', employeeToDelete.id)
      
      // Delete the employee
      const { error } = await supabase.from('employees').delete().eq('id', employeeToDelete.id)
      
      if (error) throw error
      
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id))
      setShowDeleteEmployee(false)
      setEmployeeToDelete(null)
      setDeleteConfirmText('')
      alert(`Employee ${employeeToDelete.employee_name} has been permanently deleted.`)
    } catch (error) {
      console.error('Error deleting employee:', error)
      alert('Failed to delete employee. They may have related records that need to be removed first.')
    } finally {
      setDeleting(null)
    }
  }

  const openDeleteDialog = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteConfirmText('')
    setShowDeleteEmployee(true)
  }

  const handleResetApplication = async () => {
    if (resetConfirmText !== 'RESET ALL DATA') return

    try {
      setResetting(true)
      
      // Delete in order to respect foreign key constraints
      // Using .gte('id', '') to match all UUID records
      
      // 1. Delete all monthly payroll records
      const { error: payrollError, count: payrollCount } = await supabase
        .from('monthly_payroll')
        .delete({ count: 'exact' })
        .gte('id', '00000000-0000-0000-0000-000000000000')
      console.log('Deleted monthly_payroll:', payrollCount, payrollError)
      if (payrollError) console.error('Error deleting payroll:', payrollError)
      
      // 2. Delete all payroll signoffs
      const { error: signoffError, count: signoffCount } = await supabase
        .from('payroll_signoffs')
        .delete({ count: 'exact' })
        .gte('id', '00000000-0000-0000-0000-000000000000')
      console.log('Deleted payroll_signoffs:', signoffCount, signoffError)
      if (signoffError) console.error('Error deleting signoffs:', signoffError)
      
      // 3. Delete all generated reports - need to fetch IDs first due to RLS
      const { data: reportIds } = await supabase.from('payroll_reports').select('id')
      let reportsCount = 0
      let reportsError = null
      if (reportIds && reportIds.length > 0) {
        const ids = reportIds.map(r => r.id)
        const result = await supabase
          .from('payroll_reports')
          .delete({ count: 'exact' })
          .in('id', ids)
        reportsCount = result.count || 0
        reportsError = result.error
      }
      console.log('Deleted payroll_reports:', reportsCount, reportsError)
      if (reportsError) console.error('Error deleting reports:', reportsError)
      
      // 4. Delete all employees
      const { error: employeesError, count: employeesCount } = await supabase
        .from('employees')
        .delete({ count: 'exact' })
        .gte('id', '00000000-0000-0000-0000-000000000000')
      console.log('Deleted employees:', employeesCount, employeesError)
      if (employeesError) console.error('Error deleting employees:', employeesError)
      
      // 5. Reset all monthly_payrolls to pending status and clear signoff data
      const { error: monthlyPayrollsError, count: monthlyPayrollsCount } = await supabase
        .from('monthly_payrolls')
        .update({
          status: 'pending',
          hr_signoff_by: null,
          hr_signoff_at: null,
          finance_signoff_by: null,
          finance_signoff_at: null,
          reverted_by: null,
          reverted_at: null,
          reversion_reason: null,
          updated_at: new Date().toISOString()
        }, { count: 'exact' })
        .gte('id', '00000000-0000-0000-0000-000000000000')
      console.log('Reset monthly_payrolls:', monthlyPayrollsCount, monthlyPayrollsError)
      if (monthlyPayrollsError) console.error('Error resetting monthly_payrolls:', monthlyPayrollsError)
      
      // Refresh the employee list
      await fetchEmployees()
      
      setShowResetWarning2(false)
      setResetConfirmText('')
      alert(`Application data has been reset successfully.\n\nDeleted:\n- ${payrollCount || 0} payroll records\n- ${signoffCount || 0} signoffs\n- ${reportsCount || 0} reports\n- ${employeesCount || 0} employees\n\nReset:\n- ${monthlyPayrollsCount || 0} payroll months to pending status`)
    } catch (error) {
      console.error('Error resetting application:', error)
      alert('Failed to reset application data. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  const proceedToSecondWarning = () => {
    setShowResetWarning1(false)
    setShowResetWarning2(true)
    setResetConfirmText('')
  }

  return (
    <div className="space-y-6">
      {/* Employee Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Management
          </CardTitle>
          <CardDescription>
            View and permanently delete employees from the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {searchTerm ? 'No employees match your search' : 'No employees found'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono text-sm">{employee.employee_id}</TableCell>
                      <TableCell className="font-medium">{employee.employee_name}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.designation || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          employee.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(employee)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-slate-500">
            Total: {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Reset Application */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            Irreversible actions that will permanently delete data
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-red-800">Reset Application Data</h4>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete all employees, payroll records, signoffs, and generated reports.
                  <br />
                  <strong>Settings, departments, designations, and access controls will NOT be affected.</strong>
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowResetWarning1(true)}
                className="ml-4"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Employee Confirmation Dialog */}
      <Dialog open={showDeleteEmployee} onOpenChange={setShowDeleteEmployee}>
        <DialogContent onClose={() => setShowDeleteEmployee(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Employee
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the employee and all their payroll records.
            </DialogDescription>
          </DialogHeader>
          
          {employeeToDelete && (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">You are about to delete:</p>
                <p className="font-semibold text-lg">{employeeToDelete.employee_name}</p>
                <p className="text-sm text-slate-500">ID: {employeeToDelete.employee_id}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">
                  Type <span className="font-mono bg-slate-100 px-1 rounded">{employeeToDelete.employee_id}</span> to confirm:
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter employee ID to confirm"
                  className="mt-2"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteEmployee(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={!employeeToDelete || deleteConfirmText !== employeeToDelete.employee_id || deleting === employeeToDelete?.id}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* First Warning Dialog */}
      <Dialog open={showResetWarning1} onOpenChange={setShowResetWarning1}>
        <DialogContent onClose={() => setShowResetWarning1(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Data Reset
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium mb-2">Are you sure you want to reset all application data?</p>
              <p className="text-sm text-amber-700">
                This action will permanently delete:
              </p>
              <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                <li>All employee records ({employees.length} employees)</li>
                <li>All monthly payroll data</li>
                <li>All payroll signoffs</li>
                <li>All generated reports</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>The following will NOT be affected:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-green-700 mt-2 space-y-1">
                <li>Departments and Designations</li>
                <li>Deductions, Additions, and Incentives</li>
                <li>Page and Field access settings</li>
                <li>Lock requirements configuration</li>
                <li>User accounts and roles</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetWarning1(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={proceedToSecondWarning}
            >
              I Understand, Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Second Warning Dialog - Final Confirmation */}
      <Dialog open={showResetWarning2} onOpenChange={setShowResetWarning2}>
        <DialogContent onClose={() => setShowResetWarning2(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </DialogTitle>
            <DialogDescription>
              This is your last chance to cancel. This action is IRREVERSIBLE.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
              <p className="text-red-800 font-bold text-center text-lg mb-2">
                THIS ACTION CANNOT BE UNDONE
              </p>
              <p className="text-sm text-red-700 text-center">
                All employee data, payroll records, and reports will be permanently deleted.
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">
                Type <span className="font-mono bg-red-100 px-2 py-0.5 rounded text-red-700">RESET ALL DATA</span> to confirm:
              </Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type RESET ALL DATA"
                className="mt-2 border-red-300 focus:border-red-500"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetWarning2(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetApplication}
              disabled={resetConfirmText !== 'RESET ALL DATA' || resetting}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Resetting...' : 'Reset All Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
