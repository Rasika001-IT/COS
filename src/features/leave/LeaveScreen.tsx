import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import type { LeaveRequest } from '@/types'
import { useLeaveRequestsQuery, useLeaveBalanceQuery, useDecideLeaveMutation } from '@/api/leaveApi'
import { useMyAttendanceQuery } from '@/api/attendanceApi'
import { useCurrentUser } from '@/app/hooks'
import { useToast } from '@/components/Toast/ToastProvider'
import { leaveStatus, leaveType } from '@/lib/status'
import { formatDayMonth, todayISODate } from '@/lib/format'
import { Card } from '@/components/Card/Card'
import { Button } from '@/components/Button/Button'
import { StatusPill } from '@/components/StatusPill/StatusPill'
import { ProgressBar } from '@/components/ProgressBar/ProgressBar'
import { Avatar } from '@/components/Avatar/Avatar'
import { Skeleton } from '@/components/Skeleton/Skeleton'
import { cn } from '@/lib/cn'
import { NoteModal } from '@/features/grievances/NoteModal'
import { RequestLeaveModal } from './RequestLeaveModal'
import { LeaveCalendar } from './LeaveCalendar'
import styles from './LeaveScreen.module.css'

export function LeaveScreen() {
  const user = useCurrentUser()
  const isApprover = user && ['supervisor', 'manager', 'admin'].includes(user.role)
  const [view, setView] = useState<'mine' | 'approvals'>(isApprover ? 'approvals' : 'mine')
  const [requestOpen, setRequestOpen] = useState(false)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Leave</h1>
          <p className={styles.sub}>Request leave and track approvals.</p>
        </div>
        <Button onClick={() => setRequestOpen(true)}>
          <Plus size={16} /> Request leave
        </Button>
      </header>

      {isApprover && (
        <div className={styles.tabs}>
          <button className={cn(styles.tab, view === 'approvals' && styles.tabActive)} onClick={() => setView('approvals')}>
            Approvals
          </button>
          <button className={cn(styles.tab, view === 'mine' && styles.tabActive)} onClick={() => setView('mine')}>
            My leave
          </button>
        </div>
      )}

      {view === 'approvals' ? <ApprovalQueue /> : <MyLeave />}

      <RequestLeaveModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  )
}

function MyLeave() {
  const month = todayISODate().slice(0, 7)
  const { data: requests, isLoading } = useLeaveRequestsQuery({ mine: true })
  const { data: balances = [] } = useLeaveBalanceQuery()
  const { data: logs = [] } = useMyAttendanceQuery({ month })

  return (
    <div className={styles.stack}>
      <div className={styles.balances}>
        {balances.map((b) => {
          const remaining = b.entitled - b.used
          return (
            <Card key={b.type} padding="md" className={styles.balCard}>
              <span className={styles.balType}>{leaveType[b.type]}</span>
              <span className={styles.balNum}>
                {b.type === 'unpaid' ? b.used : remaining}
                <span className={styles.balUnit}>{b.type === 'unpaid' ? ' taken' : ` / ${b.entitled} left`}</span>
              </span>
              {b.type !== 'unpaid' && <ProgressBar value={(b.used / Math.max(1, b.entitled)) * 100} tone="warning" />}
            </Card>
          )
        })}
      </div>

      <div className={styles.split}>
        <Card padding="md">
          <LeaveCalendar month={month} logs={logs} leave={requests ?? []} />
        </Card>

        <div className={styles.requests}>
          <h2 className={styles.sectionTitle}>My requests</h2>
          {isLoading ? (
            <Skeleton height={120} radius={14} />
          ) : (requests ?? []).length === 0 ? (
            <p className={styles.empty}>No leave requests yet.</p>
          ) : (
            requests!.map((r) => <RequestCard key={r.id} req={r} />)
          )}
        </div>
      </div>
    </div>
  )
}

function RequestCard({ req }: { req: LeaveRequest }) {
  const st = leaveStatus[req.status]
  return (
    <Card padding="md" mobile className={styles.reqCard}>
      <div className={styles.reqTop}>
        <span className={styles.reqType}>
          {leaveType[req.type]} · {req.days}d
        </span>
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
      </div>
      <span className={styles.reqDates}>
        {formatDayMonth(req.startDate)} – {formatDayMonth(req.endDate)}
      </span>
      <p className={styles.reqReason}>{req.reason}</p>
      {req.decisionComment && (
        <p className={styles.reqDecision}>
          {req.decidedByName}: {req.decisionComment}
        </p>
      )}
    </Card>
  )
}

function ApprovalQueue() {
  const { data: requests, isLoading } = useLeaveRequestsQuery({ status: 'pending' })
  const [decide] = useDecideLeaveMutation()
  const toast = useToast()
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null)

  const approve = async (r: LeaveRequest) => {
    try {
      await decide({ id: r.id, status: 'approved' }).unwrap()
      toast.success('Leave approved.')
    } catch {
      toast.error('Could not approve.')
    }
  }

  if (isLoading) return <Skeleton height={140} radius={14} />
  if ((requests ?? []).length === 0) return <p className={styles.empty}>No pending leave requests.</p>

  return (
    <div className={styles.queue}>
      {requests!.map((r) => (
        <Card key={r.id} padding="md" className={styles.queueCard}>
          <div className={styles.queueWho}>
            <Avatar name={r.userName} size={36} />
            <div>
              <span className={styles.queueName}>{r.userName}</span>
              <span className={styles.queueMeta}>
                {leaveType[r.type]} · {r.days}d · {formatDayMonth(r.startDate)}–{formatDayMonth(r.endDate)}
              </span>
            </div>
          </div>
          <p className={styles.queueReason}>{r.reason}</p>
          <div className={styles.queueActions}>
            <Button size="sm" variant="secondary" onClick={() => setRejecting(r)}>
              <X size={15} /> Reject
            </Button>
            <Button size="sm" onClick={() => approve(r)}>
              <Check size={15} /> Approve
            </Button>
          </div>
        </Card>
      ))}

      <NoteModal
        open={!!rejecting}
        title="Reject leave"
        label="Reason (required)"
        placeholder="Why is this leave being rejected?"
        confirmLabel="Reject"
        danger
        onClose={() => setRejecting(null)}
        onConfirm={async (comment) => {
          if (rejecting) {
            try {
              await decide({ id: rejecting.id, status: 'rejected', comment }).unwrap()
              toast.success('Leave rejected.')
            } catch {
              toast.error('Could not reject.')
            }
          }
          setRejecting(null)
        }}
      />
    </div>
  )
}
