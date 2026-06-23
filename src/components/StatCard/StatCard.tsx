import { type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/Card/Card'
import styles from './StatCard.module.css'

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  /** Signed delta percent; renders a green up / red down chip. */
  deltaPct?: number
  sub?: string
  className?: string
}

export function StatCard({ label, value, icon, deltaPct, sub, className }: StatCardProps) {
  const up = (deltaPct ?? 0) >= 0
  return (
    <Card padding="md" className={cn(styles.stat, className)}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.foot}>
        {deltaPct !== undefined && (
          <span className={cn(styles.delta, up ? styles.up : styles.down)}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(deltaPct)}%
          </span>
        )}
        {sub && <span className={styles.sub}>{sub}</span>}
      </div>
    </Card>
  )
}
