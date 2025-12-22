import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePayrollFinalization } from '@/hooks/usePayrollFinalization'
import { AlertCircle, CheckCircle2, Calendar } from 'lucide-react'

interface HRSignoffModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  month: number
  year: number
  payrollId: string
  lockStats: {
    total_employees: number
    hr_locked_count: number
    can_hr_signoff: boolean
  } | null
}

const getMonthName = (month: number) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']
  return months[month - 1]
}

export function HRSignoffModal({ open, onClose, onSuccess, month, year, payrollId, lockStats }: HRSignoffModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { hrSignoff } = usePayrollFinalization()

  const handleSignoff = async () => {
    try {
      setLoading(true)
      setError(null)

      // Perform HR sign-off using the payroll ID passed from parent
      const success = await hrSignoff(payrollId)

      if (success) {
        onSuccess()
        onClose()
      } else {
        setError('Failed to complete HR sign-off. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign-off')
    } finally {
      setLoading(false)
    }
  }

  const canSignoff = lockStats?.can_hr_signoff && lockStats.total_employees > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>HR Payroll Sign-off</DialogTitle>
          <DialogDescription>
            Confirm HR sign-off for the current payroll month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payroll Period Display */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <span className="text-sm text-blue-600">Payroll Period</span>
                <p className="text-lg font-semibold text-blue-900">
                  {getMonthName(month)} {year}
                </p>
              </div>
            </div>
          </div>

          {/* Lock Status */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Employees Locked:</span>
              <span className="text-sm font-bold">
                {lockStats?.hr_locked_count || 0} / {lockStats?.total_employees || 0}
              </span>
            </div>
            
            {canSignoff ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>All employees are locked. Ready to sign off.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Please lock all employees before signing off.</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSignoff} 
            disabled={!canSignoff || loading}
          >
            {loading ? 'Signing off...' : 'Confirm HR Sign-off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
