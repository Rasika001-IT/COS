// Plan → enabled modules (HLD §3.3) + orgCode generator. Ported from the frontend
// src/lib/plans.ts so onboarding produces the same shapes.
export const ALL_MODULES = ['attendance', 'leave', 'reports', 'dashboard', 'notifications', 'projects', 'tasks', 'grievances']

export const PLAN_MODULES: Record<string, string[]> = {
  free: ['attendance', 'leave', 'reports', 'dashboard', 'notifications'],
  standard: ['attendance', 'leave', 'reports', 'dashboard', 'notifications', 'projects', 'tasks'],
  pro: [...ALL_MODULES],
}

// Next sequential orgCode like "ASSI-001" from a business name + existing codes.
export function nextOrgCode(name: string, existing: string[]): string {
  const prefix = (name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'ORG').padEnd(3, 'X')
  const used = existing.filter((c) => c?.startsWith(prefix + '-')).map((c) => Number(c.split('-')[1]) || 0)
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}
