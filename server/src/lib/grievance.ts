// Pure grievance helpers (mirror the frontend features/grievances/derive.ts).
export const SLA_HOURS = 48
const CLOSED = ['resolved', 'closed', 'rejected']
const NAME_VISIBLE_ROLES = ['admin', 'superadmin']

export function dueDateFrom(createdAtIso: string): string {
  return new Date(Date.parse(createdAtIso) + SLA_HOURS * 3_600_000).toISOString()
}

export function slaState(g: { slaDueAt: string; status: string }, now: number): { breaching: boolean; hoursLeft: number } {
  const hoursLeft = Math.round((Date.parse(g.slaDueAt) - now) / 3_600_000)
  const breaching = !CLOSED.includes(g.status) && now > Date.parse(g.slaDueAt)
  return { breaching, hoursLeft }
}

// Mask the raiser name for non-admin viewers when anonymous (HLD §5a — visible to
// Business Admin only).
export function maskedName(anonymous: boolean, raisedByName: string, viewerRole: string): string {
  return anonymous && !NAME_VISIBLE_ROLES.includes(viewerRole) ? 'Anonymous' : raisedByName
}
