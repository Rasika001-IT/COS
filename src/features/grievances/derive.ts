import type { Grievance, GrievanceStatus, Role } from '@/types'

// Pure grievance derivation — shared by the MSW handler and the SLA badge, unit-
// tested in isolation. `now` is injected for deterministic tests.

export const SLA_HOURS = 48 // HLD default; configurable later via Business Admin.

// Statuses that stop the SLA clock.
const CLOSED_STATES: GrievanceStatus[] = ['resolved', 'closed', 'rejected']

export interface SlaState {
  breaching: boolean
  hoursLeft: number // negative = overdue
}

export function slaState(g: Pick<Grievance, 'slaDueAt' | 'status'>, now: number): SlaState {
  const hoursLeft = Math.round((Date.parse(g.slaDueAt) - now) / 3_600_000)
  const breaching = !CLOSED_STATES.includes(g.status) && now > Date.parse(g.slaDueAt)
  return { breaching, hoursLeft }
}

// Roles allowed to see a real name behind an anonymous grievance (HLD: Business
// Admin only — Super Admin inherits platform-wide visibility).
const NAME_VISIBLE_ROLES: Role[] = ['admin', 'superadmin']

export function maskRaiser<T extends Pick<Grievance, 'anonymous' | 'raisedByName'>>(
  g: T,
  viewerRole: Role,
): T {
  if (g.anonymous && !NAME_VISIBLE_ROLES.includes(viewerRole)) {
    return { ...g, raisedByName: 'Anonymous' }
  }
  return g
}

export function dueDateFrom(createdAtIso: string): string {
  return new Date(Date.parse(createdAtIso) + SLA_HOURS * 3_600_000).toISOString()
}
