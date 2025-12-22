import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { usePageAccess } from '@/hooks/usePageAccess'
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

// Icon mapping for pages
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'dashboard': LayoutDashboard,
  'employees': Users,
  'reports': FileText,
  'settings': Settings,
}

export function Sidebar() {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { getAccessiblePages } = usePageAccess()
  const [isCollapsed, setIsCollapsed] = useState(true)

  // Get navigation items from database based on user role
  const visibleNavigation = getAccessiblePages().map(page => ({
    name: page.display_name,
    href: page.page_route,
    icon: iconMap[page.page_name] || LayoutDashboard,
  }))

  return (
    <div className={cn(
      "flex h-screen flex-col bg-slate-900 text-white transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-700 justify-center px-3">
        <Building2 className="h-8 w-8 text-blue-400 flex-shrink-0" />
        {!isCollapsed && <span className="text-lg font-semibold">Payroll Portal</span>}
      </div>

      {/* Toggle Button */}
      <div className="px-3 py-2 border-b border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="px-6 py-4 border-b border-slate-700">
          <p className="text-sm text-slate-400">Logged in as</p>
          <p className="font-medium truncate">{profile?.full_name}</p>
          <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400 mt-1 capitalize">
            {profile?.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNavigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && item.name}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-slate-700">
        <Button
          variant="ghost"
          className={cn(
            "w-full text-slate-400 hover:text-white hover:bg-slate-800",
            isCollapsed ? "justify-center px-3" : "justify-start"
          )}
          onClick={signOut}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  )
}
