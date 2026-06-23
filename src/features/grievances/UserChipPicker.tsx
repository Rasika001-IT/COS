import type { User } from '@/types'
import { cn } from '@/lib/cn'
import styles from './UserChipPicker.module.css'

// Lightweight multi-select over org users — toggleable chips for Tag/CC. Local to
// the grievance form (not a global primitive).
export function UserChipPicker({
  label,
  users,
  value,
  onChange,
  excludeId,
}: {
  label: string
  users: User[]
  value: string[]
  onChange: (ids: string[]) => void
  excludeId?: string
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <div className={styles.chips}>
        {users
          .filter((u) => u.id !== excludeId)
          .map((u) => (
            <button
              key={u.id}
              type="button"
              className={cn(styles.chip, value.includes(u.id) && styles.active)}
              onClick={() => toggle(u.id)}
            >
              {u.name}
            </button>
          ))}
      </div>
    </div>
  )
}
