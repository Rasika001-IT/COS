import { cn } from '@/lib/cn'
import styles from './Logo.module.css'

// Wordmark — always Oswald (the brand wordmark face), independent of the heading
// token. "OS" carries the brand orange.
export function Logo({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span className={cn(styles.logo, onDark && styles.onDark, className)}>
      <span className={styles.mark} aria-hidden>
        C
      </span>
      <span className={styles.word}>
        CONSTRUCT<span className={styles.os}> OS</span>
      </span>
    </span>
  )
}
