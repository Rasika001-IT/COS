import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireRole } from './guards'
import { roleHome, NAV } from './navConfig'
import { useCurrentUser } from './hooks'
import { AppShell } from '@/features/shell/AppShell'
import { Placeholder } from '@/features/placeholder/Placeholder'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { AccountSetupScreen } from '@/features/auth/AccountSetupScreen'
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen'
import { LinkSentScreen } from '@/features/auth/LinkSentScreen'
import { WorkerHome } from '@/features/home/WorkerHome'
import { AttendanceScreen } from '@/features/attendance/AttendanceScreen'
import { ManagerDashboard } from '@/features/dashboard/ManagerDashboard'
import { ReportsScreen } from '@/features/reports/ReportsScreen'
import { ReportBuilder } from '@/features/reports/ReportBuilder'
import { AuditLogScreen } from '@/features/reports/AuditLogScreen'
import { ProjectsScreen } from '@/features/projects/ProjectsScreen'
import { ProjectDetail } from '@/features/projects/ProjectDetail'
import { SiteDetail } from '@/features/projects/SiteDetail'
import { TasksScreen } from '@/features/tasks/TasksScreen'
import { GrievancesScreen } from '@/features/grievances/GrievancesScreen'
import { GrievanceDetail } from '@/features/grievances/GrievanceDetail'
import { LeaveScreen } from '@/features/leave/LeaveScreen'
import { PayrollScreen } from '@/features/payroll/PayrollScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { AdminScreen } from '@/features/admin/AdminScreen'
import { SuperAdminScreen } from '@/features/superadmin/SuperAdminScreen'
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen'

// Redirect "/" (and authed users visiting auth pages) to the role's home.
function RoleIndex() {
  const user = useCurrentUser()
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

export function AppRoutes() {
  // Unimplemented NAV destinations render the Placeholder so the shell's nav is
  // complete without dead links (guard (b)).
  const placeholderRoutes = NAV.filter((n) => !n.implemented)

  return (
    <Routes>
      {/* Public auth screens */}
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/account-setup" element={<AccountSetupScreen />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/link-sent" element={<LinkSentScreen />} />

      {/* Protected app */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<RoleIndex />} />
        <Route
          path="/home"
          element={
            <RequireRole roles={['worker', 'supervisor']}>
              <WorkerHome />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['manager', 'admin', 'superadmin']}>
              <ManagerDashboard />
            </RequireRole>
          }
        />
        <Route path="/attendance" element={<AttendanceScreen />} />
        <Route
          path="/reports"
          element={
            <RequireRole roles={['supervisor', 'manager', 'admin', 'superadmin']}>
              <ReportsScreen />
            </RequireRole>
          }
        />
        <Route
          path="/reports/:type"
          element={
            <RequireRole roles={['supervisor', 'manager', 'admin', 'superadmin']}>
              <ReportBuilder />
            </RequireRole>
          }
        />
        <Route
          path="/audit-log"
          element={
            <RequireRole roles={['manager', 'admin', 'superadmin']}>
              <AuditLogScreen />
            </RequireRole>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequireRole roles={['worker', 'supervisor', 'manager']}>
              <TasksScreen />
            </RequireRole>
          }
        />
        <Route
          path="/projects"
          element={
            <RequireRole roles={['manager', 'admin', 'superadmin']}>
              <ProjectsScreen />
            </RequireRole>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <RequireRole roles={['manager', 'admin', 'superadmin']}>
              <ProjectDetail />
            </RequireRole>
          }
        />
        <Route
          path="/sites/:id"
          element={
            <RequireRole roles={['supervisor', 'manager', 'admin', 'superadmin']}>
              <SiteDetail />
            </RequireRole>
          }
        />
        <Route path="/grievances" element={<GrievancesScreen />} />
        <Route path="/grievances/:id" element={<GrievanceDetail />} />
        <Route path="/leave" element={<LeaveScreen />} />
        <Route
          path="/payroll"
          element={
            <RequireRole roles={['manager', 'admin', 'superadmin']}>
              <PayrollScreen />
            </RequireRole>
          }
        />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/notifications" element={<NotificationsScreen />} />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin', 'superadmin']}>
              <AdminScreen />
            </RequireRole>
          }
        />
        <Route
          path="/superadmin"
          element={
            <RequireRole roles={['superadmin']}>
              <SuperAdminScreen />
            </RequireRole>
          }
        />
        {placeholderRoutes.map((n) => (
          <Route
            key={n.to}
            path={n.to}
            element={
              <RequireRole roles={n.roles}>
                <Placeholder title={n.label} />
              </RequireRole>
            }
          />
        ))}
      </Route>

      <Route path="*" element={<RoleIndex />} />
    </Routes>
  )
}
