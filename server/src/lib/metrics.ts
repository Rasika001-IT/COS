const DAY = 86_400_000

// Project rollup — mirrors the frontend features/projects/derive.ts so the manager
// dashboard numbers match what the mock produced.
export function projectMetrics(
  endDate: string,
  siteIds: string[],
  tasks: { status: string; dueDate: string }[],
  logs: { createdAt: string }[],
  now: number,
) {
  const taskDone = tasks.filter((t) => t.status === 'done').length
  const activity = [...logs.map((l) => l.createdAt), ...tasks.map((t) => t.dueDate)].filter(Boolean).sort()
  return {
    siteCount: siteIds.length,
    taskTotal: tasks.length,
    taskDone,
    percentComplete: tasks.length ? Math.round((taskDone / tasks.length) * 100) : 0,
    daysRemaining: endDate ? Math.ceil((Date.parse(endDate) - now) / DAY) : 0,
    lastActivity: activity.length ? activity[activity.length - 1] : undefined,
  }
}

// Health status from completion + schedule (for the project-health widget).
export function healthStatus(percentComplete: number, daysRemaining: number): 'on_track' | 'at_risk' | 'delayed' {
  if (daysRemaining < 0) return 'delayed'
  if (percentComplete < 40) return 'at_risk'
  return 'on_track'
}
