import { cn } from '@/lib/cn'
import { initials as toInitials } from '@/lib/format'
import styles from './Avatar.module.css'

export interface AvatarProps {
  name: string
  src?: string
  size?: number
  square?: boolean
  className?: string
}

export function Avatar({ name, src, size = 40, square = false, className }: AvatarProps) {
  return (
    <span
      className={cn(styles.avatar, square && styles.square, className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-label={name}
    >
      {src ? <img src={src} alt={name} className={styles.img} /> : toInitials(name)}
    </span>
  )
}
