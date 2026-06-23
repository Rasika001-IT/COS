import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PauseCircle, Plus, LogIn, Activity } from 'lucide-react'
import type { OrgSummary } from '@/types'
import { useOrgsQuery, usePlatformDashboardQuery, useUpdateOrgStatusMutation, useImpersonateMutation } from '@/api/superAdminApi'
import { useToast } from '@/components/Toast/ToastProvider'
import { PLAN_LABEL } from '@/lib/plans'
import { StatCard } from '@/components/StatCard/StatCard'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { Toggle } from '@/components/Toggle/Toggle'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { Table, type Column } from '@/components/Table/Table'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { formatDayMonth, formatTime } from '@/lib/format'
import { OnboardWizard } from './OnboardWizard'
import styles from './SuperAdminScreen.module.css'

export function SuperAdminScreen() {
  const { data: dash } = usePlatformDashboardQuery()
  const { data: orgs, isLoading } = useOrgsQuery()
  const [updateStatus] = useUpdateOrgStatusMutation()
  const [impersonate] = useImpersonateMutation()
  const toast = useToast()
  const navigate = useNavigate()
  const [onboardOpen, setOnboardOpen] = useState(false)

  const setActive = async (org: OrgSummary, isActive: boolean) => {
    try {
      await updateStatus({ id: org.id, isActive }).unwrap()
      toast.success(`${org.name} ${isActive ? 'reactivated' : 'suspended'}.`)
    } catch {
      toast.error('Could not update the business.')
    }
  }

  const startImpersonate = async (org: OrgSummary) => {
    try {
      await impersonate({ id: org.id }).unwrap()
      navigate('/dashboard')
    } catch {
      toast.error('Could not impersonate this business.')
    }
  }

  const columns: Column<OrgSummary>[] = [
    { key: 'code', header: 'Code', render: (o) => <span className={styles.code}>{o.orgCode}</span> },
    { key: 'name', header: 'Business', render: (o) => <span className={styles.bizName}>{o.name}</span> },
    { key: 'plan', header: 'Plan', render: (o) => <StatusPill tone="info">{o.plan ? PLAN_LABEL[o.plan] : '—'}</StatusPill> },
    { key: 'status', header: 'Status', render: (o) => (o.isActive === false ? <StatusPill tone="danger">Suspended</StatusPill> : <StatusPill tone="success">Active</StatusPill>) },
    { key: 'users', header: 'Users', align: 'right', render: (o) => o.userCount },
    { key: 'projects', header: 'Projects', align: 'right', render: (o) => o.projectCount },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) => (
        <span className={styles.actions}>
          <Toggle checked={o.isActive !== false} onChange={(v) => setActive(o, v)} />
          <Button size="sm" variant="secondary" onClick={() => startImpersonate(o)}>
            <LogIn size={14} /> Impersonate
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Platform</h1>
          <p className={styles.sub}>Onboard and manage businesses across the platform.</p>
        </div>
        <Button onClick={() => setOnboardOpen(true)}>
          <Plus size={16} /> Onboard business
        </Button>
      </header>

      <section className={styles.kpis}>
        <StatCard label="Total businesses" value={dash?.totalOrgs ?? '—'} icon={<Building2 size={18} />} />
        <StatCard label="Active" value={dash?.activeOrgs ?? '—'} icon={<CheckCircle2 size={18} />} />
        <StatCard label="Suspended" value={dash?.suspendedOrgs ?? '—'} icon={<PauseCircle size={18} />} />
      </section>

      <Card padding="none">
        <div className={styles.tableHead}>
          <h2 className={styles.tableTitle}>Businesses</h2>
        </div>
        {isLoading ? (
          <div className={styles.loading}>
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : (
          <Table columns={columns} rows={orgs ?? []} rowKey={(o) => o.id} />
        )}
      </Card>

      <Card padding="md">
        <div className={styles.feedHead}>
          <Activity size={16} className={styles.feedIcon} />
          <h2 className={styles.tableTitle}>Platform activity</h2>
        </div>
        {(dash?.activity ?? []).length === 0 ? (
          <p className={styles.empty}>No activity yet — onboard or suspend a business to see events here.</p>
        ) : (
          <ul className={styles.feed}>
            {dash!.activity.map((a) => (
              <li key={a.id} className={styles.feedItem}>
                <span className={styles.feedMsg}>{a.message}</span>
                <span className={styles.feedTime}>
                  {formatDayMonth(a.at)} · {formatTime(a.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <OnboardWizard open={onboardOpen} onClose={() => setOnboardOpen(false)} />
    </div>
  )
}
