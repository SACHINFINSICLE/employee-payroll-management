import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download, Calendar, DollarSign, Users, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDateTime, getMonthName } from '@/lib/utils'
import { generateExcelReport, generatePDFReport, downloadBlob, type ReportData } from '@/lib/reportGenerator'
import type { PayrollReport, EmployeeWithPayroll } from '@/types/database'

export function Reports() {
  const { profile } = useAuth()
  const [reports, setReports] = useState<PayrollReport[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadType, setDownloadType] = useState<'excel' | 'pdf' | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const { data } = await supabase
        .from('payroll_reports')
        .select('*')
        .eq('report_type', 'snapshot')
        .eq('is_finalized', true)
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (data) setReports(data as PayrollReport[])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadExcel = async (report: PayrollReport) => {
    try {
      setDownloadingId(report.id)
      setDownloadType('excel')

      const reportData = report.report_data as EmployeeWithPayroll[]
      if (!reportData || !Array.isArray(reportData)) {
        alert('Report data is not available')
        return
      }

      const data: ReportData = {
        month: report.month,
        year: report.year,
        employees: reportData,
        totalGrossSalary: report.total_gross_salary,
        totalDeductions: report.total_deductions,
        totalAdditions: reportData.reduce((sum, emp) => sum + ((emp.payroll as any)?.addition_amount || 0), 0),
        totalNetSalary: report.total_net_salary,
        generatedBy: profile?.full_name || 'System',
      }

      const blob = generateExcelReport(data)
      downloadBlob(blob, `Payroll_${getMonthName(report.month)}_${report.year}.xlsx`)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      alert('Failed to download Excel report')
    } finally {
      setDownloadingId(null)
      setDownloadType(null)
    }
  }

  const downloadPDF = async (report: PayrollReport) => {
    try {
      setDownloadingId(report.id)
      setDownloadType('pdf')

      const reportData = report.report_data as EmployeeWithPayroll[]
      if (!reportData || !Array.isArray(reportData)) {
        alert('Report data is not available')
        return
      }

      const data: ReportData = {
        month: report.month,
        year: report.year,
        employees: reportData,
        totalGrossSalary: report.total_gross_salary,
        totalDeductions: report.total_deductions,
        totalAdditions: reportData.reduce((sum, emp) => sum + ((emp.payroll as any)?.addition_amount || 0), 0),
        totalNetSalary: report.total_net_salary,
        generatedBy: profile?.full_name || 'System',
      }

      const blob = generatePDFReport(data)
      downloadBlob(blob, `Payroll_${getMonthName(report.month)}_${report.year}.pdf`)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF report')
    } finally {
      setDownloadingId(null)
      setDownloadType(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll Reports</h1>
          <p className="text-slate-600 mt-1">Finalized monthly payroll reports</p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">About Payroll Reports</h3>
              <p className="text-sm text-blue-700 mt-1">
                Reports are automatically generated when Finance approves a monthly payroll. Each report is an immutable snapshot
                of the payroll data at the time of finalization. Download reports in Excel or PDF format with full-width formatting
                to accommodate all table content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Finalized Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-500 mt-2">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No finalized reports yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Reports will appear here automatically when Finance approves monthly payrolls
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Finalized</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{report.report_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50">
                          <Calendar className="mr-1 h-3 w-3" />
                          {getMonthName(report.month)} {report.year}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{report.total_employees}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-green-700">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(report.total_gross_salary)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-red-700">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(report.total_deductions)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-blue-700">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">{formatCurrency(report.total_net_salary)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDateTime(report.finalized_at || report.generated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadExcel(report)}
                            disabled={downloadingId === report.id}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            {downloadingId === report.id && downloadType === 'excel' ? (
                              <>
                                <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <FileSpreadsheet className="mr-1 h-4 w-4" />
                                Excel
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPDF(report)}
                            disabled={downloadingId === report.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {downloadingId === report.id && downloadType === 'pdf' ? (
                              <>
                                <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="mr-1 h-4 w-4" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
