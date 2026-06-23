import { MapPin } from 'lucide-react'
import type { Task } from '@/types'
import { taskStatus, priority as priorityMap } from '@/lib/status'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Card } from '@/components/Card/Card'
import { cn } from '@/lib/cn'
import styles from './TaskCard.module.css'

export interface TaskCardProps {
  task: Task
  siteName?: string
  onClick?: () => void
  className?: string
}

export function TaskCard({ task, siteName, onClick, className }: TaskCardProps) {
  const status = taskStatus[task.status]
  const prio = priorityMap[task.priority]
  return (
    <Card mobile padding="sm" className={cn(styles.card, onClick && styles.clickable, className)}>
      <button type="button" className={styles.hit} onClick={onClick} disabled={!onClick}>
        <span className={cn(styles.bar, styles[`prio_${task.priority}`])} aria-hidden />
        <span className={styles.body}>
          <span className={styles.title}>{task.title}</span>
          {siteName && (
            <span className={styles.meta}>
              <MapPin size={13} /> {siteName}
            </span>
          )}
        </span>
        <span className={styles.pills}>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {(task.priority === 'high' || task.priority === 'critical') && (
            <StatusPill tone={prio.tone} dot>
              {prio.label}
            </StatusPill>
          )}
        </span>
      </button>
    </Card>
  )
}
