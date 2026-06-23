import { useMemo } from 'react'
import type { AttendanceLog, LeaveRequest } from '@/types'
import { cn } from '@/lib/cn'
import styles from './LeaveCalendar.module.css'

type DayState = 'present' | 'absent' | 'half' | 'leave' | 'none' | 'future'

// Month grid coloured per HLD §2a: green present / red absent / yellow half-day /
// grey leave. Sundays + future days are neutral.
export function LeaveCalendar({
  month,
  logs,
  leave,
}: {
  month: string // YYYY-MM
  logs: AttendanceLog[]
  leave: LeaveRequest[]
}) {
  const { weeks, label } = useMemo(() => buildMonth(month, logs, leave), [month, logs, leave])
  return (
    <div className={styles.cal}>
      <div className={styles.monthLabel}>{label}</div>
      <div className={styles.dow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className={styles.grid}>
        {weeks.flat().map((cell, i) =>
          cell ? (
            <span key={i} className={cn(styles.day, styles[cell.state])} title={cell.title}>
              {cell.date}
            </span>
          ) : (
            <span key={i} className={styles.empty} />
          ),
        )}
      </div>
      <div className={styles.legend}>
        <Legend cls="present" label="Present" />
        <Legend cls="absent" label="Absent" />
        <Legend cls="leave" label="Leave" />
        <Legend cls="half" label="Half-day" />
      </div>
    </div>
  )
}

function Legend({ cls, label }: { cls: DayState; label: string }) {
  return (
    <span className={styles.legendItem}>
      <span className={cn(styles.swatch, styles[cls])} /> {label}
    </span>
  )
}

function buildMonth(month: string, logs: AttendanceLog[], leave: LeaveRequest[]) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const todayIso = new Date().toISOString().slice(0, 10)

  const presentDates = new Set(logs.map((l) => l.checkIn.slice(0, 10)))
  const leaveDates = new Set<string>()
  leave
    .filter((l) => l.status === 'approved')
    .forEach((l) => {
      const s = new Date(l.startDate.slice(0, 10)).getTime()
      const e = new Date(l.endDate.slice(0, 10)).getTime()
      for (let t = s; t <= e; t += 86_400_000) leaveDates.add(new Date(t).toISOString().slice(0, 10))
    })

  const cells: ({ date: number; state: DayState; title: string } | null)[] = []
  for (let i = 0; i < first.getUTCDay(); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    let state: DayState = 'none'
    if (iso > todayIso || dow === 0) state = 'future'
    else if (leaveDates.has(iso)) state = 'leave'
    else if (presentDates.has(iso)) state = 'present'
    else state = 'absent'
    cells.push({ date: d, state, title: `${iso}: ${state}` })
  }
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { weeks, label }
}
