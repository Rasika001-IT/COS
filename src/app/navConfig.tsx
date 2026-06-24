import type { ComponentType } from 'react'
import {
  Home,
  Clock,
  CheckSquare,
  MessageSquareWarning,
  User,
  LayoutDashboard,
  FolderKanban,
  FileBarChart,
  CalendarOff,
  Wallet,
  Settings,
  ShieldHalf,
  Bell,
} from 'lucide-react'
import type { Role } from '@/types'

// Single source of truth for routes + role visibility. Drives BOTH the nav
// (sidebar + bottom nav) and the route guards (dead-end guard (b): data-driven,
// role-aware, so later modules slot in by adding a row here). `primary` items
// appear in the mobile bottom nav; the rest are sidebar/desktop only.
export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number | string }>
  roles: Role[]
  primary?: boolean
  /** false → routes to the Placeholder screen until its module is built. */
  implemented: boolean
  /** Plan/feature-flag gate (HLD §3.3): hidden when the active org lacks this
   *  module. Items without a module always show (Home, Profile, Admin, Platform). */
  module?: string
}

const ALL: Role[] = ['superadmin', 'admin', 'manager', 'supervisor', 'worker']

export const NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: Home, roles: ['worker', 'supervisor'], primary: true, implemented: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'admin', 'superadmin'], primary: true, implemented: true, module: 'dashboard' },
  { to: '/attendance', label: 'Attendance', icon: Clock, roles: ALL, primary: true, implemented: true, module: 'attendance' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, roles: ['worker', 'supervisor', 'manager'], primary: true, implemented: true, module: 'tasks' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, roles: ['manager', 'admin', 'superadmin'], implemented: true, module: 'projects' },
  { to: '/grievances', label: 'Grievances', icon: MessageSquareWarning, roles: ['admin', 'manager', 'supervisor', 'worker'], primary: true, implemented: true, module: 'grievances' },
  { to: '/leave', label: 'Leave', icon: CalendarOff, roles: ALL, implemented: true, module: 'leave' },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ALL, implemented: true, module: 'notifications' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['supervisor', 'manager', 'admin', 'superadmin'], implemented: true, module: 'reports' },
  { to: '/payroll', label: 'Payroll', icon: Wallet, roles: ['manager', 'admin', 'superadmin'], implemented: true, module: 'attendance' },
  { to: '/admin', label: 'Admin', icon: Settings, roles: ['admin', 'superadmin'], implemented: true },
  { to: '/superadmin', label: 'Platform', icon: ShieldHalf, roles: ['superadmin'], implemented: true },
  { to: '/profile', label: 'Profile', icon: User, roles: ALL, primary: true, implemented: true },
]

// Role + active-org module gate. `modules` undefined → no gating (role only).
export function navForRole(role: Role, modules?: string[]): NavItem[] {
  return NAV.filter((n) => n.roles.includes(role) && (!n.module || !modules || modules.includes(n.module)))
}

export function primaryNavForRole(role: Role, modules?: string[]): NavItem[] {
  // Bottom nav caps at 5 items for thumb reach.
  return navForRole(role, modules)
    .filter((n) => n.primary)
    .slice(0, 5)
}

/** Where a role lands after login / on hitting "/". */
export function roleHome(role: Role): string {
  if (role === 'superadmin') return '/superadmin'
  return role === 'worker' || role === 'supervisor' ? '/home' : '/dashboard'
}
