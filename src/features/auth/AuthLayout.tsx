import { type ReactNode } from 'react'
import { Logo } from '@/features/shell/Logo'
import styles from './AuthLayout.module.css'

// Two-pane auth shell: cream brand hero (SCR-01) + form panel. On mobile the
// hero collapses to a compact header band above the form.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <aside className={styles.hero}>
        <div className={styles.heroInner}>
          <Logo className={styles.logo} />
          <h1 className={styles.tagline}>
            Build Smarter.
            <br />
            Manage Better.
          </h1>
          <p className={styles.blurb}>
            One platform for attendance, sites, tasks, reports and grievances —
            across every project, in real time.
          </p>
        </div>
      </aside>
      <main className={styles.panel}>
        <div className={styles.form}>{children}</div>
      </main>
    </div>
  )
}
