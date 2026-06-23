import { AlarmClock, AlertTriangle } from 'lucide-react'
import type { Grievance } from '@/types'
import { slaState } from './derive'
import { StatusPill } from '@/components/StatusPill/StatusPill'

// SLA badge: breach (danger), running clock (warning under 12h, else neutral),
// or nothing once the grievance is closed out.
export function SlaBadge({ grievance }: { grievance: Grievance }) {
  if (['resolved', 'closed', 'rejected'].includes(grievance.status)) return null
  const { breaching, hoursLeft } = slaState(grievance, Date.now())
  if (breaching) {
    return (
      <StatusPill tone="danger">
        <AlertTriangle size={12} /> SLA breached
      </StatusPill>
    )
  }
  return (
    <StatusPill tone={hoursLeft < 12 ? 'warning' : 'neutral'}>
      <AlarmClock size={12} /> {hoursLeft}h left
    </StatusPill>
  )
}
