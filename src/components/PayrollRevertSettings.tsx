import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePayrollFinalization } from '@/hooks/usePayrollFinalization'
import type { MonthlyPayrollCycle } from '@/types/database'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function PayrollRevertSettings() {
  const [payrolls, setPayrolls] = useState<MonthlyPayrollCycle[]>([])
  const [selectedPayrollId, setSelectedPayrollId] = useState<string>('')
  const [revertReason, setRevertReason] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reverting, setReverting] = useState(false)
  
  const { getAllPayrollCycles, revertPayroll } = usePayrollFinalization()

  useEffect(() => {
    loadPayrolls()
  }, [])

  const loadPayrolls = async () => {
    setLoading(true)
    const data = await getAllPayrollCycles()
    // Only show finalized or HR-signed payrolls
    const revertablePayrolls = data.filter(p => p.status !== 'pending')
    setPayrolls(revertablePayrolls)
    setLoading(false)
  }

  const handleRevert = async () => {
    if (!selectedPayrollId || !revertReason.trim()) {
      alert('Please select a payroll and provide a reason')
      return
    }

    setReverting(true)
    try {
      const success = await revertPayroll(selectedPayrollId, revertReason)
      if (success) {
        alert('Payroll reverted successfully')
        setShowConfirmDialog(false)
        setRevertReason('')
        setSelectedPayrollId('')
        loadPayrolls()
      } else {
        alert('Failed to revert payroll')
      }
    } catch (error) {
      console.error('Error reverting payroll:', error)
      alert('An error occurred while reverting payroll')
    } finally {
      setReverting(false)
    }
  }

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
        return <Badge variant="default" className="bg-green-600">Finalized</Badge>
      case 'hr_signed':
        return <Badge variant="default" className="bg-blue-600">HR Signed</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const selectedPayroll = payrolls.find(p => p.id === selectedPayrollId)

  const payrollOptions = payrolls.map(p => ({
    value: p.id,
    label: `${getMonthName(p.month)} ${p.year} - ${p.status === 'finalized' ? 'Finalized' : 'HR Signed'}`
  }))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Revert Payroll Finalization
          </CardTitle>
          <CardDescription>
            Revert a finalized or HR-signed payroll. This action will clear all sign-offs but keep employee locks intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading payrolls...</p>
          ) : payrolls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payrolls available to revert</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="payroll-select">Select Payroll to Revert</Label>
                <Select
                  id="payroll-select"
                  value={selectedPayrollId}
                  onChange={(e) => setSelectedPayrollId(e.target.value)}
                  options={payrollOptions}
                  placeholder="Select a payroll"
                />
              </div>

              {selectedPayroll && (
                <div className="rounded-lg border p-4 space-y-2 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedPayroll.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Month/Year:</span>
                    <span className="text-sm">{getMonthName(selectedPayroll.month)} {selectedPayroll.year}</span>
                  </div>
                  {selectedPayroll.hr_signoff_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">HR Signed:</span>
                      <span className="text-sm">{new Date(selectedPayroll.hr_signoff_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedPayroll.finance_signoff_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Finance Signed:</span>
                      <span className="text-sm">{new Date(selectedPayroll.finance_signoff_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="revert-reason">Reason for Reversion</Label>
                <Textarea
                  id="revert-reason"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Explain why this payroll needs to be reverted..."
                  rows={3}
                />
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!selectedPayrollId || !revertReason.trim()}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Revert Payroll
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payroll Reversion</DialogTitle>
            <DialogDescription>
              This action will revert the payroll finalization. All sign-offs will be cleared, but employee locks will remain intact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800 font-medium">⚠️ Warning</p>
              <p className="text-sm text-amber-700 mt-1">
                This will allow modifications to a previously finalized payroll. Make sure you have proper authorization.
              </p>
            </div>

            {selectedPayroll && (
              <div className="space-y-1 text-sm">
                <p><strong>Payroll:</strong> {getMonthName(selectedPayroll.month)} {selectedPayroll.year}</p>
                <p><strong>Status:</strong> {selectedPayroll.status}</p>
                <p><strong>Reason:</strong> {revertReason}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={reverting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevert} disabled={reverting}>
              {reverting ? 'Reverting...' : 'Confirm Reversion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
