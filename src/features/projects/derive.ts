import type { ProgressLog, Project, Task, TaskStatus } from '@/types'

// Pure project-rollup derivation — shared by the MSW handler and unit-tested in
// isolation (no jsdom/MSW needed). `now` is injected so tests are deterministic.
const DAY = 86_400_000

export interface ProjectMetrics {
  siteCount: number
  taskTotal: number
  taskDone: number
  percentComplete: number
  daysRemaining: number
  lastActivity?: string
}

export function projectMetrics(
  project: Pick<Project, 'endDate'>,
  siteIds: string[],
  tasks: Pick<Task, 'status' | 'dueDate'>[],
  logs: Pick<ProgressLog, 'createdAt'>[],
  now: number,
): ProjectMetrics {
  const taskDone = tasks.filter((t) => t.status === 'done').length
  const activity = [...logs.map((l) => l.createdAt), ...tasks.map((t) => t.dueDate)].sort()
  return {
    siteCount: siteIds.length,
    taskTotal: tasks.length,
    taskDone,
    percentComplete: tasks.length ? Math.round((taskDone / tasks.length) * 100) : 0,
    daysRemaining: Math.ceil((Date.parse(project.endDate) - now) / DAY),
    lastActivity: activity.length ? activity[activity.length - 1] : undefined,
  }
}

// Bucket tasks into the 4 board columns.
export function groupByStatus(tasks: Pick<Task, 'status'>[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 }
  for (const t of tasks) counts[t.status]++
  return counts
}
