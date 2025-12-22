import { Lock, Unlock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PayrollLockIconProps {
  isLocked: boolean
  lockType: 'hr' | 'finance'
  onToggle: () => void
  disabled?: boolean
  lockedBy?: string | null
  lockedAt?: string | null
  canLock?: boolean
  missingFields?: string[]
}

export function PayrollLockIcon({
  isLocked,
  lockType,
  onToggle,
  disabled = false,
  lockedBy,
  lockedAt,
  canLock = true,
  missingFields = []
}: PayrollLockIconProps) {
  const lockColor = lockType === 'hr' ? 'text-blue-600' : 'text-green-600'
  const unlockColor = lockType === 'hr' ? 'text-gray-400' : 'text-gray-400'
  const warningColor = 'text-amber-500'
  
  const showWarning = !isLocked && !canLock && missingFields.length > 0

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={disabled || (!isLocked && !canLock)}
            className="h-8 w-8 p-0 relative"
          >
            {isLocked ? (
              <Lock className={`h-4 w-4 ${lockColor}`} />
            ) : showWarning ? (
              <div className="relative">
                <Unlock className={`h-4 w-4 ${unlockColor}`} />
                <AlertCircle className={`h-3 w-3 ${warningColor} absolute -top-1 -right-1`} />
              </div>
            ) : (
              <Unlock className={`h-4 w-4 ${unlockColor}`} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className={`max-w-xs ${showWarning ? 'bg-amber-50 border-amber-200' : ''}`}
        >
          {isLocked ? (
            <p>
              <span className="font-semibold text-green-600">✓ Locked by {lockType.toUpperCase()}</span>
              {lockedBy && <span className="block text-xs text-gray-500">By: {lockedBy}</span>}
              {lockedAt && <span className="block text-xs text-gray-500">At: {new Date(lockedAt).toLocaleString()}</span>}
            </p>
          ) : showWarning ? (
            <div className="text-amber-700">
              <p className="font-semibold mb-1">⚠️ Cannot lock - Missing information:</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>Click to lock for {lockType.toUpperCase()}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
