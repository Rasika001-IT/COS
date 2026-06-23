import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, ChevronRight, UserX } from 'lucide-react'
import type { GrievanceStatus } from '@/types'
import { useGrievancesQuery } from '@/api/grievancesApi'
import { useSitesQuery } from '@/api/sitesApi'
import { grievanceStatus, grievancePriority, grievanceCategory } from '@/lib/status'
import { formatDayMonth } from '@/lib/format'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import { SlaBadge } from './SlaBadge'
import { RaiseGrievanceModal } from './RaiseGrievanceModal'
import styles from './GrievancesScreen.module.css'

type Filter = { label: string; status?: GrievanceStatus | 'open_all' }
const FILTERS: Filter[] = [
  { label: 'All' },
  { label: 'Open', status: 'open_all' },
  { label: 'Escalated', status: 'escalated' },
  { label: 'Resolved', status: 'resolved' },
]

export function GrievancesScreen() {
  const [filter, setFilter] = useState(0)
  const [mine, setMine] = useState(false)
  const [raiseOpen, setRaiseOpen] = useState(false)
  const { data, isLoading } = useGrievancesQuery({ status: FILTERS[filter].status, mine })
  const { data: sites = [] } = useSitesQuery()

  const siteName = (id: string) => sites.find((s) => s.id === id)?.name ?? id

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Grievances</h1>
          <p className={styles.sub}>Raise and track site issues with full audit trail.</p>
        </div>
        <Button onClick={() => setRaiseOpen(true)}>
          <Plus size={16} /> Raise grievance
        </Button>
      </header>

      <div className={styles.filters}>
        <div className={styles.chips}>
          {FILTERS.map((f, i) => (
            <button key={f.label} className={cn(styles.chip, filter === i && styles.chipActive)} onClick={() => setFilter(i)}>
              {f.label}
            </button>
          ))}
        </div>
        <button className={cn(styles.mine, mine && styles.mineActive)} onClick={() => setMine((m) => !m)}>
          Raised by me
        </button>
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={92} radius={14} />
          ))}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <p className={styles.empty}>No grievances match this filter.</p>
      ) : (
        <div className={styles.list}>
          {data!.data.map((g) => {
            const st = grievanceStatus[g.status]
            const pr = grievancePriority[g.priority]
            return (
              <Link key={g.id} to={`/grievances/${g.id}`} className={styles.cardLink}>
                <Card padding="md" mobile className={styles.card}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>{g.title}</span>
                      <ChevronRight size={18} className={styles.chev} />
                    </div>
                    <div className={styles.pills}>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      <StatusPill tone={pr.tone} dot>
                        {pr.label}
                      </StatusPill>
                      <span className={styles.category}>{grievanceCategory[g.category]}</span>
                      <SlaBadge grievance={g} />
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.meta}>
                        {g.anonymous ? (
                          <>
                            <UserX size={13} /> Anonymous
                          </>
                        ) : (
                          g.raisedByName
                        )}
                      </span>
                      <span className={styles.meta}>
                        <MapPin size={13} /> {siteName(g.siteId)}
                      </span>
                      <span className={styles.meta}>{formatDayMonth(g.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <RaiseGrievanceModal open={raiseOpen} onClose={() => setRaiseOpen(false)} />
    </div>
  )
}
