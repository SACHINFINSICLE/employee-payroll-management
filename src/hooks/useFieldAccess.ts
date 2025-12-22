import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { FieldAccessSetting } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

export function useFieldAccess() {
  const { profile } = useAuth()
  const [settings, setSettings] = useState<FieldAccessSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('field_access_settings')
        .select('*')
        .order('field_order')

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const canEdit = useCallback(
    (
      fieldName: string, 
      hrSignedOff: boolean = false, 
      financeSignedOff: boolean = false,
      employeeHRLocked: boolean = false,
      employeeFinanceLocked: boolean = false
    ) => {
      if (!profile) return false

      const setting = settings.find((s) => s.field_name === fieldName)
      if (!setting) return false

      // If finance has signed off globally, no one can edit
      if (financeSignedOff) return false

      // Admin can always edit (unless finance signed off)
      if (profile.role === 'admin') return true

      // HR can edit their assigned fields only if:
      // 1. They haven't signed off globally yet
      // 2. This specific employee hasn't been HR locked
      if (profile.role === 'hr') {
        return setting.hr_can_edit && !hrSignedOff && !employeeHRLocked
      }

      // Finance can edit their assigned fields only if:
      // 1. They haven't signed off globally yet
      // 2. This specific employee hasn't been Finance locked
      if (profile.role === 'finance') {
        return setting.finance_can_edit && !financeSignedOff && !employeeFinanceLocked
      }

      return false
    },
    [profile, settings]
  )
  
  const canView = useCallback(
    (fieldName: string) => {
      if (!profile) return false

      const setting = settings.find((s) => s.field_name === fieldName)
      if (!setting) return false

      // Admin can view all fields (uses legacy is_visible or new fields)
      if (profile.role === 'admin') {
        return setting.is_visible || setting.hr_can_view || setting.finance_can_view
      }

      // HR can view fields where hr_can_view is true
      if (profile.role === 'hr') {
        return setting.hr_can_view
      }

      // Finance can view fields where finance_can_view is true
      if (profile.role === 'finance') {
        return setting.finance_can_view
      }

      return false
    },
    [profile, settings]
  )

  const updateSetting = async (id: string, updates: Partial<FieldAccessSetting>) => {
    try {
      const { error } = await supabase
        .from('field_access_settings')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchSettings()
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'An error occurred' }
    }
  }

  return {
    settings,
    loading,
    error,
    canEdit,
    canView,
    updateSetting,
    refetch: fetchSettings,
  }
}
