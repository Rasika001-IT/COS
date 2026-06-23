// MSW seed data — Construct OS / ASS Infra (first tenant). Mirrors the entity
// shapes in src/types and the three reference frames. Delete src/api/mocks/ when
// the real backend lands.
import type {
  AttendanceLog,
  Grievance,
  LeaveBalance,
  LeaveRequest,
  Notification,
  Org,
  Project,
  ProgressLog,
  ProjectHealthRow,
  Site,
  Task,
  User,
} from '@/types'

export const ORG_ID = 'org-ass'

const today = new Date().toISOString().slice(0, 10)
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

export const org: Org = {
  id: ORG_ID,
  name: 'ASS Infra',
  logoUrl: undefined,
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  modules: ['attendance', 'leave', 'projects', 'tasks', 'grievances', 'reports', 'notifications', 'dashboard'],
  orgCode: 'ASSI-001',
  plan: 'pro',
  contactPerson: 'Vikram Rao',
  contactEmail: 'admin@ass.test',
  isActive: true,
  createdAt: '2024-02-01',
  lastLoginAt: addDays(0),
}

// Platform registry (HLD §3). org-ass has all the data; the rest are empty
// sample tenants for the Super Admin panel (one suspended, varied plans).
export const orgs: Org[] = [
  org,
  { id: 'org-bld', name: 'Buildwell Constructions', orgCode: 'BUIL-001', plan: 'standard', timezone: 'Asia/Kolkata', currency: 'INR', modules: ['attendance', 'leave', 'reports', 'dashboard', 'notifications', 'projects', 'tasks'], contactPerson: 'Priya Nair', contactEmail: 'priya@buildwell.test', isActive: true, createdAt: '2025-04-12', lastLoginAt: addDays(-2) },
  { id: 'org-mtr', name: 'MetroLine Infra', orgCode: 'METR-001', plan: 'free', timezone: 'Asia/Kolkata', currency: 'INR', modules: ['attendance', 'leave', 'reports', 'dashboard', 'notifications'], contactPerson: 'Imran Shaikh', contactEmail: 'imran@metroline.test', isActive: true, createdAt: '2025-11-03', lastLoginAt: addDays(-9) },
  { id: 'org-old', name: 'OldGuard Builders', orgCode: 'OLDG-001', plan: 'standard', timezone: 'Asia/Kolkata', currency: 'INR', modules: ['attendance', 'reports', 'dashboard'], contactPerson: 'Sunil Mehta', contactEmail: 'sunil@oldguard.test', isActive: false, createdAt: '2023-08-20', lastLoginAt: addDays(-140) },
]

// One user per role. Login accepts any non-empty password for these emails.
export const users: User[] = [
  { id: 'u-worker', orgId: ORG_ID, name: 'Ramesh Patil', email: 'worker@ass.test', role: 'worker', siteId: 'site-1', fcmToken: null, phone: '+91 98220 11234', dateOfJoining: '2024-03-15', emergencyContact: 'Sunita Patil · +91 98220 99887', employmentType: 'daily_wage' },
  { id: 'u-super', orgId: ORG_ID, name: 'Suresh Kale', email: 'supervisor@ass.test', role: 'supervisor', siteId: 'site-1', fcmToken: null, phone: '+91 99700 45612', dateOfJoining: '2022-07-01', emergencyContact: 'Manda Kale · +91 99700 11223', employmentType: 'full_time' },
  { id: 'u-mgr', orgId: ORG_ID, name: 'Anjali Deshmukh', email: 'manager@ass.test', role: 'manager', fcmToken: null, phone: '+91 98905 33421', dateOfJoining: '2021-01-11', emergencyContact: 'Rahul Deshmukh · +91 98905 77654', employmentType: 'full_time' },
  { id: 'u-admin', orgId: ORG_ID, name: 'Vikram Rao', email: 'admin@ass.test', role: 'admin', fcmToken: null, phone: '+91 99202 88123', dateOfJoining: '2020-06-02', employmentType: 'full_time' },
  { id: 'u-root', orgId: ORG_ID, name: 'Rasika Admin', email: 'super@ass.test', role: 'superadmin', fcmToken: null, employmentType: 'full_time' },
  // Business Admins of the other platform tenants (for impersonation).
  { id: 'u-bld-admin', orgId: 'org-bld', name: 'Priya Nair', email: 'priya@buildwell.test', role: 'admin', active: true },
  { id: 'u-mtr-admin', orgId: 'org-mtr', name: 'Imran Shaikh', email: 'imran@metroline.test', role: 'admin', active: true },
  { id: 'u-old-admin', orgId: 'org-old', name: 'Sunil Mehta', email: 'sunil@oldguard.test', role: 'admin', active: true },
]

export const sites: Site[] = [
  { id: 'site-1', orgId: ORG_ID, projectId: 'proj-1', name: 'Pune Ring Road — Pkg 3', location: 'Wagholi, Pune', gps: { lat: 18.58, lng: 73.98 }, supervisorId: 'u-super', isActive: true },
  { id: 'site-2', orgId: ORG_ID, projectId: 'proj-1', name: 'Hinjewadi Flyover', location: 'Hinjewadi, Pune', gps: { lat: 18.59, lng: 73.74 }, supervisorId: 'u-super', isActive: true },
  { id: 'site-3', orgId: ORG_ID, projectId: 'proj-2', name: 'Nagpur Metro — Reach 4', location: 'Nagpur', gps: { lat: 21.15, lng: 79.09 }, supervisorId: 'u-super', isActive: true },
  { id: 'site-4', orgId: ORG_ID, projectId: 'proj-3', name: 'Coastal Spur — South', location: 'Worli, Mumbai', gps: { lat: 19.01, lng: 72.81 }, supervisorId: 'u-super', isActive: false },
  { id: 'site-5', orgId: ORG_ID, projectId: 'proj-3', name: 'Coastal Spur — North', location: 'Bandra, Mumbai', gps: { lat: 19.05, lng: 72.83 }, supervisorId: 'u-super', isActive: true },
]

// Projects (HLD §3a). IDs/names align with dashboard projectHealth.
export const projects: Project[] = [
  { id: 'proj-1', orgId: ORG_ID, name: 'Pune Ring Road', clientName: 'NHAI', startDate: '2025-09-01', endDate: '2026-12-31', contractValue: 480_00_00_000, status: 'active' },
  { id: 'proj-2', orgId: ORG_ID, name: 'Nagpur Metro Reach 4', clientName: 'MahaMetro', startDate: '2025-06-15', endDate: '2026-09-30', contractValue: 320_00_00_000, status: 'active' },
  { id: 'proj-3', orgId: ORG_ID, name: 'Mumbai Coastal Spur', clientName: 'MCGM', startDate: '2026-01-10', endDate: '2027-06-30', contractValue: 610_00_00_000, status: 'on_hold' },
]

export const tasks: Task[] = [
  // site-1 (Pune Ring Road Pkg 3) — the worker's tasks (also drive Worker Home)
  { id: 't-1', orgId: ORG_ID, siteId: 'site-1', title: 'Pour foundation — Pier P12', assignedTo: ['u-worker'], dueDate: `${today}T17:00:00Z`, priority: 'high', status: 'in_progress', createdBy: 'u-super' },
  { id: 't-2', orgId: ORG_ID, siteId: 'site-1', title: 'Rebar inspection — Deck slab', assignedTo: ['u-worker'], dueDate: `${today}T13:00:00Z`, priority: 'critical', status: 'todo', createdBy: 'u-super' },
  { id: 't-3', orgId: ORG_ID, siteId: 'site-1', title: 'Shuttering removal — Pier P10', assignedTo: ['u-worker'], dueDate: `${today}T16:00:00Z`, priority: 'medium', status: 'blocked', blockedReason: 'Crane unavailable', createdBy: 'u-super' },
  { id: 't-4', orgId: ORG_ID, siteId: 'site-1', title: 'Update daily progress log', assignedTo: ['u-worker'], dueDate: `${today}T18:00:00Z`, priority: 'low', status: 'done', createdBy: 'u-super' },
  { id: 't-5', orgId: ORG_ID, siteId: 'site-1', title: 'Compaction test — Embankment', assignedTo: ['u-super'], dueDate: addDays(2), priority: 'medium', status: 'todo', createdBy: 'u-mgr' },
  // site-2 (Hinjewadi Flyover)
  { id: 't-6', orgId: ORG_ID, siteId: 'site-2', title: 'Bearing installation — Span 4', assignedTo: ['u-worker'], dueDate: addDays(1), priority: 'high', status: 'in_progress', createdBy: 'u-super' },
  { id: 't-7', orgId: ORG_ID, siteId: 'site-2', title: 'Expansion joint casting', assignedTo: ['u-super'], dueDate: addDays(3), priority: 'medium', status: 'todo', createdBy: 'u-mgr' },
  { id: 't-8', orgId: ORG_ID, siteId: 'site-2', title: 'Crash barrier alignment', assignedTo: ['u-worker'], dueDate: addDays(-1), priority: 'low', status: 'done', createdBy: 'u-super' },
  // site-3 (Nagpur Metro Reach 4)
  { id: 't-9', orgId: ORG_ID, siteId: 'site-3', title: 'Pier cap reinforcement', assignedTo: ['u-super'], dueDate: addDays(2), priority: 'critical', status: 'blocked', blockedReason: 'Drawing revision pending', createdBy: 'u-mgr' },
  { id: 't-10', orgId: ORG_ID, siteId: 'site-3', title: 'Segment erection — P22', assignedTo: ['u-worker'], dueDate: addDays(4), priority: 'high', status: 'todo', createdBy: 'u-super' },
  // site-5 (Coastal Spur North)
  { id: 't-11', orgId: ORG_ID, siteId: 'site-5', title: 'Sea-wall survey', assignedTo: ['u-super'], dueDate: addDays(5), priority: 'medium', status: 'in_progress', createdBy: 'u-mgr' },
  { id: 't-12', orgId: ORG_ID, siteId: 'site-5', title: 'Reclamation level check', assignedTo: ['u-worker'], dueDate: addDays(1), priority: 'low', status: 'todo', createdBy: 'u-super' },
]

export const progressLogs: ProgressLog[] = [
  { id: 'pl-1', orgId: ORG_ID, siteId: 'site-1', date: today, weather: 'Clear, 31°C', workSummary: 'Pier P12 foundation pour completed up to plinth level; curing started.', tasksCompleted: 'Foundation pour, formwork P12', issues: 'Concrete delivery delayed 40 min', remarks: 'Night shift to continue curing checks.', photos: [], authorId: 'u-super', authorName: 'Suresh Kale', createdAt: `${today}T12:30:00Z` },
  { id: 'pl-2', orgId: ORG_ID, siteId: 'site-1', date: addDays(-1).slice(0, 10), weather: 'Cloudy, 28°C', workSummary: 'Rebar tying for deck slab; shuttering checks on P10.', tasksCompleted: 'Rebar tying 60%', issues: 'Crane breakdown — 2 hrs lost', remarks: 'Crane vendor notified.', photos: [], authorId: 'u-super', authorName: 'Suresh Kale', createdAt: `${addDays(-1).slice(0, 10)}T13:00:00Z` },
  { id: 'pl-3', orgId: ORG_ID, siteId: 'site-2', date: today, weather: 'Humid, 33°C', workSummary: 'Span 4 bearing installation in progress.', tasksCompleted: 'Bearing pedestal prep', issues: 'None', remarks: 'On schedule.', photos: [], authorId: 'u-super', authorName: 'Suresh Kale', createdAt: `${today}T11:00:00Z` },
]

// Worker's attendance: checked in this morning, not yet out.
export const myAttendance: AttendanceLog[] = Array.from({ length: 8 }).map((_, i) => {
  const d = new Date(Date.now() - i * 86_400_000)
  const iso = d.toISOString().slice(0, 10)
  return {
    id: `att-${i}`,
    orgId: ORG_ID,
    userId: 'u-worker',
    siteId: 'site-1',
    checkIn: `${iso}T03:35:00Z`,
    checkOut: i === 0 ? undefined : `${iso}T12:10:00Z`,
    gpsStatus: i % 4 === 0 ? 'manual' : 'ok',
    workedHours: i === 0 ? undefined : 8.5,
  }
})

export const projectHealth: ProjectHealthRow[] = [
  { id: 'proj-1', name: 'Pune Ring Road', percentComplete: 72, status: 'on_track' },
  { id: 'proj-2', name: 'Nagpur Metro Reach 4', percentComplete: 41, status: 'at_risk' },
  { id: 'proj-3', name: 'Mumbai Coastal Spur', percentComplete: 23, status: 'delayed' },
]

// slaDueAt = createdAt + 48h. g-1 was raised >48h ago and is unresolved → breaching/escalated.
export const grievances: Grievance[] = [
  {
    id: 'g-1', orgId: ORG_ID, siteId: 'site-1', title: 'Unsafe scaffolding at P12',
    description: 'Scaffolding on Pier P12 is missing guard rails on the east face; workers exposed to a fall risk at height.',
    category: 'safety', priority: 'urgent', status: 'escalated', raisedBy: 'u-worker', raisedByName: 'Ramesh Patil',
    anonymous: false, assignedTo: 'u-super', taggedUsers: ['u-super'], cc: ['u-mgr'], photos: [],
    slaDueAt: addDays(-1), slaBreaching: true,
    comments: [{ id: 'gc-1', authorId: 'u-super', authorName: 'Suresh Kale', body: 'Acknowledged — flagging to safety officer.', createdAt: addDays(-2) }],
    createdAt: addDays(-3), updatedAt: addDays(-1),
  },
  {
    id: 'g-2', orgId: ORG_ID, siteId: 'site-1', title: 'Delayed wage disbursement',
    description: 'Last week’s wages have not been credited for the night-shift crew; multiple workers affected.',
    category: 'payment', priority: 'high', status: 'in_progress', raisedBy: 'u-worker', raisedByName: 'Ramesh Patil',
    anonymous: false, assignedTo: 'u-super', taggedUsers: [], cc: ['u-mgr'], photos: [],
    slaDueAt: addDays(1), slaBreaching: false, comments: [], createdAt: `${today}T05:00:00Z`, updatedAt: `${today}T05:00:00Z`,
  },
  {
    id: 'g-3', orgId: ORG_ID, siteId: 'site-1', title: 'Drinking water shortage',
    description: 'Potable water tanker has not arrived for two days; crew relying on bottled water bought privately.',
    category: 'work_condition', priority: 'medium', status: 'open', raisedBy: 'u-worker', raisedByName: 'Ramesh Patil',
    anonymous: true, taggedUsers: [], cc: [], photos: [],
    slaDueAt: addDays(2), slaBreaching: false, comments: [], createdAt: `${today}T04:30:00Z`, updatedAt: `${today}T04:30:00Z`,
  },
  {
    id: 'g-4', orgId: ORG_ID, siteId: 'site-1', title: 'PPE kits not replenished',
    description: 'Helmets and high-vis vests are out of stock at the site store; new joiners working without PPE.',
    category: 'safety', priority: 'high', status: 'open', raisedBy: 'u-worker', raisedByName: 'Ramesh Patil',
    anonymous: false, assignedTo: 'u-super', taggedUsers: [], cc: [], photos: [],
    slaDueAt: addDays(-1), slaBreaching: true, comments: [], createdAt: addDays(-3), updatedAt: addDays(-3),
  },
]

export const notifications: Notification[] = [
  { id: 'n-1', orgId: ORG_ID, type: 'grievance', title: 'Grievance escalated', body: 'Unsafe scaffolding at P12 breached SLA.', read: false, createdAt: `${today}T06:12:00Z` },
  { id: 'n-2', orgId: ORG_ID, type: 'task', title: 'New critical task', body: 'Rebar inspection — Deck slab assigned to you.', read: false, createdAt: `${today}T05:40:00Z` },
  { id: 'n-3', orgId: ORG_ID, type: 'attendance', title: 'Check-in reminder', body: 'You checked in at 9:05 AM at Pune Ring Road.', read: true, createdAt: `${today}T03:35:00Z` },
]

export const leaveRequests: LeaveRequest[] = [
  { id: 'lv-1', orgId: ORG_ID, userId: 'u-worker', userName: 'Ramesh Patil', type: 'casual', startDate: addDays(3).slice(0, 10), endDate: addDays(4).slice(0, 10), days: 2, reason: 'Family function out of town.', status: 'pending', createdAt: `${today}T07:00:00Z`, updatedAt: `${today}T07:00:00Z` },
  { id: 'lv-2', orgId: ORG_ID, userId: 'u-worker', userName: 'Ramesh Patil', type: 'sick', startDate: addDays(-6).slice(0, 10), endDate: addDays(-5).slice(0, 10), days: 2, reason: 'Fever, advised rest.', status: 'approved', decidedBy: 'u-super', decidedByName: 'Suresh Kale', decisionComment: 'Get well soon.', createdAt: addDays(-7), updatedAt: addDays(-6) },
  { id: 'lv-3', orgId: ORG_ID, userId: 'u-worker', userName: 'Ramesh Patil', type: 'unpaid', startDate: addDays(-12).slice(0, 10), endDate: addDays(-12).slice(0, 10), days: 1, reason: 'Personal work.', status: 'rejected', decidedBy: 'u-super', decidedByName: 'Suresh Kale', decisionComment: 'Critical pour scheduled that day.', createdAt: addDays(-14), updatedAt: addDays(-13) },
]

// Per-user annual entitlements (Business Admin configures these later).
export const leaveBalances: Record<string, LeaveBalance[]> = {
  'u-worker': [
    { type: 'casual', entitled: 12, used: 3 },
    { type: 'sick', entitled: 8, used: 2 },
    { type: 'unpaid', entitled: 0, used: 1 },
  ],
}
