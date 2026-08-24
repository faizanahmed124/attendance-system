// Each module maps to an overview page shown when the sidebar item is clicked.
// `shortcuts` render as pill buttons (with an optional live count).
// `sections` render as the "Reports & Masters" columns underneath.

export const MODULE_OVERVIEWS = {
  leave: {
    title: 'Leave Management',
    subtitle: 'Leave types, allocations, applications, and balances.',
    shortcuts: [
      { label: 'Leave Applications', to: '/leaves/applications' },
      { label: 'Leave Balance', to: '/leaves/balance' },
      { label: 'Leave Allocations', to: '/leaves/allocations' },
      { label: 'Leave Types', to: '/leaves/types' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Leave Balance Report', to: '/reports/leave_balance_report' },
        { label: 'Leave Application Report', to: '/reports/leave_application_report' },
        { label: 'Employee-wise Leave Taken', to: '/reports/employee_leave_taken_report' },
        ],
      },
      {
        title: 'Leave Management',
        links: [
          { label: 'Leave Applications', to: '/leaves/applications' },
          { label: 'Leave Balance', to: '/leaves/balance' },
          { label: 'Leave Allocations', to: '/leaves/allocations' },
          { label: 'Leave Types', to: '/leaves/types' },
        ],
      },
    ],
  },
  loan: {
    title: 'Loan Management',
    subtitle: 'Loan applications, sanctioned loans, disbursements, and repayments.',
    shortcuts: [
      { label: 'Loans', to: '/loans' },
      { label: 'Loan Applications', to: '/loans/applications' },
      { label: 'Loan Types', to: '/loans/types' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Outstanding Loans Report', to: '/reports/outstanding_loans_report' },
        { label: 'Loan Repayment Report', to: '/reports/loan_repayment_report' },
        ],
      },
      {
        title: 'Loan Management',
        links: [
          { label: 'Loans', to: '/loans' },
          { label: 'Loan Applications', to: '/loans/applications' },
          { label: 'Loan Types', to: '/loans/types' },
        ],
      },
    ],
  },
  hr: {
    title: 'HR',
    subtitle: 'Employees, departments, designations, and companies.',
    chart: 'employeesByDepartment',
    shortcuts: [
      { label: 'Onboarding', to: '/onboarding' },
      { label: 'Offboarding', to: '/offboarding' },
      { label: 'Travel Requests', to: '/travel-requests' },
      { label: 'Employee', to: '/employees', countKey: 'employees', countLabel: 'Active' },
      { label: 'Department', to: '/departments', countKey: 'departments' },
      { label: 'Designation', to: '/designations', countKey: 'designations' },
      { label: 'Company', to: '/companies', countKey: 'companies' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Employee Directory', to: '/reports/employee_directory_report' },
        { label: 'Headcount by Department', to: '/reports/headcount_by_department_report' },
        { label: 'New Joiners Report', to: '/reports/new_joiners_report' },
        { label: 'Employee Exit Report', to: '/reports/exit_report' },
        { label: 'Work Anniversary Report', to: '/reports/work_anniversary_report' },
        { label: 'Travel Requests Report', to: '/reports/travel_requests_report' },
        { label: 'Onboarding Progress Report', to: '/reports/onboarding_progress_report' },
        ],
      },
      {
        title: 'Setup',
        links: [
          { label: 'Company', to: '/companies' },
          { label: 'Department', to: '/departments' },
          { label: 'Designation', to: '/designations' },
        ],
      },
      {
        title: 'Employee',
        links: [
          { label: 'Employee', to: '/employees' },
          { label: 'New Employee', to: '/employees/new' },
        ],
      },
    ],
  },

  recruitment: {
    title: 'Recruitment',
    subtitle: 'Job openings, applicants, interviews, and hiring.',
    chart: 'recruitmentPipeline',
    shortcuts: [
      { label: 'Job Opening', to: '/recruitment/job-openings', countKey: 'jobOpenings', countLabel: 'Open' },
      { label: 'Applicant', to: '/recruitment/applicants', countKey: 'applicants' },
      { label: 'New Applicant', to: '/recruitment/applicants/new' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Job Openings Report', to: '/reports/job_openings_report' },
        { label: 'Applicant Pipeline Report', to: '/reports/applicant_pipeline_report' },
        ],
      },
      {
        title: 'Hiring Pipeline',
        links: [
          { label: 'Job Openings', to: '/recruitment/job-openings' },
          { label: 'Applicants', to: '/recruitment/applicants' },
          { label: 'New Applicant', to: '/recruitment/applicants/new' },
        ],
      },
    ],
  },

  attendance: {
    title: 'Shift & Attendance',
    subtitle: 'Check-ins, shift types, and daily attendance records.',
    shortcuts: [
      { label: 'Attendance', to: '/attendance', countKey: 'attendanceToday', countLabel: 'Today' },
      { label: 'Check-in Logs', to: '/check-in-logs' },
      { label: 'Check-in / Check-out', to: '/check-in' },
      { label: 'Shift Type', to: '/attendance/shift-types', countKey: 'shiftTypes' },
      { label: 'Shift Assignment', to: '/attendance/shift-assignments' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Employee Check-in Report', to: '/reports/checkin_report' },
        { label: 'Late Entry Report', to: '/reports/late_entry_report' },
        { label: 'Early Exit Report', to: '/reports/early_exit_report' },
        { label: 'Shift-wise Entry Report', to: '/reports/shift_wise_entry_report' },
        { label: 'Monthly Attendance Report', to: '/reports/monthly_attendance_report' },
        { label: 'Daily Attendance Summary', to: '/reports/attendance_summary_report' },
        { label: 'Absentee Report', to: '/reports/absentee_report' },
        { label: 'Attendance Check Report', to: '/reports/attendance_check_report' },
        ],
      },
      {
        title: 'Time Tracking',
        links: [
          { label: 'Attendance', to: '/attendance' },
          { label: 'Check-in Logs', to: '/check-in-logs' },
          { label: 'Check-in / Check-out', to: '/check-in' },
        ],
      },
      {
        title: 'Shifts',
        links: [
          { label: 'Shift Types', to: '/attendance/shift-types' },
          { label: 'Shift Assignments', to: '/attendance/shift-assignments' },
        ],
      },
    ],
  },

  payroll: {
    title: 'Payroll',
    subtitle: 'Payroll entries, salary slips, and pay period processing.',
    shortcuts: [
      { label: 'Payroll Entry', to: '/payroll/entries', countKey: 'payrollEntries' },
      { label: 'Salary Slip', to: '/payroll/salary-slips', countKey: 'salarySlips' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Salary Register', to: '/reports/salary_register_report' },
        { label: 'Salary Structure Assignment Report', to: '/reports/salary_structure_assignment_report' },
        { label: 'Component-wise Payroll Report', to: '/reports/component_wise_payroll_report' },
        { label: 'Bank Transfer Report', to: '/reports/bank_transfer_report' },
        { label: 'Payroll Cost by Department', to: '/reports/payroll_cost_by_department_report' },
        ],
      },
      {
        title: 'Payroll',
        links: [
          { label: 'Payroll Entries', to: '/payroll/entries' },
          { label: 'Salary Slips', to: '/payroll/salary-slips' },
          { label: 'Salary Components', to: '/payroll/salary-components' },
          { label: 'Salary Structures', to: '/payroll/salary-structures' },
          { label: 'Salary Structure Assignments', to: '/payroll/salary-structure-assignments' },
        ],
      },
    ],
  },

  accounts: {
    title: 'Accounts',
    subtitle: 'Chart of accounts, journal entries, expenses, and salary postings.',
    shortcuts: [
      { label: 'Chart of Accounts', to: '/accounts/chart-of-accounts', countKey: 'accounts' },
      { label: 'Journal Entry', to: '/accounts/journal-entries' },
      { label: 'Expense Claim', to: '/accounts/expense-claims' },
      { label: 'Salary Posting', to: '/accounts/salary-postings' },
    ],
    sections: [
      {
        title: 'Reports',
        links: [
        { label: 'Account Balances Report', to: '/reports/account_balances_report' },
        { label: 'Expense Claims Report', to: '/reports/expense_claims_report' },
        ],
      },
      {
        title: 'Ledger',
        links: [
          { label: 'Chart of Accounts', to: '/accounts/chart-of-accounts' },
          { label: 'Journal Entries', to: '/accounts/journal-entries' },
        ],
      },
      {
        title: 'Payables',
        links: [
          { label: 'Expense Claims', to: '/accounts/expense-claims' },
          { label: 'Salary Postings', to: '/accounts/salary-postings' },
        ],
      },
    ],
  },

  integration: {
    title: 'Integration',
    subtitle: 'Biometric devices and CCTV cameras connected to the system.',
    shortcuts: [
      { label: 'Biometric Device', to: '/integration/biometric-devices', countKey: 'biometricDevices' },
      { label: 'CCTV Camera', to: '/integration/cctv-cameras', countKey: 'cctvCameras' },
    ],
    sections: [
      {
        title: 'Devices',
        links: [
          { label: 'Biometric Devices', to: '/integration/biometric-devices' },
          { label: 'CCTV Cameras', to: '/integration/cctv-cameras' },
        ],
      },
    ],
  },

  settings: {
    title: 'Settings',
    subtitle: 'Roles, permissions, and system-wide configuration.',
    adminOnly: true,
    shortcuts: [
      { label: 'Permissions', to: '/settings/permissions' },
      { label: 'System Settings', to: '/settings/system' },
      { label: 'Data Import', to: '/settings/data-import' },
      { label: 'Users', to: '/users' },
    ],
    sections: [
      {
        title: 'Access Control',
        links: [
          { label: 'Permissions', to: '/settings/permissions' },
          { label: 'Users', to: '/users' },
        ],
      },
      {
        title: 'Configuration',
        links: [
          { label: 'System Settings', to: '/settings/system' },
          { label: 'Data Import', to: '/settings/data-import' },
        ],
      },
    ],
  },
}
