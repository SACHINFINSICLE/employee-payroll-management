import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PageAccessSetting } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

export function usePageAccess() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<PageAccessSetting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('page_access_settings')
        .select('*')
        .order('page_order')

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      console.error('Error fetching page access settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const canAccessPage = (pageName: string): boolean => {
    if (!profile) return false

    const setting = settings.find((s) => s.page_name === pageName)
    if (!setting) return false

    // Admin can access all pages
    if (profile.role === 'admin') return true

    // Check role-specific access
    if (profile.role === 'hr') return setting.hr_can_access
    if (profile.role === 'finance') return setting.finance_can_access

    return false
  }

  const getAccessiblePages = (): PageAccessSetting[] => {
    if (!profile) return []

    // Admin can access all pages
    if (profile.role === 'admin') return settings

    // Filter pages based on role
    return settings.filter((setting) => {
      if (profile.role === 'hr') return setting.hr_can_access
      if (profile.role === 'finance') return setting.finance_can_access
      return false
    })
  }

  return {
    settings,
    loading,
    canAccessPage,
    getAccessiblePages,
  }
}
