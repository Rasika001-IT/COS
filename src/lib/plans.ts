import type { OrgPlan } from '@/types'

// Plan → enabled modules (HLD §3.3). Plans gate which modules a business can use;
// Super Admin can override per-business. Pure + unit-tested.
export const ALL_MODULES = [
  'attendance',
  'leave',
  'reports',
  'dashboard',
  'notifications',
  'projects',
  'tasks',
  'grievances',
] as const

export const PLAN_MODULES: Record<OrgPlan, string[]> = {
  free: ['attendance', 'leave', 'reports', 'dashboard', 'notifications'],
  standard: ['attendance', 'leave', 'reports', 'dashboard', 'notifications', 'projects', 'tasks'],
  pro: [...ALL_MODULES],
}

export const PLAN_LABEL: Record<OrgPlan, string> = {
  free: 'Free',
  standard: 'Standard',
  pro: 'Pro',
}

// Next sequential orgCode like "ASSI-001" from a business name + existing codes.
export function nextOrgCode(name: string, existing: string[]): string {
  const prefix = (name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'ORG').padEnd(3, 'X')
  const used = existing
    .filter((c) => c?.startsWith(prefix + '-'))
    .map((c) => Number(c.split('-')[1]) || 0)
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}
