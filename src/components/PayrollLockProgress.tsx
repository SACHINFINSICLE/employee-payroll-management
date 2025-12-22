import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PayrollLockStats } from '@/types/database'

interface PayrollLockProgressProps {
  stats: PayrollLockStats | null
  type: 'hr' | 'finance'
}

export function PayrollLockProgress({ stats, type }: PayrollLockProgressProps) {
  if (!stats) {
    return null
  }

  const lockedCount = type === 'hr' ? stats.hr_locked_count : stats.finance_locked_count
  const totalCount = stats.total_employees
  const percentage = totalCount > 0 ? Math.round((lockedCount / totalCount) * 100) : 0
  const isComplete = lockedCount === totalCount && totalCount > 0

  const colorClass = type === 'hr' ? 'bg-blue-500' : 'bg-green-500'
  const badgeVariant = isComplete ? 'default' : 'secondary'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Lock className={`h-4 w-4 ${type === 'hr' ? 'text-blue-600' : 'text-green-600'}`} />
        <span className="text-sm font-medium">
          {type === 'hr' ? 'HR' : 'Finance'} Locks:
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <Badge variant={badgeVariant} className="min-w-[60px] justify-center">
          {lockedCount}/{totalCount}
        </Badge>
        
        {isComplete && (
          <Badge variant="default" className="bg-green-600">
            ✓ Ready
          </Badge>
        )}
      </div>
    </div>
  )
}
