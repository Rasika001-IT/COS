import { CheckCircle2, Circle, MapPinned } from 'lucide-react'
import { useCurrentUser } from '@/app/hooks'
import { useShellContext } from '@/features/shell/shellContext'
import { useMyAttendanceQuery, useTodayLiveQuery } from '@/api/attendanceApi'
import { useSitesQuery } from '@/api/sitesApi'
import { formatDayMonth, formatDuration, formatTime, todayISODate } from '@/lib/format'
import { CheckInCard } from './CheckInCard'
import { Card } from '@/components/Card/Card'
import { StatusPill, type Tone } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import type { GpsStatus } from '@/types'
import styles from './AttendanceScreen.module.css'

const GPS: Record<GpsStatus, { tone: Tone; label: string }> = {
  ok: { tone: 'success', label: 'GPS' },
  manual: { tone: 'warning', label: 'Manual' },
  unavailable: { tone: 'neutral', label: 'No GPS' },
}

export function AttendanceScreen() {
  const user = useCurrentUser()
  const { siteId } = useShellContext()
  const month = todayISODate().slice(0, 7)
  const { data: logs, isLoading } = useMyAttendanceQuery({ month })
  const { data: sites = [] } = useSitesQuery()
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'manager'

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Attendance</h1>
        <p className={styles.sub}>Check in at your site and review your history.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.col}>
          <CheckInCard siteId={siteId} />
          {isSupervisor && <SupervisorLive siteId={siteId ?? sites[0]?.id} />}
        </div>

        <Card padding="none" className={styles.history}>
          <div className={styles.historyHead}>
            <h2 className={styles.historyTitle}>My attendance · this month</h2>
          </div>
          {isLoading ? (
            <div className={styles.rows}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={44} />
              ))}
            </div>
          ) : (
            <ul className={styles.rows}>
              {(logs ?? []).map((l) => {
                const gps = GPS[l.gpsStatus]
                return (
                  <li key={l.id} className={styles.row}>
                    <div className={styles.date}>{formatDayMonth(l.checkIn)}</div>
                    <div className={styles.times}>
                      {formatTime(l.checkIn)}
                      {l.checkOut ? ` – ${formatTime(l.checkOut)}` : ' · open'}
                    </div>
                    <StatusPill tone={gps.tone}>{gps.label}</StatusPill>
                    <div className={styles.hours}>
                      {l.workedHours !== undefined ? formatDuration(l.workedHours) : '—'}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function SupervisorLive({ siteId }: { siteId?: string }) {
  const { data, isLoading } = useTodayLiveQuery(siteId ? { siteId } : { siteId: '' }, { skip: !siteId })

  return (
    <Card padding="md" className={styles.live}>
      <div className={styles.liveHead}>
        <MapPinned size={18} className={styles.liveIcon} />
        <h2 className={styles.historyTitle}>Live at site · today</h2>
      </div>
      {isLoading ? (
        <Skeleton height={80} />
      ) : (
        <div className={styles.liveGrid}>
          <div>
            <div className={styles.liveCount}>{data?.checkedIn.length ?? 0}</div>
            <div className={styles.liveLabel}>Checked in</div>
            <ul className={styles.peopleList}>
              {(data?.checkedIn ?? []).map((a) => (
                <li key={a.id} className={styles.person}>
                  <CheckCircle2 size={15} className={styles.in} />
                  <Avatar name={a.userId} size={22} />
                  <span>{a.userId}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className={styles.liveCount}>{data?.notCheckedIn.length ?? 0}</div>
            <div className={styles.liveLabel}>Not in</div>
            <ul className={styles.peopleList}>
              {(data?.notCheckedIn ?? []).map((p) => (
                <li key={p.id} className={styles.person}>
                  <Circle size={15} className={styles.out} />
                  <Avatar name={p.name} size={22} />
                  <span>{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}
