// Construct OS — domain models. Mirror src/api/CONTRACT.md §2 entity shapes.
// Later-needed fields are included now (fcmToken on User, cc[] on Grievance) so
// later modules don't force a type migration (dead-end guard (e)).

export type Role = 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'worker'

export const ROLES: Role[] = ['superadmin', 'admin', 'manager', 'supervisor', 'worker']

export type EmploymentType = 'full_time' | 'contract' | 'daily_wage'

export interface User {
  id: string
  orgId: string
  name: string
  email: string
  role: Role
  siteId?: string
  avatarUrl?: string
  fcmToken?: string | null
  // Employee profile (HLD §2c) — additive (guard (e)).
  phone?: string
  dateOfJoining?: string
  emergencyContact?: string
  employmentType?: EmploymentType
  // Business Admin (HLD §4.2): deactivate without deleting; project scoping.
  active?: boolean
  projectIds?: string[]
  // Coordinates recorded at last login (location is mandatory to sign in).
  lastLoginGps?: { lat: number; lng: number }
  lastLoginAt?: string
}

// Pending invite (HLD §4.2) — the app returns a copyable link; it never emails.
export interface Invite {
  id: string
  orgId: string
  email?: string
  phone?: string
  role: Role
  siteId?: string
  token: string
  createdAt: string
}

export type OrgPlan = 'free' | 'standard' | 'pro'

export interface Org {
  id: string
  name: string
  logoUrl?: string
  timezone: string
  currency: string
  modules: string[]
  // Platform / Super Admin (HLD §3) — additive (guard (e)).
  orgCode?: string
  plan?: OrgPlan
  contactPerson?: string
  contactEmail?: string
  isActive?: boolean
  createdAt?: string
  lastLoginAt?: string
}

export interface OrgSummary extends Org {
  userCount: number
  projectCount: number
}

export interface PlatformActivity {
  id: string
  type: 'registration' | 'report' | 'login' | 'suspend'
  message: string
  orgId?: string
  at: string
}

export interface Site {
  id: string
  orgId: string
  projectId: string
  name: string
  location: string
  gps: { lat: number; lng: number }
  supervisorId: string
  isActive: boolean
}

export type GpsStatus = 'ok' | 'unavailable' | 'manual'

export interface AttendanceLog {
  id: string
  orgId: string
  userId: string
  siteId: string
  checkIn: string
  checkOut?: string
  gpsIn?: { lat: number; lng: number }
  gpsOut?: { lat: number; lng: number }
  gpsStatus: GpsStatus
  workedHours?: number
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export interface TaskComment {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

export interface Task {
  id: string
  orgId: string
  siteId: string
  title: string
  description?: string
  assignedTo: string[]
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  blockedReason?: string
  comments?: TaskComment[]
  createdBy?: string
}

// ---- Projects (HLD §3a) ----
export type ProjectStatus = 'active' | 'on_hold' | 'completed'

export interface Project {
  id: string
  orgId: string
  name: string
  clientName: string
  startDate: string
  endDate: string
  contractValue: number
  status: ProjectStatus
}

// Manager-card view: project + derived rollup metrics.
export interface ProjectSummary extends Project {
  siteCount: number
  taskTotal: number
  taskDone: number
  percentComplete: number
  daysRemaining: number
  lastActivity?: string
}

// ---- Daily progress log (HLD §3c) — narrative, not a report calc ----
export interface ProgressLog {
  id: string
  orgId: string
  siteId: string
  date: string
  weather: string
  workSummary: string
  tasksCompleted: string
  issues: string
  remarks: string
  photos: string[] // data-URLs in the mock phase (Cloudinary deferred)
  authorId: string
  authorName: string
  createdAt: string
}

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed'

export interface ProjectHealthRow {
  id: string
  name: string
  percentComplete: number
  status: ProjectHealth
}

export interface DashboardSummary {
  attendanceTodayPct: number
  attendanceDeltaPct: number
  taskCompletionPct: number
  tasksDone: number
  tasksTotal: number
  openGrievances: number
  grievancesBreachingSla: number
  activeProjects: number
  siteCount: number
}

export interface AttendanceTrendPoint {
  day: string
  ratePct: number
}

// HLD §5: full grievance lifecycle (7 states), own priority scale (Urgent), 6
// categories.
export type GrievanceStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'rejected'

export type GrievancePriority = 'low' | 'medium' | 'high' | 'urgent'

export type GrievanceCategory =
  | 'safety'
  | 'work_condition'
  | 'payment'
  | 'equipment'
  | 'interpersonal'
  | 'other'

export interface GrievanceComment {
  id: string
  authorId: string
  authorName: string
  body: string
  photos?: string[]
  createdAt: string
}

export interface Grievance {
  id: string
  orgId: string
  siteId: string
  title: string
  description: string
  category: GrievanceCategory
  priority: GrievancePriority
  status: GrievanceStatus
  raisedBy: string
  raisedByName: string // masked to "Anonymous" for non-admin viewers when anonymous
  anonymous: boolean
  assignedTo?: string
  taggedUsers: string[]
  cc: string[]
  photos: string[]
  slaDueAt: string
  slaBreaching?: boolean
  resolutionNote?: string
  rejectionReason?: string
  comments?: GrievanceComment[]
  createdAt: string
  updatedAt: string
}

export type NotificationType = 'task' | 'grievance' | 'leave' | 'attendance' | 'system'

export interface Notification {
  id: string
  orgId: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
  link?: string // optional precise deep-link; screen falls back to a type→route map
}

// ---- Leave & Payroll (HLD §2b/§2d) ----
export type LeaveType = 'casual' | 'sick' | 'unpaid'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest {
  id: string
  orgId: string
  userId: string
  userName: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  decidedBy?: string
  decidedByName?: string
  decisionComment?: string
  createdAt: string
  updatedAt: string
}

export interface LeaveBalance {
  type: LeaveType
  entitled: number
  used: number
}

// Monthly attendance summary row for the payroll export (US-13). Data export
// only — not a full payroll calculation.
export interface PayrollRow {
  userId: string
  userName: string
  workingDays: number
  present: number
  absent: number
  leaveTaken: number
  overtimeHours: number
}

// Generic paginated envelope (CONTRACT.md §1 pagination).
export interface Paginated<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

// Error envelope (CONTRACT.md §1). 401 carries a sub-code so baseQueryWithReauth
// can tell "refresh and retry" (TOKEN_EXPIRED) from "go to login" (UNAUTHORIZED).
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'TOKEN_EXPIRED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'

export interface ApiError {
  error: {
    code: ApiErrorCode
    message: string
    fields?: Record<string, string>
  }
}
