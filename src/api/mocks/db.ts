// Shared in-memory mock store. Mutable copies of the seed so check-in/out, task
// updates, admin edits, etc. persist for the session across all handler files.
import * as seed from './seed'
import { masterData, reportConfigs } from './reportsSeed'

export const db = {
  org: structuredClone(seed.org), // the currently-active tenant (swapped on impersonation)
  orgs: structuredClone(seed.orgs), // platform registry (Super Admin)
  users: structuredClone(seed.users),
  sites: structuredClone(seed.sites),
  projects: structuredClone(seed.projects),
  tasks: structuredClone(seed.tasks),
  attendance: structuredClone(seed.myAttendance),
  grievances: structuredClone(seed.grievances),
  notifications: structuredClone(seed.notifications),
  progressLogs: structuredClone(seed.progressLogs),
  leaveRequests: structuredClone(seed.leaveRequests),
  leaveBalances: structuredClone(seed.leaveBalances),
  // Editable by Business Admin (Master Data + Report Config).
  masterData: structuredClone(masterData),
  reportConfigs: structuredClone(reportConfigs),
  invites: [] as import('@/types').Invite[],
  platformActivity: [] as import('@/types').PlatformActivity[],
}
