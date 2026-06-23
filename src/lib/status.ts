import type { Tone } from '@/components/StatusPill/StatusPill'
import type {
  GrievanceCategory,
  GrievancePriority,
  GrievanceStatus,
  LeaveStatus,
  LeaveType,
  ProjectHealth,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@/types'

// Domain status → display tone + label. Keeps the semantic palette mapping in
// one place so pills stay consistent across screens.

export const taskStatus: Record<TaskStatus, { tone: Tone; label: string }> = {
  todo: { tone: 'neutral', label: 'To Do' },
  in_progress: { tone: 'info', label: 'In Progress' },
  blocked: { tone: 'danger', label: 'Blocked' },
  done: { tone: 'success', label: 'Done' },
}

export const projectHealth: Record<ProjectHealth, { tone: Tone; label: string }> = {
  on_track: { tone: 'success', label: 'On track' },
  at_risk: { tone: 'warning', label: 'At risk' },
  delayed: { tone: 'danger', label: 'Delayed' },
}

export const grievanceStatus: Record<GrievanceStatus, { tone: Tone; label: string }> = {
  open: { tone: 'neutral', label: 'Open' },
  assigned: { tone: 'info', label: 'Assigned' },
  in_progress: { tone: 'info', label: 'In Progress' },
  escalated: { tone: 'danger', label: 'Escalated' },
  resolved: { tone: 'success', label: 'Resolved' },
  closed: { tone: 'neutral', label: 'Closed' },
  rejected: { tone: 'warning', label: 'Rejected' },
}

export const grievancePriority: Record<GrievancePriority, { tone: Tone; label: string }> = {
  low: { tone: 'neutral', label: 'Low' },
  medium: { tone: 'info', label: 'Medium' },
  high: { tone: 'warning', label: 'High' },
  urgent: { tone: 'danger', label: 'Urgent' },
}

export const leaveStatus: Record<LeaveStatus, { tone: Tone; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
}

export const leaveType: Record<LeaveType, string> = {
  casual: 'Casual',
  sick: 'Sick',
  unpaid: 'Unpaid',
}

export const grievanceCategory: Record<GrievanceCategory, string> = {
  safety: 'Safety Hazard',
  work_condition: 'Work Condition',
  payment: 'Payment Issue',
  equipment: 'Equipment',
  interpersonal: 'Interpersonal',
  other: 'Other',
}

// Statuses considered "open" (not yet closed out) for queues/filters.
export const GRIEVANCE_OPEN_STATES: GrievanceStatus[] = ['open', 'assigned', 'in_progress', 'escalated']

export const projectStatus: Record<ProjectStatus, { tone: Tone; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  on_hold: { tone: 'warning', label: 'On Hold' },
  completed: { tone: 'info', label: 'Completed' },
}

// The 4 task-board columns, in order.
export const TASK_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

export const priority: Record<TaskPriority, { tone: Tone; label: string }> = {
  low: { tone: 'neutral', label: 'Low' },
  medium: { tone: 'info', label: 'Medium' },
  high: { tone: 'warning', label: 'High' },
  critical: { tone: 'danger', label: 'Critical' },
}
