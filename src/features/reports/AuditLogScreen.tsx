import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ActivityLog, ReportType } from '@/types/reports'
import { useActivityLogsQuery } from '@/api/reportsApi'
import { Card } from '@/components/Card/Card'
import { Table, type Column } from '@/components/Table/Table'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Avatar } from '@/components/Avatar/Avatar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import styles from './AuditLogScreen.module.css'

const LABELS: Record<ReportType, string> = {
  billing: 'Billing',
  dispatch: 'Dispatch',
  drilling: 'Drilling',
  blasting: 'Blasting',
  diesel: 'Diesel',
  daily_summary: 'Daily Summary',
}

export function AuditLogScreen() {
  const { data, isLoading } = useActivityLogsQuery({ limit: 50 })

  const columns: Column<ActivityLog>[] = [
    {
      key: 'user',
      header: 'User',
      render: (l) => (
        <span className={styles.user}>
          <Avatar name={l.userName} size={28} />
          {l.userName}
        </span>
      ),
    },
    { key: 'report', header: 'Report', render: (l) => <StatusPill tone="info">{LABELS[l.reportType]}</StatusPill> },
    { key: 'site', header: 'Site', render: (l) => <span className={styles.muted}>{l.siteName}</span> },
    {
      key: 'when',
      header: 'Downloaded',
      align: 'right',
      render: (l) => <span className={styles.muted}>{new Date(l.generatedAt).toLocaleString()}</span>,
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link to="/reports" className={styles.back}>
          <ArrowLeft size={16} /> Reports
        </Link>
        <h1 className={styles.title}>Audit log</h1>
        <p className={styles.sub}>Every PDF download is recorded (US-29).</p>
      </header>

      <Card padding="none">
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : (
          <Table
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(l) => l.id}
            empty="No reports downloaded yet. Generate one from the Reports screen."
          />
        )}
      </Card>
    </div>
  )
}
