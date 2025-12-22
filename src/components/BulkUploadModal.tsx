import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, X, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Department, Designation } from '@/types/database'

interface BulkUploadRow {
  employee_id: string
  employee_name: string
  designation: string
  department: string
  current_salary: string
  bank_account_number: string
  bank_name: string
  bank_ifsc_code: string
  errors: string[]
  isDuplicate: boolean
  existsInDb: boolean
}

interface BulkUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  existingEmployeeIds: string[]
  systemDesignations: Designation[]
  systemDepartments: Department[]
}

interface FieldMapping {
  uploadedValue: string
  mappedValue: string
}

const INITIAL_ROWS = 10
const COLUMNS = [
  { key: 'employee_id', label: 'Employee ID', required: true, width: '150px' },
  { key: 'employee_name', label: 'Name', required: true, width: '200px' },
  { key: 'designation', label: 'Designation', required: false, width: '180px' },
  { key: 'department', label: 'Department', required: false, width: '180px' },
  { key: 'current_salary', label: 'Salary', required: false, width: '120px' },
  { key: 'bank_account_number', label: 'Bank Account No.', required: false, width: '180px' },
  { key: 'bank_name', label: 'Bank Name', required: false, width: '180px' },
  { key: 'bank_ifsc_code', label: 'Bank IFSC', required: false, width: '150px' },
]

export function BulkUploadModal({ open, onClose, onSuccess, existingEmployeeIds, systemDesignations, systemDepartments }: BulkUploadModalProps) {
  const [rows, setRows] = useState<BulkUploadRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [hasErrors, setHasErrors] = useState(true)
  const [currentStep, setCurrentStep] = useState<'data-entry' | 'mapping'>(('data-entry'))
  const [designationMappings, setDesignationMappings] = useState<FieldMapping[]>([])
  const [departmentMappings, setDepartmentMappings] = useState<FieldMapping[]>([])
  const [mappingErrors, setMappingErrors] = useState(false)

  useEffect(() => {
    if (open) {
      initializeRows()
    }
  }, [open])

  // Validate mappings whenever they change
  useEffect(() => {
    if (currentStep === 'mapping') {
      const allDesignationsMapped = designationMappings.length === 0 || designationMappings.every(m => m.mappedValue !== '')
      const allDepartmentsMapped = departmentMappings.length === 0 || departmentMappings.every(m => m.mappedValue !== '')
      const hasErrors = !(allDesignationsMapped && allDepartmentsMapped)
      
      console.log('Mapping Validation:', {
        designationMappings,
        departmentMappings,
        allDesignationsMapped,
        allDepartmentsMapped,
        hasErrors
      })
      
      setMappingErrors(hasErrors)
    }
  }, [designationMappings, departmentMappings, currentStep])

  const initializeRows = () => {
    const initialRows: BulkUploadRow[] = Array.from({ length: INITIAL_ROWS }, () => ({
      employee_id: '',
      employee_name: '',
      designation: '',
      department: '',
      current_salary: '',
      bank_account_number: '',
      bank_name: '',
      bank_ifsc_code: '',
      errors: [],
      isDuplicate: false,
      existsInDb: false,
    }))
    setRows(initialRows)
    setHasErrors(true)
    setCurrentStep('data-entry')
    setDesignationMappings([])
    setDepartmentMappings([])
    setMappingErrors(false)
  }

  const validateRows = useCallback((updatedRows: BulkUploadRow[]) => {
    const employeeIdMap = new Map<string, number[]>()
    let hasAnyErrors = false

    // First pass: collect all employee IDs and their row indices
    updatedRows.forEach((row, rowIndex) => {
      if (row.employee_id.trim()) {
        const id = row.employee_id.trim().toUpperCase()
        if (!employeeIdMap.has(id)) {
          employeeIdMap.set(id, [])
        }
        employeeIdMap.get(id)!.push(rowIndex)
      }
    })

    // Second pass: validate each row
    const validatedRows = updatedRows.map((row) => {
      const errors: string[] = []
      let isDuplicate = false
      let existsInDb = false

      // Skip validation for completely empty rows
      const hasAnyData = Object.values(row).some(val => 
        typeof val === 'string' && val.trim() !== ''
      )

      if (!hasAnyData) {
        return { ...row, errors: [], isDuplicate: false, existsInDb: false }
      }

      // Check required fields
      if (!row.employee_id.trim()) {
        errors.push('Employee ID is required')
      }
      if (!row.employee_name.trim()) {
        errors.push('Name is required')
      }

      // Check for duplicates within the uploaded data
      if (row.employee_id.trim()) {
        const id = row.employee_id.trim().toUpperCase()
        const indices = employeeIdMap.get(id) || []
        if (indices.length > 1) {
          isDuplicate = true
          errors.push(`Duplicate Employee ID within uploaded data (appears in rows: ${indices.map(i => i + 1).join(', ')})`)
        }
      }

      // Check if employee ID already exists in database
      if (row.employee_id.trim() && existingEmployeeIds.includes(row.employee_id.trim().toUpperCase())) {
        existsInDb = true
        errors.push('Employee ID already exists in database')
      }

      // Validate salary if provided
      if (row.current_salary.trim() && isNaN(Number(row.current_salary))) {
        errors.push('Salary must be a valid number')
      }

      if (errors.length > 0) {
        hasAnyErrors = true
      }

      return { ...row, errors, isDuplicate, existsInDb }
    })

    setHasErrors(hasAnyErrors)
    return validatedRows
  }, [existingEmployeeIds])

  const handleCellChange = (rowIndex: number, field: keyof BulkUploadRow, value: string) => {
    const updatedRows = [...rows]
    
    // Format salary field to only allow numbers and decimal point
    if (field === 'current_salary') {
      // Remove all non-numeric characters except decimal point
      value = value.replace(/[^\d.]/g, '')
      // Ensure only one decimal point
      const parts = value.split('.')
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
      }
    }
    
    updatedRows[rowIndex] = { ...updatedRows[rowIndex], [field]: value }
    
    // Add more rows if we're editing the last row
    if (rowIndex === rows.length - 1 && value.trim() !== '') {
      const newRows = Array.from({ length: 5 }, () => ({
        employee_id: '',
        employee_name: '',
        designation: '',
        department: '',
        current_salary: '',
        bank_account_number: '',
        bank_name: '',
        bank_ifsc_code: '',
        errors: [],
        isDuplicate: false,
        existsInDb: false,
      }))
      updatedRows.push(...newRows)
    }

    const validatedRows = validateRows(updatedRows)
    setRows(validatedRows)
  }

  const handlePaste = (e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const pastedRows = pastedData.split('\n').map(row => row.split('\t'))

    const updatedRows = [...rows]
    
    // Ensure we have enough rows
    const requiredRows = startRowIndex + pastedRows.length
    while (updatedRows.length < requiredRows) {
      updatedRows.push({
        employee_id: '',
        employee_name: '',
        designation: '',
        department: '',
        current_salary: '',
        bank_account_number: '',
        bank_name: '',
        bank_ifsc_code: '',
        errors: [],
        isDuplicate: false,
        existsInDb: false,
      })
    }

    // Paste data
    pastedRows.forEach((pastedRow, rowOffset) => {
      pastedRow.forEach((cellValue, colOffset) => {
        const targetRowIndex = startRowIndex + rowOffset
        const targetColIndex = startColIndex + colOffset
        
        if (targetColIndex < COLUMNS.length && targetRowIndex < updatedRows.length) {
          const field = COLUMNS[targetColIndex].key as keyof BulkUploadRow
          let trimmedValue = cellValue.trim()
          
          // Format salary field when pasting
          if (field === 'current_salary' && trimmedValue) {
            // Remove currency symbols, commas, and other non-numeric characters except decimal
            trimmedValue = trimmedValue.replace(/[^\d.]/g, '')
            // Ensure only one decimal point
            const parts = trimmedValue.split('.')
            if (parts.length > 2) {
              trimmedValue = parts[0] + '.' + parts.slice(1).join('')
            }
          }
          
          ;(updatedRows[targetRowIndex] as any)[field] = trimmedValue
        }
      })
    })

    const validatedRows = validateRows(updatedRows)
    setRows(validatedRows)
  }

  const handleProceedToMapping = () => {
    // Get unique designations and departments from valid rows
    const validRows = rows.filter(row => {
      const hasData = row.employee_id.trim() || row.employee_name.trim()
      return hasData && row.errors.length === 0
    })

    const uniqueDesignations = Array.from(new Set(
      validRows
        .map(row => row.designation.trim())
        .filter(d => d !== '')
    ))

    const uniqueDepartments = Array.from(new Set(
      validRows
        .map(row => row.department.trim())
        .filter(d => d !== '')
    ))

    // Initialize mappings with empty values
    setDesignationMappings(
      uniqueDesignations.map(d => ({ uploadedValue: d, mappedValue: '' }))
    )
    setDepartmentMappings(
      uniqueDepartments.map(d => ({ uploadedValue: d, mappedValue: '' }))
    )

    // Check if all mappings are already valid (exact matches)
    const allDesignationsValid = uniqueDesignations.every(d => 
      systemDesignations.some(sd => sd.name === d)
    )
    const allDepartmentsValid = uniqueDepartments.every(d => 
      systemDepartments.some(sd => sd.name === d)
    )

    // If all are valid, pre-fill mappings
    if (allDesignationsValid && allDepartmentsValid) {
      setDesignationMappings(
        uniqueDesignations.map(d => ({ uploadedValue: d, mappedValue: d }))
      )
      setDepartmentMappings(
        uniqueDepartments.map(d => ({ uploadedValue: d, mappedValue: d }))
      )
      setMappingErrors(false)
    } else {
      setMappingErrors(true)
    }

    setCurrentStep('mapping')
  }

  const handleBackToDataEntry = () => {
    setCurrentStep('data-entry')
  }

  const updateDesignationMapping = (uploadedValue: string, mappedValue: string) => {
    setDesignationMappings(prev => {
      const updated = prev.map(m => m.uploadedValue === uploadedValue ? { ...m, mappedValue } : m)
      // Validate with updated state
      const allDesignationsMapped = updated.every(m => m.mappedValue !== '')
      const allDepartmentsMapped = departmentMappings.every(m => m.mappedValue !== '')
      setMappingErrors(!(allDesignationsMapped && allDepartmentsMapped))
      return updated
    })
  }

  const updateDepartmentMapping = (uploadedValue: string, mappedValue: string) => {
    setDepartmentMappings(prev => {
      const updated = prev.map(m => m.uploadedValue === uploadedValue ? { ...m, mappedValue } : m)
      // Validate with updated state
      const allDesignationsMapped = designationMappings.every(m => m.mappedValue !== '')
      const allDepartmentsMapped = updated.every(m => m.mappedValue !== '')
      setMappingErrors(!(allDesignationsMapped && allDepartmentsMapped))
      return updated
    })
  }

  const handleUpload = async () => {
    try {
      setUploading(true)

      // Filter out empty rows and rows with errors
      const validRows = rows.filter(row => {
        const hasData = row.employee_id.trim() || row.employee_name.trim()
        return hasData && row.errors.length === 0
      })

      if (validRows.length === 0) {
        alert('No valid rows to upload')
        return
      }

      // Apply mappings to designations and departments
      const employeesToInsert = validRows.map(row => {
        const uploadedDesignation = row.designation.trim()
        const uploadedDepartment = row.department.trim()
        
        // Find mapped values
        const designationMapping = designationMappings.find(m => m.uploadedValue === uploadedDesignation)
        const departmentMapping = departmentMappings.find(m => m.uploadedValue === uploadedDepartment)
        
        return {
          employee_id: row.employee_id.trim().toUpperCase(),
          employee_name: row.employee_name.trim(),
          designation: designationMapping?.mappedValue || uploadedDesignation || null,
          department: departmentMapping?.mappedValue || uploadedDepartment || null,
          current_salary: row.current_salary.trim() ? Number(row.current_salary) : 0,
          bank_account_number: row.bank_account_number.trim() || null,
          bank_name: row.bank_name.trim() || null,
          bank_ifsc_code: row.bank_ifsc_code.trim() || null,
          employment_status: 'Employed' as const,
          pf_applicable: 'No' as const,
          esi_applicable: 'No' as const,
          joining_date: new Date().toISOString().split('T')[0],
        }
      })

      // Insert employees
      const { error } = await supabase
        .from('employees')
        .insert(employeesToInsert)

      if (error) throw error

      alert(`Successfully uploaded ${validRows.length} employee(s)`)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error uploading employees:', error)
      alert('Failed to upload employees. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const getRowClassName = (row: BulkUploadRow) => {
    if (row.errors.length > 0) return 'bg-red-50 hover:bg-red-100'
    const hasData = row.employee_id.trim() || row.employee_name.trim()
    if (hasData) return 'bg-green-50 hover:bg-green-100'
    return 'hover:bg-slate-50'
  }

  const getTooltipText = (row: BulkUploadRow) => {
    if (row.errors.length > 0) {
      return row.errors.join('; ')
    }
    return ''
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Upload Employees {currentStep === 'mapping' && '- Map Fields'}
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            {currentStep === 'data-entry' 
              ? 'Paste data from Excel or enter manually. Fields marked with * are required.'
              : 'Map uploaded designations and departments to your system values.'}
          </p>
        </DialogHeader>

        {currentStep === 'data-entry' ? (
          <>
            <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-100 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} style={{ width: col.width }}>
                    {col.label}
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                  </TableHead>
                ))}
                <TableHead className="w-[60px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex} 
                  className={getRowClassName(row)}
                  title={getTooltipText(row)}
                >
                  <TableCell className="text-center text-sm text-slate-500 font-mono">
                    {rowIndex + 1}
                  </TableCell>
                  {COLUMNS.map((col, colIndex) => (
                    <TableCell key={col.key} className="p-1">
                      <Input
                        type="text"
                        inputMode={col.key === 'current_salary' ? 'decimal' : 'text'}
                        value={row[col.key as keyof BulkUploadRow] as string}
                        onChange={(e) => handleCellChange(rowIndex, col.key as keyof BulkUploadRow, e.target.value)}
                        onPaste={(e) => handlePaste(e, rowIndex, colIndex)}
                        className={`h-8 ${row.errors.length > 0 ? 'border-red-300' : ''}`}
                        placeholder={col.key === 'current_salary' ? 'Numbers only' : col.required ? 'Required' : ''}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {row.errors.length > 0 ? (
                      <div title={getTooltipText(row)}>
                        <AlertCircle className="h-5 w-5 text-red-500 mx-auto" />
                      </div>
                    ) : (row.employee_id.trim() || row.employee_name.trim()) ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <div className="flex-1 text-sm text-slate-600">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span>Error</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span>Valid</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleProceedToMapping} 
              disabled={hasErrors || uploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Proceed to Mapping
            </Button>
          </DialogFooter>
        </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-auto border rounded-lg p-4">
              <div className="space-y-6">
                {designationMappings.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Map Designations</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Uploaded Value</TableHead>
                          <TableHead>Map to System Designation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {designationMappings.map((mapping) => (
                          <TableRow key={mapping.uploadedValue}>
                            <TableCell className="font-medium">{mapping.uploadedValue}</TableCell>
                            <TableCell>
                              <Select
                                value={mapping.mappedValue}
                                onChange={(e) => updateDesignationMapping(mapping.uploadedValue, e.target.value)}
                                options={systemDesignations.filter(d => d.is_active).map(d => ({ value: d.name, label: d.name }))}
                                placeholder="Select designation..."
                                className={mapping.mappedValue === '' ? 'border-red-300' : ''}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {departmentMappings.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Map Departments</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Uploaded Value</TableHead>
                          <TableHead>Map to System Department</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departmentMappings.map((mapping) => (
                          <TableRow key={mapping.uploadedValue}>
                            <TableCell className="font-medium">{mapping.uploadedValue}</TableCell>
                            <TableCell>
                              <Select
                                value={mapping.mappedValue}
                                onChange={(e) => updateDepartmentMapping(mapping.uploadedValue, e.target.value)}
                                options={systemDepartments.filter(d => d.is_active).map(d => ({ value: d.name, label: d.name }))}
                                placeholder="Select department..."
                                className={mapping.mappedValue === '' ? 'border-red-300' : ''}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {designationMappings.length === 0 && departmentMappings.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                    <p>All designations and departments match your system values!</p>
                    <p className="text-sm">Click "Upload Employees" to proceed.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex-1 text-sm text-slate-600">
                {mappingErrors && (
                  <p className="text-red-600">Please map all fields before uploading</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleBackToDataEntry} disabled={uploading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={mappingErrors || uploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Employees'}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
