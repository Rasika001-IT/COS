import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import styles from './StatusPill.module.css'

// Semantic tone → fg/tint pair (tokens.css). 'neutral' uses the app-bg pill
// (To Do / Open). Map domain statuses to a tone at the call site.
export type Tone = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

export interface StatusPillProps {
  tone?: Tone
  children: ReactNode
  className?: string
  dot?: boolean
}

export function StatusPill({ tone = 'neutral', children, className, dot = false }: StatusPillProps) {
  return (
    <span className={cn(styles.pill, styles[tone], className)}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  )
}
