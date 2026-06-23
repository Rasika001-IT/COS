import { useId } from 'react'
import { cn } from '@/lib/cn'
import styles from './Toggle.module.css'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  id?: string
  className?: string
}

export function Toggle({ checked, onChange, label, description, id, className }: ToggleProps) {
  const reactId = useId()
  const toggleId = id ?? reactId
  return (
    <label htmlFor={toggleId} className={cn(styles.row, className)}>
      <span className={styles.text}>
        {label && <span className={styles.label}>{label}</span>}
        {description && <span className={styles.desc}>{description}</span>}
      </span>
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        className={cn(styles.track, checked && styles.on)}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </label>
  )
}
