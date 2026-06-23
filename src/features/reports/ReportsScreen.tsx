import { Link } from 'react-router-dom'
import { Receipt, Truck, Drill, Bomb, Fuel, ClipboardList, History, ChevronRight } from 'lucide-react'
import type { ReportType } from '@/types/reports'
import { useReportConfigsQuery } from '@/api/reportsApi'
import { useCurrentUser } from '@/app/hooks'
import { canGenerate } from './configAccess'
import { Card } from '@/components/Card/Card'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './ReportsScreen.module.css'

const ICONS: Record<ReportType, typeof Receipt> = {
  billing: Receipt,
  dispatch: Truck,
  drilling: Drill,
  blasting: Bomb,
  diesel: Fuel,
  daily_summary: ClipboardList,
}

export function ReportsScreen() {
  const { data: configs, isLoading } = useReportConfigsQuery()
  const user = useCurrentUser()
  const canAudit = user && ['admin', 'manager', 'superadmin'].includes(user.role)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.sub}>Generate site reports and export branded PDFs.</p>
        </div>
        {canAudit && (
          <Link to="/audit-log" className={styles.auditLink}>
            <History size={16} /> Audit log
          </Link>
        )}
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={120} radius={16} />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {(configs ?? []).filter((c) => !user || canGenerate(c, user.role)).map((c) => {
            const Icon = ICONS[c.type]
            return (
              <Link key={c.type} to={`/reports/${c.type}`} className={styles.cardLink}>
                <Card padding="md" className={styles.card}>
                  <span className={styles.icon}>
                    <Icon size={22} />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitle}>{c.label}</span>
                    <span className={styles.cardDesc}>{c.description}</span>
                  </span>
                  <ChevronRight size={18} className={styles.chev} />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
