import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Save, Plus, Trash2, Shield, Building2, Briefcase, MinusCircle, PlusCircle, Award, RotateCcw, Lock, Database } from 'lucide-react'
import type { FieldAccessSetting, PageAccessSetting, Department, Designation, Deduction, Addition, Incentive } from '@/types/database'
import { PayrollLockSettings } from '@/components/PayrollLockSettings'
import { PayrollRevertSettings } from '@/components/PayrollRevertSettings'
import { DataManagementSettings } from '@/components/DataManagementSettings'

export function Settings() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('page-access')
  const [pageSettings, setPageSettings] = useState<PageAccessSetting[]>([])
  const [fieldSettings, setFieldSettings] = useState<FieldAccessSetting[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [additions, setAdditions] = useState<Addition[]>([])
  const [incentives, setIncentives] = useState<Incentive[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [showAddDesignation, setShowAddDesignation] = useState(false)
  const [showAddDeduction, setShowAddDeduction] = useState(false)
  const [showAddAddition, setShowAddAddition] = useState(false)
  const [showAddIncentive, setShowAddIncentive] = useState(false)
  const [newDepartment, setNewDepartment] = useState('')
  const [newDesignation, setNewDesignation] = useState('')
  const [newDeduction, setNewDeduction] = useState('')
  const [newAddition, setNewAddition] = useState('')
  const [newIncentive, setNewIncentive] = useState('')


  useEffect(() => {
    fetchSettings()
  }, [])


  const fetchSettings = async () => {
    try {
      setLoading(true)
      const [pageRes, fieldRes, deptRes, desigRes, dedRes, addRes, incRes] = await Promise.all([
        supabase.from('page_access_settings').select('*').order('page_order'),
        supabase.from('field_access_settings').select('*').order('field_order'),
        supabase.from('departments').select('*').order('display_order'),
        supabase.from('designations').select('*').order('display_order'),
        supabase.from('deductions').select('*').order('display_order'),
        supabase.from('additions').select('*').order('display_order'),
        supabase.from('incentives').select('*').order('display_order'),
      ])

      if (pageRes.data) setPageSettings(pageRes.data as PageAccessSetting[])
      if (fieldRes.data) setFieldSettings(fieldRes.data as FieldAccessSetting[])
      if (deptRes.data) setDepartments(deptRes.data as Department[])
      if (desigRes.data) setDesignations(desigRes.data as Designation[])
      if (dedRes.data) setDeductions(dedRes.data as Deduction[])
      if (addRes.data) setAdditions(addRes.data as Addition[])
      if (incRes.data) setIncentives(incRes.data as Incentive[])
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePageSetting = async (id: string, field: keyof PageAccessSetting, value: boolean) => {
    try {
      setSaving(true)
      await supabase.from('page_access_settings').update({ [field]: value }).eq('id', id)
      setPageSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      )
    } catch (error) {
      console.error('Error updating page setting:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateFieldSetting = async (id: string, field: keyof FieldAccessSetting, value: boolean) => {
    try {
      setSaving(true)
      await supabase.from('field_access_settings').update({ [field]: value }).eq('id', id)
      setFieldSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      )
    } catch (error) {
      console.error('Error updating field setting:', error)
    } finally {
      setSaving(false)
    }
  }


  const addDepartment = async () => {
    if (!newDepartment.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase.from('departments').insert({
        name: newDepartment.trim(),
        is_active: true,
        display_order: departments.length,
      }).select().single()

      if (error) throw error
      if (data) setDepartments((prev) => [...prev, data as Department])
      setShowAddDepartment(false)
      setNewDepartment('')
    } catch (error) {
      console.error('Error adding department:', error)
      alert('Failed to add department. It may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const toggleDepartment = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('departments').update({ is_active: !isActive }).eq('id', id)
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !isActive } : d))
      )
    } catch (error) {
      console.error('Error toggling department:', error)
    }
  }

  const deleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    try {
      await supabase.from('departments').delete().eq('id', id)
      setDepartments((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Error deleting department:', error)
    }
  }

  const addDesignation = async () => {
    if (!newDesignation.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase.from('designations').insert({
        name: newDesignation.trim(),
        is_active: true,
        display_order: designations.length,
      }).select().single()

      if (error) throw error
      if (data) setDesignations((prev) => [...prev, data as Designation])
      setShowAddDesignation(false)
      setNewDesignation('')
    } catch (error) {
      console.error('Error adding designation:', error)
      alert('Failed to add designation. It may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const toggleDesignation = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('designations').update({ is_active: !isActive }).eq('id', id)
      setDesignations((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !isActive } : d))
      )
    } catch (error) {
      console.error('Error toggling designation:', error)
    }
  }

  const deleteDesignation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) return
    try {
      await supabase.from('designations').delete().eq('id', id)
      setDesignations((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Error deleting designation:', error)
    }
  }

  const addDeduction = async () => {
    if (!newDeduction.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase.from('deductions').insert({
        name: newDeduction.trim(),
        is_active: true,
        display_order: deductions.length,
      }).select().single()

      if (error) throw error
      if (data) setDeductions((prev) => [...prev, data as Deduction])
      setShowAddDeduction(false)
      setNewDeduction('')
    } catch (error) {
      console.error('Error adding deduction:', error)
      alert('Failed to add deduction. It may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const toggleDeduction = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('deductions').update({ is_active: !isActive }).eq('id', id)
      setDeductions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !isActive } : d))
      )
    } catch (error) {
      console.error('Error toggling deduction:', error)
    }
  }

  const deleteDeduction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deduction?')) return
    try {
      await supabase.from('deductions').delete().eq('id', id)
      setDeductions((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Error deleting deduction:', error)
    }
  }

  const addAddition = async () => {
    if (!newAddition.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase.from('additions').insert({
        name: newAddition.trim(),
        is_active: true,
        display_order: additions.length,
      }).select().single()

      if (error) throw error
      if (data) setAdditions((prev) => [...prev, data as Addition])
      setShowAddAddition(false)
      setNewAddition('')
    } catch (error) {
      console.error('Error adding addition:', error)
      alert('Failed to add addition. It may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const toggleAddition = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('additions').update({ is_active: !isActive }).eq('id', id)
      setAdditions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !isActive } : d))
      )
    } catch (error) {
      console.error('Error toggling addition:', error)
    }
  }

  const deleteAddition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this addition?')) return
    try {
      await supabase.from('additions').delete().eq('id', id)
      setAdditions((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Error deleting addition:', error)
    }
  }

  const addIncentive = async () => {
    if (!newIncentive.trim()) return
    try {
      setSaving(true)
      const { data, error } = await supabase.from('incentives').insert({
        name: newIncentive.trim(),
        is_active: true,
        display_order: incentives.length,
      }).select().single()

      if (error) throw error
      if (data) setIncentives((prev) => [...prev, data as Incentive])
      setShowAddIncentive(false)
      setNewIncentive('')
    } catch (error) {
      console.error('Error adding incentive:', error)
      alert('Failed to add incentive. It may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const toggleIncentive = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('incentives').update({ is_active: !isActive }).eq('id', id)
      setIncentives((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !isActive } : d))
      )
    } catch (error) {
      console.error('Error toggling incentive:', error)
    }
  }

  const deleteIncentive = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incentive?')) return
    try {
      await supabase.from('incentives').delete().eq('id', id)
      setIncentives((prev) => prev.filter((d) => d.id !== id))
    } catch (error) {
      console.error('Error deleting incentive:', error)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-slate-600">
              Only administrators can access the settings page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Configure system settings and permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="space-y-2">
          {/* Row 1: Access Controls & Organization Settings */}
          <TabsList className="w-full justify-center">
            <TabsTrigger value="page-access">
              <Shield className="mr-2 h-4 w-4" />
              Page Access
            </TabsTrigger>
            <TabsTrigger value="field-access">
              <Shield className="mr-2 h-4 w-4" />
              Field Access
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="mr-2 h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="designations">
              <Briefcase className="mr-2 h-4 w-4" />
              Designations
            </TabsTrigger>
          </TabsList>
          {/* Row 2: Payroll Settings */}
          <TabsList className="w-full justify-center">
            <TabsTrigger value="deductions">
              <MinusCircle className="mr-2 h-4 w-4" />
              Deductions
            </TabsTrigger>
            <TabsTrigger value="additions">
              <PlusCircle className="mr-2 h-4 w-4" />
              Additions
            </TabsTrigger>
            <TabsTrigger value="incentives">
              <Award className="mr-2 h-4 w-4" />
              Incentives
            </TabsTrigger>
            <TabsTrigger value="lock-requirements">
              <Lock className="mr-2 h-4 w-4" />
              Lock Requirements
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="revert-payroll">
                <RotateCcw className="mr-2 h-4 w-4" />
                Revert Payroll
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="data-management">
                <Database className="mr-2 h-4 w-4" />
                Data Management
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="page-access">
          <Card>
            <CardHeader>
              <CardTitle>Page Access Control</CardTitle>
              <CardDescription>
                Configure which pages HR and Finance roles can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page Name</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead className="text-center">HR Can Access</TableHead>
                      <TableHead className="text-center">Finance Can Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageSettings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell className="font-medium">{setting.display_name}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{setting.page_route}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.hr_can_access}
                            onCheckedChange={(checked) =>
                              updatePageSetting(setting.id, 'hr_can_access', checked)
                            }
                            disabled={saving || setting.page_name === 'settings'}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.finance_can_access}
                            onCheckedChange={(checked) =>
                              updatePageSetting(setting.id, 'finance_can_access', checked)
                            }
                            disabled={saving || setting.page_name === 'settings'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Admin role always has access to all pages. The Settings page is restricted to Admin only and cannot be modified.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  Manage department options for employee records
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDepartment(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={dept.is_active}
                            onCheckedChange={() => toggleDepartment(dept.id, dept.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDepartment(dept.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Designations</CardTitle>
                <CardDescription>
                  Manage designation options for employee records
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDesignation(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Designation
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designations.map((desig) => (
                      <TableRow key={desig.id}>
                        <TableCell className="font-medium">{desig.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={desig.is_active}
                            onCheckedChange={() => toggleDesignation(desig.id, desig.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDesignation(desig.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deductions</CardTitle>
                <CardDescription>
                  Manage deduction options for payroll
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDeduction(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Deduction
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((ded) => (
                      <TableRow key={ded.id}>
                        <TableCell className="font-medium">{ded.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={ded.is_active}
                            onCheckedChange={() => toggleDeduction(ded.id, ded.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDeduction(ded.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="additions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Additions</CardTitle>
                <CardDescription>
                  Manage addition options for payroll
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddAddition(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Addition
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {additions.map((add) => (
                      <TableRow key={add.id}>
                        <TableCell className="font-medium">{add.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={add.is_active}
                            onCheckedChange={() => toggleAddition(add.id, add.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAddition(add.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incentives">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Incentives</CardTitle>
                <CardDescription>
                  Manage incentive options for payroll
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddIncentive(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Incentive
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incentives.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-medium">{inc.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={inc.is_active}
                            onCheckedChange={() => toggleIncentive(inc.id, inc.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteIncentive(inc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field-access">
          <Card>
            <CardHeader>
              <CardTitle>Field Access Control</CardTitle>
              <CardDescription>
                Configure which fields can be edited by HR and Finance representatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead className="text-center">HR Can Edit</TableHead>
                      <TableHead className="text-center">Finance Can Edit</TableHead>
                      <TableHead className="text-center">HR Can View</TableHead>
                      <TableHead className="text-center">Finance Can View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldSettings.map((setting) => (
                      <TableRow key={setting.id}>
                        <TableCell className="font-mono text-sm">{setting.field_name}</TableCell>
                        <TableCell>{setting.display_name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.hr_can_edit}
                            onCheckedChange={(checked) =>
                              updateFieldSetting(setting.id, 'hr_can_edit', checked)
                            }
                            disabled={saving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.finance_can_edit}
                            onCheckedChange={(checked) =>
                              updateFieldSetting(setting.id, 'finance_can_edit', checked)
                            }
                            disabled={saving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.hr_can_view}
                            onCheckedChange={(checked) =>
                              updateFieldSetting(setting.id, 'hr_can_view', checked)
                            }
                            disabled={saving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={setting.finance_can_view}
                            onCheckedChange={(checked) =>
                              updateFieldSetting(setting.id, 'finance_can_view', checked)
                            }
                            disabled={saving}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lock-requirements">
          <PayrollLockSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="revert-payroll">
            <PayrollRevertSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="data-management">
            <DataManagementSettings />
          </TabsContent>
        )}
      </Tabs>


      <Dialog open={showAddDepartment} onOpenChange={setShowAddDepartment}>
        <DialogContent onClose={() => setShowAddDepartment(false)}>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Department Name</Label>
            <Input
              value={newDepartment}
              onChange={(e) => setNewDepartment(e.target.value)}
              placeholder="e.g., Engineering"
              onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDepartment(false)}>
              Cancel
            </Button>
            <Button onClick={addDepartment} disabled={saving || !newDepartment.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDesignation} onOpenChange={setShowAddDesignation}>
        <DialogContent onClose={() => setShowAddDesignation(false)}>
          <DialogHeader>
            <DialogTitle>Add Designation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Designation Name</Label>
            <Input
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              placeholder="e.g., Senior Developer"
              onKeyDown={(e) => e.key === 'Enter' && addDesignation()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDesignation(false)}>
              Cancel
            </Button>
            <Button onClick={addDesignation} disabled={saving || !newDesignation.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Designation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDeduction} onOpenChange={setShowAddDeduction}>
        <DialogContent onClose={() => setShowAddDeduction(false)}>
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Deduction Name</Label>
            <Input
              value={newDeduction}
              onChange={(e) => setNewDeduction(e.target.value)}
              placeholder="e.g., LOP, Late Coming"
              onKeyDown={(e) => e.key === 'Enter' && addDeduction()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeduction(false)}>
              Cancel
            </Button>
            <Button onClick={addDeduction} disabled={saving || !newDeduction.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddAddition} onOpenChange={setShowAddAddition}>
        <DialogContent onClose={() => setShowAddAddition(false)}>
          <DialogHeader>
            <DialogTitle>Add Addition</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Addition Name</Label>
            <Input
              value={newAddition}
              onChange={(e) => setNewAddition(e.target.value)}
              placeholder="e.g., Bonus, Overtime"
              onKeyDown={(e) => e.key === 'Enter' && addAddition()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAddition(false)}>
              Cancel
            </Button>
            <Button onClick={addAddition} disabled={saving || !newAddition.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Addition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddIncentive} onOpenChange={setShowAddIncentive}>
        <DialogContent onClose={() => setShowAddIncentive(false)}>
          <DialogHeader>
            <DialogTitle>Add Incentive</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Incentive Name</Label>
            <Input
              value={newIncentive}
              onChange={(e) => setNewIncentive(e.target.value)}
              placeholder="e.g., Performance Incentive"
              onKeyDown={(e) => e.key === 'Enter' && addIncentive()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIncentive(false)}>
              Cancel
            </Button>
            <Button onClick={addIncentive} disabled={saving || !newIncentive.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Add Incentive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
