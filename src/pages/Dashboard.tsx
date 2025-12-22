import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Clock,
  CheckCircle,
  DollarSign,
  ArrowRight,
  FileText,
  Settings,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, getMonthName, getCurrentMonth, getCurrentYear } from '@/lib/utils'
import type { DashboardStats } from '@/types/database'

export function Dashboard() {
  const { profile, isHR, isFinance } = useAuth()
  const month = getCurrentMonth()
  const year = getCurrentYear()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [month, year])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_month: month,
        p_year: year,
      })

      if (error) throw error
      setStats(data as DashboardStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back, {profile?.full_name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Employees
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : stats?.total_employees || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Payroll
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : formatCurrency(stats?.total_payroll || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              For {getMonthName(month)} {year}
            </p>
          </CardContent>
        </Card>

        {isHR && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pending HR Sign-off
              </CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? '...' : stats?.pending_hr_signoff || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Awaiting your review</p>
            </CardContent>
          </Card>
        )}

        {isFinance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pending Finance Review
              </CardTitle>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? '...' : stats?.pending_finance_signoff || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Ready for approval</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Payment Status
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? '...' : `${stats?.paid_count || 0}/${(stats?.paid_count || 0) + (stats?.not_paid_count || 0)}`}
            </div>
            <p className="text-xs text-slate-500 mt-1">Salaries paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Employee Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">
              View and manage employee details, update payroll information, and process sign-offs.
            </p>
            <Link to="/employees">
              <Button className="w-full">
                Go to Employees
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">
              View historical payroll reports, download PDFs, and analyze payroll data.
            </p>
            <Link to="/reports">
              <Button variant="outline" className="w-full">
                View Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-500" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-sm mb-4">
              Configure field access permissions, customize dropdowns, and manage system settings.
            </p>
            <Link to="/settings">
              <Button variant="outline" className="w-full">
                Open Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Role-specific Information */}
      <Card>
        <CardHeader>
          <CardTitle>Your Role: {profile?.role?.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          {isHR && (
            <div className="space-y-2 text-sm text-slate-600">
              <p>• Upload and manage employee data</p>
              <p>• Edit assigned fields for payroll processing</p>
              <p>• Sign off on payroll data before Finance review</p>
              <p>• Add new employees to the system</p>
            </div>
          )}
          {isFinance && !isHR && (
            <div className="space-y-2 text-sm text-slate-600">
              <p>• Review payroll data after HR sign-off</p>
              <p>• Edit assigned fields (PF, ESI, Payment Status)</p>
              <p>• Approve or reject payroll with remarks</p>
              <p>• Generate final payroll reports</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
