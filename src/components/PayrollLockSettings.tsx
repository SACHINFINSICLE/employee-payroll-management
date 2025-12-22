import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePayrollFinalization } from '@/hooks/usePayrollFinalization'
import { supabase } from '@/lib/supabase'
import type { PayrollLockRequirement, FieldAccessSetting } from '@/types/database'
import { Save, RefreshCw, Lock, AlertCircle } from 'lucide-react'

export function PayrollLockSettings() {
  const [requirements, setRequirements] = useState<PayrollLockRequirement[]>([])
  const [fieldAccessSettings, setFieldAccessSettings] = useState<FieldAccessSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  const { getLockRequirements, updateLockRequirement } = usePayrollFinalization()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([
      loadRequirements(),
      loadFieldAccessSettings()
    ])
    setLoading(false)
  }

  const loadRequirements = async () => {
    const data = await getLockRequirements()
    setRequirements(data)
  }

  const loadFieldAccessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('field_access_settings')
        .select('*')
        .eq('is_visible', true)
        .order('field_order')

      if (error) throw error
      setFieldAccessSettings(data || [])
    } catch (error) {
      console.error('Error loading field access settings:', error)
    }
  }

  const syncWithFieldAccess = async () => {
    setSyncing(true)
    try {
      // Get all editable fields from field access settings
      const editableFields = fieldAccessSettings.filter(
        f => f.hr_can_edit || f.finance_can_edit
      )

      // Create or update lock requirements for each editable field
      for (const field of editableFields) {
        const existingReq = requirements.find(r => r.field_name === field.field_name)
        
        if (!existingReq) {
          // Use upsert to handle duplicates gracefully
          const { error } = await supabase
            .from('payroll_lock_requirements')
            .upsert({
              field_name: field.field_name,
              display_name: field.display_name,
              required_for_hr_lock: false,
              required_for_finance_lock: false
            }, {
              onConflict: 'field_name',
              ignoreDuplicates: false
            })
          
          if (error) {
            console.error(`Error upserting ${field.field_name}:`, error)
            // Continue with other fields even if one fails
          }
        } else {
          // Update display name if it changed
          if (existingReq.display_name !== field.display_name) {
            const { error } = await supabase
              .from('payroll_lock_requirements')
              .update({ display_name: field.display_name })
              .eq('field_name', field.field_name)
            
            if (error) {
              console.error(`Error updating ${field.field_name}:`, error)
            }
          }
        }
      }

      // Remove requirements for fields that are no longer editable
      const editableFieldNames = editableFields.map(f => f.field_name)
      const requirementsToRemove = requirements.filter(
        r => !editableFieldNames.includes(r.field_name)
      )

      for (const req of requirementsToRemove) {
        const { error } = await supabase
          .from('payroll_lock_requirements')
          .delete()
          .eq('field_name', req.field_name)
        
        if (error) {
          console.error(`Error deleting ${req.field_name}:`, error)
        }
      }

      await loadRequirements()
      alert('Successfully synced with Field Access Control settings')
    } catch (error: any) {
      console.error('Error syncing:', error)
      alert(`Failed to sync: ${error?.message || 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  const toggleHRRequirement = (fieldName: string) => {
    setRequirements(prev => 
      prev.map(req => 
        req.field_name === fieldName 
          ? { ...req, required_for_hr_lock: !req.required_for_hr_lock }
          : req
      )
    )
    setHasChanges(true)
  }

  const toggleFinanceRequirement = (fieldName: string) => {
    setRequirements(prev => 
      prev.map(req => 
        req.field_name === fieldName 
          ? { ...req, required_for_finance_lock: !req.required_for_finance_lock }
          : req
      )
    )
    setHasChanges(true)
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      for (const req of requirements) {
        await updateLockRequirement(
          req.field_name, 
          req.required_for_hr_lock,
          req.required_for_finance_lock
        )
      }
      setHasChanges(false)
      alert('Lock requirements updated successfully')
    } catch (error) {
      console.error('Error saving lock requirements:', error)
      alert('Failed to save lock requirements')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Lock Requirements</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Filter requirements based on field access settings
  const hrEditableFields = requirements.filter(req => {
    const fieldAccess = fieldAccessSettings.find(f => f.field_name === req.field_name)
    return fieldAccess?.hr_can_edit
  })

  const financeEditableFields = requirements.filter(req => {
    const fieldAccess = fieldAccessSettings.find(f => f.field_name === req.field_name)
    return fieldAccess?.finance_can_edit
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Payroll Lock Requirements</CardTitle>
            <CardDescription>
              Configure which fields must be filled before HR or Finance can lock an employee for payroll finalization
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={syncWithFieldAccess}
            disabled={syncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync with Field Access'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Dynamic Field List</p>
            <p>Only fields that are editable in <strong>Field Access Control</strong> settings appear here. 
            Click "Sync" to update the list if you've changed field access permissions.</p>
          </div>
        </div>

        {/* HR Lock Requirements */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Lock className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">HR Lock Requirements</h3>
            <Badge variant="outline" className="ml-2">
              {hrEditableFields.filter(r => r.required_for_hr_lock).length} / {hrEditableFields.length} required
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Fields that must be completed before HR can lock an employee (from HR-editable fields)
          </p>
          {hrEditableFields.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No HR-editable fields found. Configure Field Access Control first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hrEditableFields.map((req) => (
                <div key={`hr-${req.field_name}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Label htmlFor={`hr-${req.field_name}`} className="cursor-pointer flex-1">
                    {req.display_name}
                  </Label>
                  <Switch
                    id={`hr-${req.field_name}`}
                    checked={req.required_for_hr_lock}
                    onCheckedChange={() => toggleHRRequirement(req.field_name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Finance Lock Requirements */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Lock className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Finance Lock Requirements</h3>
            <Badge variant="outline" className="ml-2">
              {financeEditableFields.filter(r => r.required_for_finance_lock).length} / {financeEditableFields.length} required
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Fields that must be completed before Finance can lock an employee (from Finance-editable fields)
          </p>
          {financeEditableFields.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No Finance-editable fields found. Configure Field Access Control first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {financeEditableFields.map((req) => (
                <div key={`finance-${req.field_name}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Label htmlFor={`finance-${req.field_name}`} className="cursor-pointer flex-1">
                    {req.display_name}
                  </Label>
                  <Switch
                    id={`finance-${req.field_name}`}
                    checked={req.required_for_finance_lock}
                    onCheckedChange={() => toggleFinanceRequirement(req.field_name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={saveChanges} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={loadRequirements} disabled={saving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
