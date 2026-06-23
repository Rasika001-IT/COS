import { Link } from 'react-router-dom'
import { CheckSquare, FileText, MessageSquareWarning, Clock, ChevronRight, AlertTriangle } from 'lucide-react'
import { useCurrentUser } from '@/app/hooks'
import { useShellContext } from '@/features/shell/shellContext'
import { useMyTasksQuery } from '@/api/tasksApi'
import { useSitesQuery } from '@/api/sitesApi'
import { useGrievancesQuery } from '@/api/grievancesApi'
import { greeting, initials } from '@/lib/format'
import { CheckInCard } from '@/features/attendance/CheckInCard'
import { TaskCard } from '@/components/TaskCard/TaskCard'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './WorkerHome.module.css'

const QUICK = [
  { to: '/attendance', label: 'Attendance', icon: Clock },
  { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/grievances', label: 'Raise Issue', icon: MessageSquareWarning },
]

export function WorkerHome() {
  const user = useCurrentUser()
  const { siteId } = useShellContext()
  const { data: tasks, isLoading: tasksLoading } = useMyTasksQuery({ due: 'today' })
  const { data: sites = [] } = useSitesQuery()
  const { data: grievances } = useGrievancesQuery({ status: 'open_all', limit: 5 })

  const firstName = user?.name.split(' ')[0] ?? ''
  const breaching = grievances?.data.find((g) => g.slaBreaching)
  const siteName = (id: string) => sites.find((s) => s.id === id)?.name

  return (
    <div className={styles.page}>
      <header className={styles.greet}>
        <div>
          <p className={styles.hello}>{greeting()},</p>
          <h1 className={styles.name}>{firstName} 👋</h1>
        </div>
        <span className={styles.avatar} aria-hidden>
          {initials(user?.name ?? '')}
        </span>
      </header>

      {breaching && (
        <Link to="/grievances" className={styles.alert}>
          <AlertTriangle size={18} />
          <span className={styles.alertText}>
            <strong>{breaching.title}</strong> is breaching SLA — needs attention.
          </span>
          <ChevronRight size={18} />
        </Link>
      )}

      <CheckInCard siteId={siteId} />

      <section className={styles.quick}>
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className={styles.quickTile}>
            <span className={styles.quickIcon}>
              <q.icon size={20} />
            </span>
            <span className={styles.quickLabel}>{q.label}</span>
          </Link>
        ))}
      </section>

      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Today's tasks</h2>
          {tasks && <span className={styles.count}>{tasks.length}</span>}
        </div>

        {tasksLoading ? (
          <div className={styles.list}>
            <Skeleton height={58} radius={14} />
            <Skeleton height={58} radius={14} />
            <Skeleton height={58} radius={14} />
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className={styles.list}>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} siteName={siteName(t.siteId)} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No tasks due today. Nice work.</p>
        )}
      </section>
    </div>
  )
}
