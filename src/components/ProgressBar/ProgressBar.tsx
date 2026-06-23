import { cn } from '@/lib/cn'
import styles from './ProgressBar.module.css'

export interface ProgressBarProps {
  value: number // 0..100
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

export function ProgressBar({ value, tone = 'primary', className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn(styles.track, className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn(styles.fill, styles[tone])} style={{ width: `${clamped}%` }} />
    </div>
  )
}
