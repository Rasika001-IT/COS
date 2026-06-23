import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, CalendarClock } from 'lucide-react'
import { useProjectsQuery } from '@/api/projectsApi'
import { projectStatus } from '@/lib/status'
import { formatINRCompact, daysRemainingLabel, formatDayMonth } from '@/lib/format'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { ProgressBar } from '@/components/ProgressBar/ProgressBar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { NewProjectModal } from './NewProjectModal'
import styles from './ProjectsScreen.module.css'

export function ProjectsScreen() {
  const { data: projects, isLoading } = useProjectsQuery()
  const [newOpen, setNewOpen] = useState(false)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.sub}>Active projects across your organisation.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus size={16} /> New project
        </Button>
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={180} radius={16} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {(projects ?? []).map((p) => {
            const st = projectStatus[p.status]
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className={styles.cardLink}>
                <Card padding="md" className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <h2 className={styles.name}>{p.name}</h2>
                      <span className={styles.client}>{p.clientName}</span>
                    </div>
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  </div>

                  <div className={styles.progress}>
                    <div className={styles.progressTop}>
                      <span>{p.taskDone}/{p.taskTotal} tasks</span>
                      <span className={styles.pct}>{p.percentComplete}%</span>
                    </div>
                    <ProgressBar value={p.percentComplete} />
                  </div>

                  <div className={styles.foot}>
                    <span className={styles.footItem}>
                      <MapPin size={13} /> {p.siteCount} sites
                    </span>
                    <span className={styles.footItem}>
                      <CalendarClock size={13} /> {daysRemainingLabel(p.daysRemaining)}
                    </span>
                    <span className={styles.value}>{formatINRCompact(p.contractValue)}</span>
                  </div>
                  {p.lastActivity && <span className={styles.activity}>Last activity {formatDayMonth(p.lastActivity)}</span>}
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
