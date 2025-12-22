# Page Access Control Model

## Overview

The application implements a two-tier access control system:
1. **Page-level access** - Controls which pages users can access based on their role
2. **Field-level access** - Controls which fields users can edit within pages (configured in Admin Settings)

## Page Access by Role

### Admin Role
- ✅ Dashboard
- ✅ Employees
- ✅ Reports
- ✅ Settings

### HR Role (Default Configuration)
- ✅ Dashboard
- ✅ Employees
- ✅ Reports
- ❌ Settings (Admin only)

### Finance Role (Default Configuration)
- ✅ Dashboard
- ✅ Employees
- ✅ Reports
- ❌ Settings (Admin only)

**Note**: By default, all pages (except Settings) are accessible to all users. Admin can restrict access as needed through the Settings page.

## Implementation Details

### 1. Sidebar Navigation (`src/components/layout/Sidebar.tsx`)

Each navigation item has a `roles` array that specifies which roles can see it:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hr', 'finance'] },
  { name: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'hr', 'finance'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'finance'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
]
```

The sidebar filters navigation items based on the current user's role:

```typescript
const visibleNavigation = navigation.filter(item => 
  profile?.role && item.roles.includes(profile.role)
)
```

### 2. Route Protection (`src/App.tsx`)

The `ProtectedRoute` component now accepts an `allowedRoles` prop:

```typescript
function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode
  allowedRoles?: string[]
})
```

Each route specifies which roles can access it:

```typescript
<Route
  path="/reports"
  element={
    <ProtectedRoute allowedRoles={['admin', 'finance']}>
      <Reports />
    </ProtectedRoute>
  }
/>
```

If a user tries to access a page they don't have permission for:
- They are redirected to the dashboard (`/`)
- The page link doesn't appear in their sidebar

### 3. Field-Level Access (`src/pages/Settings.tsx`)

Admins can configure field-level permissions in the Settings page:
- **HR Can Edit** - Which fields HR can modify in the Employees page
- **Finance Can Edit** - Which fields Finance can modify in the Employees page
- **Visible** - Whether the field is visible to non-admin users

This is stored in the `field_access_settings` table and enforced by the `useFieldAccess` hook.

## Role Hierarchy

The `AuthContext` provides convenience flags:

```typescript
const isHR = profile?.role === 'hr' || profile?.role === 'admin'
const isFinance = profile?.role === 'finance' || profile?.role === 'admin'
const isAdmin = profile?.role === 'admin'
```

**Note**: Admin has all permissions but is NOT automatically treated as HR or Finance for page access purposes. The route protection uses explicit role checks.

## Security Considerations

1. **Defense in Depth**: Both sidebar filtering AND route protection are implemented
   - Sidebar filtering provides UX (users don't see links they can't access)
   - Route protection provides security (users can't access pages by typing URLs)

2. **Server-Side Security**: The Supabase database has Row Level Security (RLS) policies that enforce permissions at the data layer

3. **Field-Level Security**: Even if a user can access a page, the `useFieldAccess` hook controls what they can edit

## Testing Checklist

### Admin User
- [ ] Can see all 4 navigation items (Dashboard, Employees, Reports, Settings)
- [ ] Can access all pages
- [ ] Can configure field access settings
- [ ] Can edit all fields in Employees page

### HR User
- [ ] Can see 3 navigation items (Dashboard, Employees, Reports) by default
- [ ] Cannot see Settings in sidebar
- [ ] Redirected to dashboard if trying to access /settings directly
- [ ] Can edit only HR-assigned fields in Employees page
- [ ] Can perform HR sign-off
- [ ] Can generate and download reports

### Finance User
- [ ] Can see 3 navigation items (Dashboard, Employees, Reports) by default
- [ ] Cannot see Settings in sidebar
- [ ] Redirected to dashboard if trying to access /settings directly
- [ ] Can edit only Finance-assigned fields in Employees page
- [ ] Can approve/reject payroll after HR sign-off
- [ ] Can generate and download reports

## Future Enhancements

Consider adding:
1. Database table for page access settings (similar to field_access_settings)
2. Admin UI to configure page access dynamically
3. More granular permissions (e.g., view-only vs edit access)
4. Audit logging for page access attempts
