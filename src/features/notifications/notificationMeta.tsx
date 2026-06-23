import { CheckSquare, MessageSquareWarning, CalendarOff, Clock, Bell } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Notification, NotificationType } from '@/types'
import type { Tone } from '@/components/StatusPill/StatusPill'

// Per-type icon + tone + destination route. Shared by the bell and the full
// notifications screen. `route` is the type→source fallback when a notification
// has no precise `link`.
interface Meta {
  icon: ComponentType<{ size?: number | string }>
  tone: Tone
  route: string | null
}

export const notificationMeta: Record<NotificationType, Meta> = {
  task: { icon: CheckSquare, tone: 'info', route: '/tasks' },
  grievance: { icon: MessageSquareWarning, tone: 'danger', route: '/grievances' },
  leave: { icon: CalendarOff, tone: 'warning', route: '/leave' },
  attendance: { icon: Clock, tone: 'success', route: '/attendance' },
  system: { icon: Bell, tone: 'neutral', route: null },
}

// Where a notification leads (precise link wins over the type fallback).
export function notificationTarget(n: Notification): string | null {
  return n.link ?? notificationMeta[n.type].route
}
