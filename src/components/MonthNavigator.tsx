import { ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getMonthName } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface MonthNavigatorProps {
  month: number
  year: number
  onMonthChange: (month: number, year: number) => void
  onGoToActive?: () => void
  canGoPrev?: boolean
  canGoNext?: boolean
  isViewingFinalized?: boolean
  isViewingActive?: boolean
  activeMonth?: number
  activeYear?: number
}

export function MonthNavigator({ 
  month, 
  year, 
  onMonthChange,
  onGoToActive,
  canGoPrev = true,
  canGoNext = true,
  isViewingFinalized = false,
  isViewingActive = true,
  activeMonth,
  activeYear
}: MonthNavigatorProps) {
  
  const handlePrevMonth = () => {
    if (!canGoPrev) return
    
    let newMonth = month - 1
    let newYear = year
    
    if (newMonth < 1) {
      newMonth = 12
      newYear = year - 1
    }
    
    onMonthChange(newMonth, newYear)
  }
  
  const handleNextMonth = () => {
    if (!canGoNext) return
    
    let newMonth = month + 1
    let newYear = year
    
    if (newMonth > 12) {
      newMonth = 1
      newYear = year + 1
    }
    
    onMonthChange(newMonth, newYear)
  }
  
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              className="h-8 w-8 hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canGoPrev ? 'Previous month' : 'No previous payroll'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="flex flex-col items-center min-w-[120px] select-none">
        <span className="text-xs text-slate-500 font-medium leading-tight">
          {year}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-slate-800 leading-tight">
            {getMonthName(month)}
          </span>
          {isViewingFinalized && (
            <Badge variant="secondary" className="text-xs py-0 px-1.5 bg-green-100 text-green-700">
              Finalized
            </Badge>
          )}
          {isViewingActive && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 border-blue-300 text-blue-600">
              Active
            </Badge>
          )}
        </div>
      </div>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className="h-8 w-8 hover:bg-slate-100"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {canGoNext 
              ? 'Next month' 
              : isViewingActive 
                ? 'Finalize this payroll to unlock next month' 
                : 'No next payroll available'}
          </TooltipContent>
        </Tooltip>
        
        {/* Go to Active Month button - only show when not viewing active */}
        {!isViewingActive && onGoToActive && activeMonth && activeYear && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToActive}
                className="ml-2 h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                <Home className="h-3 w-3 mr-1" />
                {getMonthName(activeMonth)} {activeYear}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Go to current active payroll
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  )
}
