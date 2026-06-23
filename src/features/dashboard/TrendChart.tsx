import type { AttendanceTrendPoint } from '@/types'
import styles from './TrendChart.module.css'

// Lightweight CSS bar chart (no chart lib for the slice). The tallest bar gets
// the brand orange; the rest use the muted chart-bar token (SCR-Dash).
export function TrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  const max = Math.max(100, ...data.map((d) => d.ratePct))
  const peak = Math.max(...data.map((d) => d.ratePct))

  return (
    <div className={styles.chart}>
      {data.map((d, i) => (
        <div key={i} className={styles.col}>
          <div className={styles.barWrap}>
            <div
              className={d.ratePct === peak ? styles.barActive : styles.bar}
              style={{ height: `${(d.ratePct / max) * 100}%` }}
              title={`${d.ratePct}%`}
            />
          </div>
          <span className={styles.value}>{d.ratePct}</span>
          <span className={styles.label}>{d.day}</span>
        </div>
      ))}
    </div>
  )
}
