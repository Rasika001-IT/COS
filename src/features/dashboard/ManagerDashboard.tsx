import { Users, CheckSquare, MessageSquareWarning, FolderKanban } from 'lucide-react'
import { useSummaryQuery, useAttendanceTrendQuery, useProjectHealthQuery } from '@/api/dashboardApi'
import { useGrievancesQuery } from '@/api/grievancesApi'
import { useShellContext } from '@/features/shell/shellContext'
import { projectHealth as healthMap, grievanceStatus, grievancePriority as prioMap } from '@/lib/status'
import { formatDayMonth } from '@/lib/format'
import { StatCard } from '@/components/StatCard/StatCard'
import { Card } from '@/components/Card/Card'
import { ProgressBar } from '@/components/ProgressBar/ProgressBar'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Table, type Column } from '@/components/Table/Table'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import type { Grievance } from '@/types'
import { TrendChart } from './TrendChart'
import styles from './ManagerDashboard.module.css'

export function ManagerDashboard() {
  const { siteId } = useShellContext()
  const { data: summary, isLoading: summaryLoading } = useSummaryQuery(siteId ? { siteId } : undefined)
  const { data: trend } = useAttendanceTrendQuery({ days: 7 })
  const { data: health } = useProjectHealthQuery()
  const { data: grievances } = useGrievancesQuery({ status: 'open_all', limit: 5 })

  const grievanceColumns: Column<Grievance>[] = [
    { key: 'title', header: 'Grievance', render: (g) => <span className={styles.gTitle}>{g.title}</span> },
    { key: 'category', header: 'Category', render: (g) => <span className={styles.muted}>{g.category}</span> },
    {
      key: 'priority',
      header: 'Priority',
      render: (g) => <StatusPill tone={prioMap[g.priority].tone} dot>{prioMap[g.priority].label}</StatusPill>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (g) => <StatusPill tone={grievanceStatus[g.status].tone}>{grievanceStatus[g.status].label}</StatusPill>,
    },
    { key: 'raised', header: 'Raised', align: 'right', render: (g) => <span className={styles.muted}>{formatDayMonth(g.createdAt)}</span> },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>Operations overview across your sites.</p>
        </div>
      </header>

      {/* KPI cards */}
      <section className={styles.kpis}>
        {summaryLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={132} radius={16} />)
        ) : (
          <>
            <StatCard
              label="Attendance Today"
              value={`${summary.attendanceTodayPct}%`}
              icon={<Users size={18} />}
              deltaPct={summary.attendanceDeltaPct}
              sub="vs last week"
            />
            <StatCard
              label="Task Completion"
              value={`${summary.taskCompletionPct}%`}
              icon={<CheckSquare size={18} />}
              sub={`${summary.tasksDone}/${summary.tasksTotal} tasks done`}
            />
            <StatCard
              label="Open Grievances"
              value={summary.openGrievances}
              icon={<MessageSquareWarning size={18} />}
              sub={`${summary.grievancesBreachingSla} breaching SLA`}
            />
            <StatCard
              label="Active Projects"
              value={summary.activeProjects}
              icon={<FolderKanban size={18} />}
              sub={`${summary.siteCount} sites`}
            />
          </>
        )}
      </section>

      {/* Chart + project health */}
      <section className={styles.split}>
        <Card padding="md" className={styles.chartCard}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Attendance trend</h2>
            <span className={styles.muted}>Last 7 days</span>
          </div>
          {trend ? <TrendChart data={trend} /> : <Skeleton height={180} />}
        </Card>

        <Card padding="md" className={styles.healthCard}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Project health</h2>
          </div>
          <ul className={styles.healthList}>
            {(health ?? []).map((p) => {
              const h = healthMap[p.status]
              return (
                <li key={p.id} className={styles.healthRow}>
                  <div className={styles.healthTop}>
                    <span className={styles.healthName}>{p.name}</span>
                    <StatusPill tone={h.tone}>{h.label}</StatusPill>
                  </div>
                  <div className={styles.healthBar}>
                    <ProgressBar
                      value={p.percentComplete}
                      tone={p.status === 'on_track' ? 'success' : p.status === 'at_risk' ? 'warning' : 'danger'}
                    />
                    <span className={styles.healthPct}>{p.percentComplete}%</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      {/* Open grievances */}
      <Card padding="none" className={styles.tableCard}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Open grievances</h2>
        </div>
        <Table
          columns={grievanceColumns}
          rows={grievances?.data ?? []}
          rowKey={(g) => g.id}
          empty="No open grievances."
        />
      </Card>
    </div>
  )
}
