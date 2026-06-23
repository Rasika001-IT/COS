import { Hammer } from 'lucide-react'
import styles from './Placeholder.module.css'

// Stand-in for nav destinations whose module isn't built in the vertical slice.
// Keeps the shell's nav complete (matching the frames) without dead links.
export function Placeholder({ title }: { title: string }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <Hammer size={28} />
      </span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>This module is part of the planned V2 surface and lands after the core slice.</p>
    </div>
  )
}
