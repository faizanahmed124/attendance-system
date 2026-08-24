import { Routes, Route } from 'react-router-dom'
import ProtectedLayout from '../components/ProtectedLayout'
import Login from '../pages/Login/Login'
import Dashboard from '../pages/Dashboard/Dashboard'
import Company from '../pages/Company/Company'
import Department from '../pages/Department/Department'
import DepartmentForm from '../pages/Department/DepartmentForm'
import Designation from '../pages/Designation/Designation'
import Employee from '../pages/Employee/Employee'
import EmployeeForm from '../pages/Employee/EmployeeForm'
import EmployeeProfile from '../pages/Employee/EmployeeProfile'
import Attendance from '../pages/Attendance/Attendance'
import AttendanceDetail from '../pages/Attendance/AttendanceDetail'
import CheckIn from '../pages/Attendance/CheckIn'
import Permissions from '../pages/Settings/Permissions'
import SystemSettings from '../pages/Settings/SystemSettings'
import DataImport from '../pages/Settings/DataImport'
import LoanTypes from '../pages/Loan/LoanTypes'
import LoanApplications from '../pages/Loan/LoanApplications'
import LoanApplicationForm from '../pages/Loan/LoanApplicationForm'
import LoanApplicationDetail from '../pages/Loan/LoanApplicationDetail'
import Loans from '../pages/Loan/Loans'
import LoanDetail from '../pages/Loan/LoanDetail'
import Users from '../pages/Users/Users'
import UserDetail from '../pages/Users/UserDetail'
import ModuleOverview from '../pages/ModuleOverview/ModuleOverview'
import JobOpening from '../pages/Recruitment/JobOpening'
import Applicants from '../pages/Recruitment/Applicants'
import ApplicantForm from '../pages/Recruitment/ApplicantForm'
import ApplicantDetail from '../pages/Recruitment/ApplicantDetail'
import BiometricDevices from '../pages/Integration/BiometricDevices'
import CCTVCameras from '../pages/Integration/CCTVCameras'
import ShiftTypes from '../pages/Attendance/ShiftTypes'
import ShiftTypeForm from '../pages/Attendance/ShiftTypeForm'
import ShiftAssignments from '../pages/Attendance/ShiftAssignments'
import CheckInLogs from '../pages/Attendance/CheckInLogs'
import ChartOfAccounts from '../pages/Accounts/ChartOfAccounts'
import AccountLedger from '../pages/Accounts/AccountLedger'
import JournalEntries from '../pages/Accounts/JournalEntries'
import ExpenseClaims from '../pages/Accounts/ExpenseClaims'
import SalaryPostings from '../pages/Accounts/SalaryPostings'
import PayrollEntries from '../pages/Payroll/PayrollEntries'
import PayrollEntryDetail from '../pages/Payroll/PayrollEntryDetail'
import SalarySlips from '../pages/Payroll/SalarySlips'
import SalarySlipDetail from '../pages/Payroll/SalarySlipDetail'
import LeaveTypes from '../pages/Leave/LeaveTypes'
import LeaveAllocations from '../pages/Leave/LeaveAllocations'
import LeaveApplications from '../pages/Leave/LeaveApplications'
import LeaveApplicationForm from '../pages/Leave/LeaveApplicationForm'
import LeaveApplicationDetail from '../pages/Leave/LeaveApplicationDetail'
import LeaveBalance from '../pages/Leave/LeaveBalance'
import SalaryComponents from '../pages/Payroll/SalaryComponents'
import SalaryStructures from '../pages/Payroll/SalaryStructures'
import SalaryStructureForm from '../pages/Payroll/SalaryStructureForm'
import SalaryStructureAssignments from '../pages/Payroll/SalaryStructureAssignments'
import EmployeeOnboardings from '../pages/Onboarding/EmployeeOnboardings'
import EmployeeOnboardingDetail from '../pages/Onboarding/EmployeeOnboardingDetail'
import EmployeeSeparations from '../pages/Onboarding/EmployeeSeparations'
import EmployeeSeparationDetail from '../pages/Onboarding/EmployeeSeparationDetail'
import TravelRequests from '../pages/Travel/TravelRequests'
import RecognitionWall from '../pages/Recognition/RecognitionWall'
import Tickets from '../pages/Helpdesk/Tickets'
import TicketForm from '../pages/Helpdesk/TicketForm'
import TicketDetail from '../pages/Helpdesk/TicketDetail'
import Reports from '../pages/Reports/Reports'
import ReportViewer from '../pages/Reports/ReportViewer'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/modules/:moduleKey" element={<ModuleOverview />} />
        <Route path="/companies" element={<Company />} />
        <Route path="/departments" element={<Department />} />
        <Route path="/departments/new" element={<DepartmentForm />} />
        <Route path="/departments/:id/edit" element={<DepartmentForm />} />
        <Route path="/designations" element={<Designation />} />
        <Route path="/employees" element={<Employee />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeProfile />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/attendance/:id" element={<AttendanceDetail />} />
        <Route path="/attendance/shift-types" element={<ShiftTypes />} />
        <Route path="/attendance/shift-types/new" element={<ShiftTypeForm />} />
        <Route path="/attendance/shift-types/:id/edit" element={<ShiftTypeForm />} />
        <Route path="/attendance/shift-assignments" element={<ShiftAssignments />} />
        <Route path="/check-in-logs" element={<CheckInLogs />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/recruitment/job-openings" element={<JobOpening />} />
        <Route path="/recruitment/applicants" element={<Applicants />} />
        <Route path="/recruitment/applicants/new" element={<ApplicantForm />} />
        <Route path="/recruitment/applicants/:id" element={<ApplicantDetail />} />
        <Route path="/integration/biometric-devices" element={<BiometricDevices />} />
        <Route path="/integration/cctv-cameras" element={<CCTVCameras />} />
        <Route path="/accounts/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="/accounts/chart-of-accounts/:id/ledger" element={<AccountLedger />} />
        <Route path="/accounts/journal-entries" element={<JournalEntries />} />
        <Route path="/accounts/expense-claims" element={<ExpenseClaims />} />
        <Route path="/accounts/salary-postings" element={<SalaryPostings />} />
        <Route path="/payroll/entries" element={<PayrollEntries />} />
        <Route path="/payroll/entries/:id" element={<PayrollEntryDetail />} />
        <Route path="/payroll/salary-slips" element={<SalarySlips />} />
        <Route path="/payroll/salary-slips/:id" element={<SalarySlipDetail />} />
        <Route path="/settings/permissions" element={<Permissions />} />
        <Route path="/settings/system" element={<SystemSettings />} />
        <Route path="/settings/data-import" element={<DataImport />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="/loans/types" element={<LoanTypes />} />
        <Route path="/loans/applications" element={<LoanApplications />} />
        <Route path="/loans/applications/new" element={<LoanApplicationForm />} />
        <Route path="/loans/applications/:id" element={<LoanApplicationDetail />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
      <Route path="/leaves/types" element={<LeaveTypes />} />
      <Route path="/leaves/allocations" element={<LeaveAllocations />} />
      <Route path="/leaves/balance" element={<LeaveBalance />} />
      <Route path="/leaves/applications" element={<LeaveApplications />} />
      <Route path="/leaves/applications/new" element={<LeaveApplicationForm />} />
      <Route path="/leaves/applications/:id" element={<LeaveApplicationDetail />} />
      <Route path="/payroll/salary-components" element={<SalaryComponents />} />
      <Route path="/payroll/salary-structures" element={<SalaryStructures />} />
      <Route path="/payroll/salary-structures/new" element={<SalaryStructureForm />} />
      <Route path="/payroll/salary-structures/:id/edit" element={<SalaryStructureForm />} />
      <Route path="/payroll/salary-structure-assignments" element={<SalaryStructureAssignments />} />
      <Route path="/onboarding" element={<EmployeeOnboardings />} />
      <Route path="/onboarding/:id" element={<EmployeeOnboardingDetail />} />
      <Route path="/offboarding" element={<EmployeeSeparations />} />
      <Route path="/offboarding/:id" element={<EmployeeSeparationDetail />} />
      <Route path="/travel-requests" element={<TravelRequests />} />
      <Route path="/recognition" element={<RecognitionWall />} />
      <Route path="/helpdesk/tickets" element={<Tickets />} />
      <Route path="/helpdesk/tickets/new" element={<TicketForm />} />
      <Route path="/helpdesk/tickets/:id" element={<TicketDetail />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/reports/:reportKey" element={<ReportViewer />} />
      </Route>
    </Routes>
  )
}
