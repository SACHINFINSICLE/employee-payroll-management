# Employee Payroll Management Portal

A web-based portal for managing employee details and facilitating payroll processing. Built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui, and Supabase.

## Features

### User Roles
- **HR Representative**: Upload employee data, add new employees, edit assigned fields, sign off on payroll
- **Finance Representative**: Review payroll after HR sign-off, approve/reject with remarks, mark payment status
- **Administrator**: Full access to all features including settings

### Core Functionality
- **Dashboard**: Overview with key metrics, pending sign-offs, total payroll
- **Employee Management**: 
  - Tabular view with inline editing
  - Search by Employee ID or Name
  - Filter by status, department, designation, payment status
  - Bulk CSV upload
  - Export to CSV
- **Payroll Processing**:
  - Monthly payroll cycle management
  - HR sign-off workflow
  - Finance review and approval
  - Rejection with remarks
  - Auto-calculated net pay
- **Reports**: Generate and download PDF reports, view historical data
- **Settings**: Configure field access permissions, customize dropdown options

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **PDF Generation**: jsPDF with autotable
- **CSV Handling**: PapaParse

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

The Supabase database schema includes:
- `user_profiles` - User information and roles
- `employees` - Employee master data
- `monthly_payroll` - Monthly payroll records
- `field_access_settings` - Field-level permissions
- `dropdown_options` - Customizable dropdown values
- `payroll_reports` - Generated report history
- `audit_logs` - Change tracking

## Usage

### Creating Users
1. Navigate to the login page
2. Click "Sign up" to create a new account
3. Select your role (HR, Finance, or Admin)
4. Verify your email if required

### Payroll Workflow
1. **HR**: Add employees or bulk upload via CSV
2. **HR**: Click "Initialize Payroll" to create monthly records
3. **HR**: Edit salary components, deductions, additions
4. **HR**: Sign off when complete
5. **Finance**: Review after HR sign-off
6. **Finance**: Approve or reject with remarks
7. **Finance**: Mark payment status as Paid

### Generating Reports
1. Navigate to Reports page
2. Select month and year
3. Click "Generate & Download PDF"

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, Layout)
│   └── ui/              # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx  # Authentication context
├── hooks/
│   ├── useEmployees.ts  # Employee data hook
│   └── useFieldAccess.ts # Field permissions hook
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Utility functions
├── pages/
│   ├── Dashboard.tsx    # Dashboard page
│   ├── Employees.tsx    # Employee management
│   ├── Login.tsx        # Authentication
│   ├── Reports.tsx      # Reports page
│   └── Settings.tsx     # Settings page
├── types/
│   └── database.ts      # TypeScript types
├── App.tsx              # Main app with routing
└── main.tsx             # Entry point
```

## License

MIT
